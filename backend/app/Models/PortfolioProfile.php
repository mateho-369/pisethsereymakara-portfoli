<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioProfile extends Model
{
    public $timestamps = false;
    protected $fillable = ['display_name', 'role_title', 'location', 'bio', 'quote', 'email', 'avatar_url', 'social_links'];
    protected function casts(): array { return ['social_links' => 'array']; }
}
