<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignPollOption extends Model
{
    protected $fillable = ['campaign_id', 'label', 'sort_order'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(CampaignResponse::class, 'poll_option_id');
    }
}
