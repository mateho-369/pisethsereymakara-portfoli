<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Verifies the *actual* size of an object after it has been PUT to MinIO.
 *
 * The `size` field sent to the presign endpoint is only a client claim. A
 * presigned PUT URL cannot carry a content-length-range condition the way a
 * presigned POST policy can, so nothing stops someone from requesting a URL
 * for "12 KB" and then streaming gigabytes to it.
 *
 * The fix is to read the object's real size back from storage before we accept
 * the record that references it, and to delete anything oversized so the bytes
 * do not linger. This is the authoritative limit; the frontend check and the
 * `max:` validation rule are just fast feedback.
 */
class UploadGuard
{
    public const MAX_BYTES = 4 * 1024 * 1024;

    /**
     * Confirm a freshly uploaded object exists and is within the limit.
     * Deletes the object and throws a validation error when it is not.
     *
     * @param  string  $field  The request field to attach any error to.
     */
    public static function verify(string $key, string $field = 'file'): int
    {
        $disk = Storage::disk('s3');

        try {
            $exists = $disk->exists($key);
        } catch (Throwable $error) {
            report($error);

            throw ValidationException::withMessages([
                $field => 'We could not verify that upload. Please try again.',
            ]);
        }

        if (! $exists) {
            throw ValidationException::withMessages([
                $field => 'That upload could not be found. Please try again.',
            ]);
        }

        try {
            $size = (int) $disk->size($key);
        } catch (Throwable $error) {
            report($error);

            // Unverifiable size is treated as a failure, not as a pass.
            self::discard($key);

            throw ValidationException::withMessages([
                $field => 'We could not verify that upload. Please try again.',
            ]);
        }

        if ($size > self::MAX_BYTES) {
            self::discard($key);

            throw ValidationException::withMessages([
                $field => 'That file is larger than the 4 MB limit.',
            ]);
        }

        return $size;
    }

    /**
     * Same check, for a stored public URL rather than a raw object key.
     * Returns the verified size.
     */
    public static function verifyUrl(?string $url, string $field = 'file'): ?int
    {
        if (! $url) {
            return null;
        }

        $key = MediaStorage::keyFor($url);

        if ($key === '') {
            throw ValidationException::withMessages([
                $field => 'That upload could not be verified. Please try again.',
            ]);
        }

        return self::verify($key, $field);
    }

    /** Human-readable size, derived from the verified byte count. */
    public static function sizeLabel(?int $bytes): ?string
    {
        if ($bytes === null) {
            return null;
        }

        return $bytes > 1048576
            ? round($bytes / 1048576, 1).' MB'
            : max(1, (int) ceil($bytes / 1024)).' KB';
    }

    private static function discard(string $key): void
    {
        try {
            Storage::disk('s3')->delete($key);
        } catch (Throwable $error) {
            report($error);
        }
    }
}
