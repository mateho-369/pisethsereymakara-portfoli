<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioFavorite extends Model
{
    public $timestamps = false;
    protected $fillable = ['title', 'description', 'icon', 'sort_order'];
}
