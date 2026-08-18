<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignParticipantBlock;
use App\Models\CampaignResponse;
use App\Support\CampaignPhotoStorage;
use App\Support\UploadGuard;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The public side of /ask/{slug}.
 *
 * Everything here is validated server-side: the closed state rendered by the
 * UI is a courtesy, never the protection. Availability, campaign blocks and
 * one-response-per-account are all re-checked before a write is accepted.
 */
class CampaignController extends Controller
{
    public const REFERRAL_SOURCES = ['instagram', 'facebook', 'tiktok', 'telegram', 'friend', 'other', 'prefer_not_to_say'];

    /** Public campaign payload. Safe for signed-out visitors. */
    public function show(Request $request, string $slug): JsonResponse
    {
        $campaign = Campaign::query()->slug($slug)->with('options')->first();

        // Drafts must not confirm their own existence to the public, but the
        // owner may open the link to preview what they are about to share.
        abort_if(! $campaign, 404, 'This campaign is not available.');
        abort_if($campaign->status === 'draft' && ! $request->user()?->isAdmin(), 404, 'This campaign is not available.');

        return response()->json($this->publicPayload($campaign, $request));
    }

    /**
     * Accept a response. Requires a knowingly signed-in account; there is no
     * anonymous or fingerprinted path into this method.
     */
    public function respond(Request $request, string $slug): JsonResponse
    {
        $campaign = Campaign::query()->slug($slug)->with('options')->first();
        abort_if(! $campaign || $campaign->status === 'draft', 404, 'This campaign is not available.');

        $user = $request->user();

        // Server-side availability: dates and status, never trusting the UI.
        abort_unless($campaign->isAcceptingResponses(), 422, match ($campaign->availabilityState()) {
            'scheduled' => 'This campaign has not opened yet.',
            'ended' => 'This campaign has already ended.',
            default => 'This campaign is closed.',
        });

        // Campaign-specific blocking, independent of site-wide chat blocking.
        abort_if(
            CampaignParticipantBlock::blocks($user->id, $campaign->id),
            403,
            'You are not able to take part in campaigns.',
        );

        // The messages above explain *why*; this is the authoritative check.
        Gate::authorize('respond', $campaign);

        $existing = CampaignResponse::query()
            ->where('campaign_id', $campaign->id)
            ->where('user_id', $user->id)
            ->first();

        abort_if(
            $existing !== null && ! $campaign->allow_updates,
            422,
            'You have already responded to this campaign.',
        );

        $payload = $this->validateResponse($request, $campaign);

        // Replacing a photo removes the previous private object.
        if ($existing && $campaign->type === Campaign::TYPE_PHOTO && $existing->photo_key && ($payload['photo_key'] ?? null) !== $existing->photo_key) {
            CampaignPhotoStorage::delete($existing->photo_key);
        }

        try {
            $response = CampaignResponse::updateOrCreate(
                ['campaign_id' => $campaign->id, 'user_id' => $user->id],
                $payload + ['moderation_status' => $campaign->type === Campaign::TYPE_PHOTO ? 'pending' : 'approved'],
            );
        } catch (UniqueConstraintViolationException) {
            // Two submissions raced each other; the unique index settled it.
            abort(422, 'You have already responded to this campaign.');
        }

        // Re-read so a freshly cast vote is reflected in the tally we return.
        $campaign->load('options');
        $campaign->unsetRelation('responses');

        return response()->json([
            'campaign' => $this->publicPayload($campaign, $request),
            'response' => $this->ownResponse($response),
        ], $existing ? 200 : 201);
    }

