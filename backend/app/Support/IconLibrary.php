<?php

namespace App\Support;

/**
 * The icons the site can actually render. Kept in step with
 * `src/lib/icons.ts` so the admin can never save an icon the public page
 * would silently fall back on.
 */
class IconLibrary
{
    public const FAVORITES = [
        'leaf', 'camera', 'coffee', 'code', 'compass', 'mountain', 'music', 'book',
        'heart', 'sun', 'sunrise', 'moon', 'cloud', 'feather', 'flower', 'map',
        'pen', 'star', 'sparkles', 'bike', 'plane', 'globe', 'waves', 'trees',
    ];

    public const SOCIAL = [
        'github', 'instagram', 'email', 'linkedin', 'twitter', 'facebook',
        'youtube', 'telegram', 'dribbble', 'website',
    ];
}
