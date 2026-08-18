<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A shareable campaign behind /ask/{slug}.
 *
 * Campaigns are intentionally separate from the gallery: nothing a visitor
 * submits here reaches portfolio_media unless the owner deliberately
 * publishes it.
 */
class Campaign extends Model
{
    public const TYPE_POLL = 'poll';
    public const TYPE_QUESTION = 'question';
    public const TYPE_PHOTO = 'photo';

    public const TYPES = [self::TYPE_POLL, self::TYPE_QUESTION, self::TYPE_PHOTO];
    public const STATUSES = ['draft', 'active', 'closed'];
    public const RESULT_VISIBILITIES = ['after_vote', 'always', 'after_close'];

    protected $fillable = [
        'created_by', 'slug', 'type', 'title', 'prompt', 'status',
        'start_date', 'end_date', 'poll_results_visibility', 'allow_updates', 'ask_referral',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'allow_updates' => 'boolean',
            'ask_referral' => 'boolean',
        ];
    }

    public function options(): HasMany
    {
        return $this->hasMany(CampaignPollOption::class)->orderBy('sort_order')->orderBy('id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(CampaignResponse::class);
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(CampaignParticipantBlock::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeSlug(Builder $query, string $slug): Builder
    {
        return $query->where('slug', $slug);
    }

    /**
     * Short, URL-safe and unique. Prefers a readable stem from the title and
     * falls back to random characters, retrying until the database agrees.
     */
    public static function makeSlug(string $title): string
    {
        $stem = Str::of($title)->ascii()->lower()->slug('-')->limit(24, '')->value();
        $stem = trim($stem, '-');

        for ($attempt = 0; $attempt < 12; $attempt++) {
            $suffix = Str::lower(Str::random($attempt < 6 ? 4 : 8));
            $candidate = $stem === '' ? $suffix : $stem.'-'.$suffix;

            if (! static::query()->where('slug', $candidate)->exists()) {
                return $candidate;
            }
        }

        return (string) Str::uuid();
    }

    /** Draft and closed campaigns never accept responses. */
    public function isWithinWindow(): bool
    {
        $now = now();

        if ($this->start_date && $now->lt($this->start_date)) {
            return false;
        }

        if ($this->end_date && $now->gt($this->end_date)) {
            return false;
        }

        return true;
    }

    public function isAcceptingResponses(): bool
    {
        return $this->status === 'active' && $this->isWithinWindow();
    }

    /** Machine-readable reason the public page can render. */
    public function availabilityState(): string
    {
        if ($this->status === 'draft') {
            return 'draft';
        }

        if ($this->status === 'closed') {
            return 'closed';
        }

        if ($this->start_date && now()->lt($this->start_date)) {
            return 'scheduled';
        }

        if ($this->end_date && now()->gt($this->end_date)) {
            return 'ended';
        }

        return 'open';
    }

    /** Whether a visitor who has already voted may see the tally. */
    public function pollResultsVisibleTo(bool $hasVoted): bool
    {
        return match ($this->poll_results_visibility) {
            'always' => true,
            'after_close' => ! $this->isAcceptingResponses(),
            default => $hasVoted || ! $this->isAcceptingResponses(),
        };
    }
}
