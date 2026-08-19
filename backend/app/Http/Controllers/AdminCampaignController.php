<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Models\Campaign;
use App\Models\CampaignParticipantBlock;
use App\Models\CampaignResponse;
use App\Models\PortfolioMedia;
use App\Support\CampaignPhotoStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Owner-side campaign management, mounted under /api/admin. */
class AdminCampaignController extends Controller implements HasMiddleware
{
    /**
     * Every action here is owner-only. The route group already applies
     * `role:admin`; running the policy as well means the rule lives in one
     * place even if these actions are ever mounted somewhere else.
     */
    public static function middleware(): array
    {
        return [new Middleware('can:manage,'.Campaign::class)];
    }

    public function index(): JsonResponse
    {
        $campaigns = Campaign::query()
            ->with('options')
            ->withCount(['responses', 'blocks'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($campaigns->map(fn (Campaign $campaign) => $this->summary($campaign))->all());
    }

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $campaign = DB::transaction(function () use ($validated, $request): Campaign {
            $campaign = Campaign::create([
                'created_by' => $request->user()->id,
                'slug' => $validated['slug'] ?? Campaign::makeSlug($validated['title']),
                'type' => $validated['type'],
                'title' => $validated['title'],
                'prompt' => $validated['prompt'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'poll_results_visibility' => $validated['poll_results_visibility'] ?? 'after_vote',
                'allow_updates' => $validated['allow_updates'] ?? false,
                'ask_referral' => $validated['ask_referral'] ?? true,
            ]);

            if ($campaign->type === Campaign::TYPE_POLL) {
                foreach (array_values(array_filter(array_map('trim', $validated['options'] ?? []))) as $index => $label) {
                    $campaign->options()->create(['label' => $label, 'sort_order' => $index + 1]);
                }
            }

            return $campaign;
        });

        return response()->json($this->summary($this->reload($campaign)), 201);
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $campaign): void {
            $campaign->update(array_intersect_key($validated, array_flip([
                'title', 'prompt', 'status', 'slug', 'start_date', 'end_date',
                'poll_results_visibility', 'allow_updates', 'ask_referral',
            ])));

            if ($campaign->type !== Campaign::TYPE_POLL || ! array_key_exists('options', $validated)) {
                return;
            }

            $keep = [];

            foreach (array_values($validated['options']) as $index => $option) {
                $label = trim((string) ($option['label'] ?? ''));

                if ($label === '') {
                    continue;
                }

                $existing = isset($option['id'])
                    ? $campaign->options()->whereKey($option['id'])->first()
                    : null;

                if ($existing) {
                    // Editing a label keeps the option id, so existing votes survive.
                    $existing->update(['label' => $label, 'sort_order' => $index + 1]);
                    $keep[] = $existing->id;
                    continue;
                }

                $keep[] = $campaign->options()->create(['label' => $label, 'sort_order' => $index + 1])->id;
            }

            // Removing an option nulls the votes that pointed at it (nullOnDelete).
            $campaign->options()->whereNotIn('id', $keep ?: [0])->delete();
        });

        return response()->json($this->summary($this->reload($campaign)));
    }

