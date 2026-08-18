<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Campaign-only blocking. Completely separate from users.blocked_at, which
 * remains the site-wide chat pause and is left untouched here.
 */
class CampaignParticipantBlock extends Model
{
    protected $fillable = ['user_id', 'campaign_id', 'reason', 'created_by'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /** Is this account barred from the given campaign (directly or globally)? */
    public static function blocks(int $userId, int $campaignId): bool
    {
        return static::query()
            ->where('user_id', $userId)
            ->where(fn ($query) => $query->whereNull('campaign_id')->orWhere('campaign_id', $campaignId))
            ->exists();
    }
}
