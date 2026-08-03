<?php

namespace App\Http\Controllers;

use App\Models\PortfolioMedia;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PortfolioMedia::query()->where('is_public', true);
        return response()->json($this->filters($query, $request)->orderByDesc('captured_at')->get());
    }

    public function adminIndex(Request $request): JsonResponse
    {
        return response()->json($this->filters(PortfolioMedia::query(), $request)->orderByDesc('captured_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $media = PortfolioMedia::create($request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'media_type' => ['required', 'in:photo,video'],
            'category' => ['required', 'string', 'max:80'],
            'thumbnail_url' => ['required', 'url', 'max:2000'],
            'media_url' => ['required', 'url', 'max:2000'],
            'size_label' => ['required', 'string', 'max:30'],
            'aspect_ratio' => ['required', 'in:portrait,landscape,square'],
            'captured_at' => ['required', 'date'],
            'is_favorite' => ['required', 'boolean'],
            'is_public' => ['required', 'boolean'],
        ]));
        return response()->json($media, 201);
    }

    public function update(Request $request, PortfolioMedia $media): JsonResponse
    {
        $media->update($request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'is_favorite' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
        ]));
        return response()->json($media->fresh());
    }

    public function destroy(PortfolioMedia $media): Response
    {
        $this->deleteObject($media->media_url);
        if ($media->thumbnail_url !== $media->media_url) $this->deleteObject($media->thumbnail_url);
        $media->delete();
        return response()->noContent();
    }

    private function filters(Builder $query, Request $request): Builder
    {
        if ($request->filled('type')) $query->where('media_type', $request->string('type'));
        if ($request->filled('category')) $query->where('category', $request->string('category'));
        if ($request->boolean('favorites')) $query->where('is_favorite', true);
        return $query;
    }

    private function deleteObject(string $url): void
    {
        $bucket = trim((string) config('filesystems.disks.s3.bucket'), '/');
        $path = ltrim((string) parse_url($url, PHP_URL_PATH), '/');
        if (str_starts_with($path, $bucket.'/')) $path = substr($path, strlen($bucket) + 1);
        if ($path !== '') Storage::disk('s3')->delete($path);
    }
}