    /** Quick open/close toggle for the campaign list. */
    public function setStatus(Request $request, Campaign $campaign): JsonResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(Campaign::STATUSES)]]);
        $campaign->update(['status' => $validated['status']]);

        return response()->json($this->summary($this->reload($campaign)));
    }

    public function destroy(Campaign $campaign): Response
    {
        // Remove private photo objects before the rows cascade away.
        $keys = $campaign->responses()->whereNotNull('photo_key')->pluck('photo_key');

        foreach ($keys as $key) {
            CampaignPhotoStorage::delete($key);
        }

        $campaign->delete();

        return response()->noContent();
    }

    /**
     * Every response for one campaign. Signed-in responses carry the identity
     * from their login; guest responses are anonymous — shown as "Guest" with
     * no email or avatar, and not blockable (blocks are keyed on accounts).
     */
    public function responses(Campaign $campaign): JsonResponse
    {
        $campaign->load('options');

        $responses = $campaign->responses()
            ->with('user:id,name,email,avatar_url,blocked_at')
            ->orderByDesc('created_at')
            ->get();

        $blockedUserIds = CampaignParticipantBlock::query()
            ->whereNull('campaign_id')
            ->orWhere('campaign_id', $campaign->id)
            ->pluck('user_id')
            ->unique()
            ->all();

        return response()->json([
            'campaign' => $this->summary($campaign),
            'tally' => $campaign->type === Campaign::TYPE_POLL ? $this->tally($campaign) : null,
            'responses' => $responses->map(fn (CampaignResponse $response) => [
                'id' => $response->id,
                'user_id' => $response->user_id,
                'is_guest' => $response->user_id === null,
                // Name and avatar come from the account they deliberately used;
                // a guest has no account at all, so nothing is attached.
                'name' => $response->user_id === null ? 'Guest' : ($response->user?->name ?? 'Removed account'),
                'email' => $response->user?->email,
                'avatar_url' => $response->user?->avatar_url,
                'poll_option_id' => $response->poll_option_id,
                'poll_option_label' => $campaign->options->firstWhere('id', $response->poll_option_id)?->label,
                'answer_text' => $response->answer_text,
                'photo_url' => CampaignPhotoStorage::temporaryUrl($response->photo_key, 60),
                'photo_size_label' => $response->photo_size_label,
                'moderation_status' => $response->moderation_status,
                'published_media_id' => $response->published_media_id,
                'referral_source' => $response->referral_source,
                'declared_name' => $response->declared_name,
                'site_blocked' => $response->user?->blocked_at !== null,
                'campaign_blocked' => $response->user_id !== null && in_array($response->user_id, $blockedUserIds, true),
                'created_at' => optional($response->created_at)->toIso8601String(),
            ])->all(),
        ]);
    }

    /** Approve or reject a submitted photo. Neither action publishes it. */
    public function moderate(Request $request, CampaignResponse $response): JsonResponse
    {
        $validated = $request->validate([
            'moderation_status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $response->update(['moderation_status' => $validated['moderation_status']]);

        return response()->json([
            'id' => $response->id,
            'moderation_status' => $response->moderation_status,
            'published_media_id' => $response->published_media_id,
        ]);
    }

    /**
     * Copy an approved photo into the public gallery. This only ever happens
     * because the owner pressed the button — approval alone never publishes.
     */
    public function publishToGallery(Request $request, CampaignResponse $response): JsonResponse
    {
        abort_unless($response->photo_key, 422, 'This response has no photo to publish.');
        abort_unless($response->moderation_status === 'approved', 422, 'Approve the photo before publishing it.');
        abort_if($response->published_media_id !== null, 422, 'This photo is already in the gallery.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:80'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        $publicUrl = CampaignPhotoStorage::copyToPublicMedia($response->photo_key);
        abort_unless($publicUrl, 500, 'The photo could not be copied into the gallery.');

        $media = PortfolioMedia::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? '',
            'media_type' => 'photo',
            'category' => $validated['category'] ?: 'Campaigns',
            'thumbnail_url' => $publicUrl,
            'media_url' => $publicUrl,
            'size_label' => $response->photo_size_label ?: '—',
            'aspect_ratio' => 'landscape',
            'captured_at' => $response->created_at ?? now(),
            'is_favorite' => false,
            'is_public' => $validated['is_public'] ?? true,
        ]);

        $response->update(['published_media_id' => $media->id]);

        return response()->json(['id' => $response->id, 'published_media_id' => $media->id, 'media' => $media]);
    }

    public function destroyResponse(CampaignResponse $response): Response
    {
        CampaignPhotoStorage::delete($response->photo_key);
        $response->delete();

        return response()->noContent();
    }

    /** Campaign blocks: separate table, site-wide chat blocking untouched. */
    public function blocks(): JsonResponse
    {
        $blocks = CampaignParticipantBlock::query()
            ->with(['user:id,name,email,avatar_url', 'campaign:id,title,slug'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($blocks->map(fn (CampaignParticipantBlock $block) => [
            'id' => $block->id,
            'user_id' => $block->user_id,
            'name' => $block->user?->name ?? 'Removed account',
            'email' => $block->user?->email,
            'avatar_url' => $block->user?->avatar_url,
            'campaign_id' => $block->campaign_id,
            'campaign_title' => $block->campaign?->title,
            'reason' => $block->reason,
            'created_at' => optional($block->created_at)->toIso8601String(),
        ])->all());
    }

    public function block(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        abort_if($validated['user_id'] === $request->user()->id, 422, 'You cannot block your own account.');

        $block = CampaignParticipantBlock::updateOrCreate(
            ['user_id' => $validated['user_id'], 'campaign_id' => $validated['campaign_id'] ?? null],
            ['reason' => $validated['reason'] ?? null, 'created_by' => $request->user()->id],
        );

        return response()->json(['id' => $block->id, 'user_id' => $block->user_id, 'campaign_id' => $block->campaign_id], 201);
    }

    public function unblock(CampaignParticipantBlock $block): Response
    {
        $block->delete();

        return response()->noContent();
    }

    private function reload(Campaign $campaign): Campaign
    {
        return Campaign::query()->with('options')->withCount(['responses', 'blocks'])->findOrFail($campaign->id);
    }

    private function summary(Campaign $campaign): array
    {
        return [
            'id' => $campaign->id,
            'slug' => $campaign->slug,
            'type' => $campaign->type,
            'title' => $campaign->title,
            'prompt' => $campaign->prompt,
            'status' => $campaign->status,
            'state' => $campaign->availabilityState(),
            'is_open' => $campaign->isAcceptingResponses(),
            'start_date' => optional($campaign->start_date)->toIso8601String(),
            'end_date' => optional($campaign->end_date)->toIso8601String(),
            'poll_results_visibility' => $campaign->poll_results_visibility,
            'allow_updates' => $campaign->allow_updates,
            'ask_referral' => $campaign->ask_referral,
            'response_count' => $campaign->responses_count ?? $campaign->responses()->count(),
            'pending_photo_count' => $campaign->type === Campaign::TYPE_PHOTO
                ? $campaign->responses()->where('moderation_status', 'pending')->count()
                : 0,
            'options' => $campaign->options->map(fn ($option) => [
                'id' => $option->id,
                'label' => $option->label,
                'sort_order' => $option->sort_order,
            ])->values()->all(),
            'created_at' => optional($campaign->created_at)->toIso8601String(),
        ];
    }

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
}
