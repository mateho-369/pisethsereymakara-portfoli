<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PortfolioConversation extends Model
{
    public $timestamps = false;
    protected $fillable = ['visitor_id', 'visitor_name', 'visitor_email', 'avatar_url', 'status', 'unread_count', 'last_message_at'];
    protected function casts(): array { return ['last_message_at' => 'datetime', 'unread_count' => 'integer']; }
    public function messages(): HasMany { return $this->hasMany(PortfolioMessage::class, 'conversation_id'); }

    /** The visitor account behind this thread, when it still exists. */
    public function visitor(): ?User
    {
        return is_numeric($this->visitor_id) ? User::query()->find((int) $this->visitor_id) : null;
    }

    /** Inbox payload: the thread plus whether its visitor is currently paused. */
    public function withVisitorState(): array
    {
        $visitor = $this->visitor();

        return $this->toArray() + [
            'visitor_user_id' => $visitor?->id,
            'visitor_blocked' => (bool) $visitor?->isBlocked(),
            'visitor_blocked_reason' => $visitor?->blocked_reason,
        ];
    }
}
