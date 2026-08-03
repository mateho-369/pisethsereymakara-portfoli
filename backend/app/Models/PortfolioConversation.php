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
}
