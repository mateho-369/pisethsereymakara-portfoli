<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Campaign photos live under the private `campaigns/` prefix.
 *
 * The gallery (`media/`) and chat (`chat/`) prefixes keep their existing
 * anonymous-download policy; `campaigns/` deliberately has none, so objects
 * there are only reachable through the short-lived signed URLs minted here.
 * Only the owner and the person who submitted the photo ever receive one.
 */
class CampaignPhotoStorage
{
    public const PREFIX = 'campaigns';

    /**
     * Account-free folder for guest submissions (question and photo
     * campaigns). Signed-in users keep their per-account folders; a user id
     * is numeric, so this segment can never collide with one of them.
     */
    public const GUEST = 'guest';

    /** A short-lived read URL for a stored object key. */
    public static function temporaryUrl(?string $key, int $minutes = 15): ?string
    {
        if (! $key) {
            return null;
        }

        try {
            return Storage::disk('minio_public')->temporaryUrl($key, now()->addMinutes($minutes));
        } catch (Throwable $error) {
            report($error);

            return null;
        }
    }

    /** Guard against keys pointing outside the private campaign prefix. */
    public static function isCampaignKey(string $key): bool
    {
        return str_starts_with($key, self::PREFIX.'/');
    }

    /**
     * Copy a campaign photo into the public `media/` prefix. Used only when the
     * owner explicitly publishes a submission to the gallery; the original
     * private object is left untouched.
     */
    public static function copyToPublicMedia(string $key): ?string
    {
        $extension = pathinfo($key, PATHINFO_EXTENSION);
        $extension = preg_match('/^[a-zA-Z0-9]{1,8}$/', (string) $extension) ? '.'.strtolower($extension) : '';
        $target = 'media/'.now()->format('Y/m').'/'.Str::uuid().$extension;

        try {
            Storage::disk('s3')->copy($key, $target);
        } catch (Throwable $error) {
            report($error);

            return null;
        }

        return rtrim((string) config('filesystems.disks.minio_public.url'), '/').'/'.$target;
    }

    public static function delete(?string $key): void
    {
        if (! $key) {
            return;
        }

        try {
            Storage::disk('s3')->delete($key);
        } catch (Throwable $error) {
            report($error);
        }
    }
}
