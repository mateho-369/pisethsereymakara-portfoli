<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioMedia extends Model
{
    public $timestamps = false;
    protected $fillable = ['title', 'description', 'media_type', 'category', 'thumbnail_url', 'media_url', 'size_label', 'aspect_ratio', 'captured_at', 'is_favorite', 'is_public'];
    protected function casts(): array { return ['captured_at' => 'datetime', 'is_favorite' => 'boolean', 'is_public' => 'boolean']; }
}
