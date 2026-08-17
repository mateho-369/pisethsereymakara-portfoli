<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * One shared place for turning a public MinIO URL back into an object key and
 * removing it. Used by media deletion, media replacement and chat moderation so
 * storage never keeps orphaned files behind deleted rows.
 */
class MediaStorage
{
    public static function delete(?string $url): void
    {
        if (! $url) {
            return;
        }

        $path = self::keyFor($url);

        if ($path === '') {
            return;
        }

        try {
            Storage::disk('s3')->delete($path);
        } catch (Throwable $error) {
            report($error);
        }
    }

    /** Remove several URLs, ignoring duplicates and empty values. */
    public static function deleteMany(array $urls): void
    {
        foreach (array_unique(array_filter($urls)) as $url) {
            self::delete($url);
        }
    }

    public static function keyFor(string $url): string
    {
        $bucket = trim((string) config('filesystems.disks.s3.bucket'), '/');
        $path = ltrim((string) parse_url($url, PHP_URL_PATH), '/');

        if ($bucket !== '' && str_starts_with($path, $bucket.'/')) {
            $path = substr($path, strlen($bucket) + 1);
        }

        return $path;
    }
}
