<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function media(Request $request): JsonResponse
    {
        return $this->presign($request, 'media');
    }

    public function chat(Request $request): JsonResponse
    {
        return $this->presign($request, 'chat/'.$request->user()->id);
    }

    private function presign(Request $request, string $folder): JsonResponse
    {
        $validated = $request->validate([
            'file_name' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'max:100'],
            'size' => ['required', 'integer', 'min:1', 'max:4194304'],
        ]);

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain'];
        abort_unless(in_array($validated['content_type'], $allowed, true), 422, 'Unsupported file type.');

        $extension = strtolower(pathinfo($validated['file_name'], PATHINFO_EXTENSION));
        $extension = preg_match('/^[a-z0-9]{1,8}$/', $extension) ? '.'.$extension : '';
        $key = $folder.'/'.now()->format('Y/m').'/'.Str::uuid().$extension;
        $signed = Storage::disk('minio_public')->temporaryUploadUrl($key, now()->addMinutes(10), ['ContentType' => $validated['content_type']]);
        $publicUrl = rtrim((string) config('filesystems.disks.minio_public.url'), '/').'/'.$key;

        return response()->json([
            'upload_url' => $signed['url'],
            'headers' => $signed['headers'] ?? ['Content-Type' => $validated['content_type']],
            'key' => $key,
            'public_url' => $publicUrl,
        ]);
    }
}
