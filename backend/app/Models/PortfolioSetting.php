<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioSetting extends Model
{
    public $timestamps = false;

    protected $fillable = ['key', 'value', 'group', 'type', 'label', 'hint', 'sort_order'];

    /** Every setting as a flat key => value map, ready for the public site. */
    public static function map(): array
    {
        return static::query()->orderBy('sort_order')->pluck('value', 'key')->all();
    }
}