    private function validateResponse(Request $request, Campaign $campaign): array
    {
        $shared = [
            // Self-declared and optional. This is asked, never inferred.
            'referral_source' => ['nullable', Rule::in(self::REFERRAL_SOURCES)],
            'declared_name' => ['nullable', 'string', 'max:80'],
        ];

        if ($campaign->type === Campaign::TYPE_POLL) {
            $validated = $request->validate($shared + [
                'poll_option_id' => ['required', 'integer', Rule::exists('campaign_poll_options', 'id')->where('campaign_id', $campaign->id)],
            ]);

            return [
                'poll_option_id' => $validated['poll_option_id'],
                'answer_text' => null,
                'photo_key' => null,
                'referral_source' => $validated['referral_source'] ?? null,
                'declared_name' => $this->cleanName($validated['declared_name'] ?? null),
            ];
        }

        if ($campaign->type === Campaign::TYPE_QUESTION) {
            $validated = $request->validate($shared + [
                'answer_text' => ['required', 'string', 'min:2', 'max:1000'],
            ]);

            return [
                'answer_text' => trim($validated['answer_text']),
                'poll_option_id' => null,
                'photo_key' => null,
                'referral_source' => $validated['referral_source'] ?? null,
                'declared_name' => $this->cleanName($validated['declared_name'] ?? null),
            ];
        }

        $validated = $request->validate($shared + [
            'photo_key' => ['required', 'string', 'max:500'],
            'photo_size_label' => ['nullable', 'string', 'max:30'],
            'answer_text' => ['nullable', 'string', 'max:500'],
        ]);

        // The key must belong to the private campaign prefix and to this user.
        if (! CampaignPhotoStorage::isCampaignKey($validated['photo_key'])
            || ! str_starts_with($validated['photo_key'], CampaignPhotoStorage::PREFIX.'/'.$request->user()->id.'/')) {
            throw ValidationException::withMessages(['photo_key' => 'That upload could not be verified. Please try again.']);
        }

        // The presigned PUT could not enforce a size cap, so read the real
        // object size back from storage and reject anything oversized.
        $bytes = UploadGuard::verify($validated['photo_key'], 'photo_key');

        return [
            'photo_key' => $validated['photo_key'],
            'photo_size_label' => UploadGuard::sizeLabel($bytes),
            'answer_text' => isset($validated['answer_text']) ? trim($validated['answer_text']) : null,
            'poll_option_id' => null,
            'referral_source' => $validated['referral_source'] ?? null,
            'declared_name' => $this->cleanName($validated['declared_name'] ?? null),
        ];
    }

    private function cleanName(?string $name): ?string
    {
        $name = trim((string) $name);

        return $name === '' ? null : $name;
    }

    /**
     * What a visitor is allowed to see. Poll questions and tallies can be
     * public; text answers and photos never are.
     */
    private function publicPayload(Campaign $campaign, Request $request): array
    {
        $user = $request->user();
        $state = $campaign->availabilityState();

        $mine = $user
            ? CampaignResponse::query()->where('campaign_id', $campaign->id)->where('user_id', $user->id)->first()
            : null;

        $payload = [
            'slug' => $campaign->slug,
            'type' => $campaign->type,
            'title' => $campaign->title,
            'prompt' => $campaign->prompt,
            'state' => $state,
            'is_open' => $campaign->isAcceptingResponses(),
            'start_date' => optional($campaign->start_date)->toIso8601String(),
            'end_date' => optional($campaign->end_date)->toIso8601String(),
            'allow_updates' => $campaign->allow_updates,
            'ask_referral' => $campaign->ask_referral,
            'referral_sources' => self::REFERRAL_SOURCES,
            'options' => $campaign->type === Campaign::TYPE_POLL
                ? $campaign->options->map(fn ($option) => ['id' => $option->id, 'label' => $option->label])->values()->all()
                : [],
            'my_response' => $mine ? $this->ownResponse($mine) : null,
            'is_blocked' => $user ? CampaignParticipantBlock::blocks($user->id, $campaign->id) : false,
            'results' => null,
            'response_count' => null,
        ];

        if ($campaign->type === Campaign::TYPE_POLL && $campaign->pollResultsVisibleTo($mine !== null)) {
            $payload['results'] = $this->tally($campaign);
        }

        // Only polls expose a participation count; answers and photos stay quiet.
        if ($campaign->type === Campaign::TYPE_POLL) {
            $payload['response_count'] = $campaign->responses()->count();
        }

        return $payload;
    }

    /** Vote counts and percentages, with no identities attached. */
    private function tally(Campaign $campaign): array
    {
        $counts = $campaign->responses()
            ->selectRaw('poll_option_id, COUNT(*) as total')
            ->whereNotNull('poll_option_id')
            ->groupBy('poll_option_id')
            ->pluck('total', 'poll_option_id');

        $total = (int) $counts->sum();

        return [
            'total' => $total,
            'options' => $campaign->options->map(function ($option) use ($counts, $total): array {
                $votes = (int) ($counts[$option->id] ?? 0);

                return [
                    'id' => $option->id,
                    'label' => $option->label,
                    'votes' => $votes,
                    'percent' => $total > 0 ? round($votes * 100 / $total, 1) : 0.0,
                ];
            })->values()->all(),
        ];
    }

    /** A participant only ever receives their own submission back. */
    private function ownResponse(CampaignResponse $response): array
    {
        return [
            'id' => $response->id,
            'poll_option_id' => $response->poll_option_id,
            'answer_text' => $response->answer_text,
            'photo_url' => CampaignPhotoStorage::temporaryUrl($response->photo_key),
            'moderation_status' => $response->moderation_status,
            'referral_source' => $response->referral_source,
            'declared_name' => $response->declared_name,
            'created_at' => optional($response->created_at)->toIso8601String(),
            'updated_at' => optional($response->updated_at)->toIso8601String(),
        ];
    }
}
