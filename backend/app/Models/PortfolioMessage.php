<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioMessage extends Model
{
    public $timestamps = false;
    protected $fillable = ['conversation_id', 'sender_id', 'sender_role', 'body', 'attachment_url', 'created_at', 'deleted_at', 'deleted_by'];
    protected function casts(): array { return ['created_at' => 'datetime', 'deleted_at' => 'datetime']; }
    public function isRemoved(): bool { return $this->deleted_at !== null; }
    public function conversation(): BelongsTo { return $this->belongsTo(PortfolioConversation::class, 'conversation_id'); }
}
