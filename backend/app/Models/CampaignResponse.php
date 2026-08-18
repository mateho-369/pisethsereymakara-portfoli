<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignResponse extends Model
{
    protected $fillable = [
        'campaign_id', 'user_id', 'poll_option_id', 'answer_text',
        'photo_key', 'photo_size_label', 'moderation_status',
        'published_media_id', 'referral_source', 'declared_name',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(CampaignPollOption::class, 'poll_option_id');
    }
}
