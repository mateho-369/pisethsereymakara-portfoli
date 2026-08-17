<?php

namespace App\Http\Controllers;

use App\Models\PortfolioMedia;
use App\Support\MediaStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PortfolioMedia::query()->where('is_public', true);

        return response()->json($this->ordered($this->filters($query, $request))->get());
    }

    public function adminIndex(Request $request): JsonResponse
    {
        return response()->json($this->ordered($this->filters(PortfolioMedia::query(), $request))->get());
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
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]));

        return response()->json($media, 201);
    }

    /**
     * Full edit, including swapping in a freshly uploaded file. When the file
     * changes the previous object is removed from storage so nothing is orphaned.
     */
    public function update(Request $request, PortfolioMedia $media): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'media_type' => ['sometimes', 'required', 'in:photo,video'],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'thumbnail_url' => ['sometimes', 'required', 'url', 'max:2000'],
            'media_url' => ['sometimes', 'required', 'url', 'max:2000'],
            'size_label' => ['sometimes', 'required', 'string', 'max:30'],
            'aspect_ratio' => ['sometimes', 'required', 'in:portrait,landscape,square'],
            'captured_at' => ['sometimes', 'required', 'date'],
            'is_favorite' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $replaced = array_filter([
            array_key_exists('media_url', $validated) && $validated['media_url'] !== $media->media_url ? $media->media_url : null,
            array_key_exists('thumbnail_url', $validated) && $validated['thumbnail_url'] !== $media->thumbnail_url ? $media->thumbnail_url : null,
        ]);

        $media->update($validated);

        // Never delete an object that is still referenced by the updated row.
        $fresh = $media->fresh();
        MediaStorage::deleteMany(array_diff($replaced, [$fresh->media_url, $fresh->thumbnail_url]));

        return response()->json($fresh);
    }

    /** Persist the owner's drag-and-drop ordering for the gallery. */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'min:1'],
        ]);

        foreach (array_values($validated['order']) as $index => $id) {
            PortfolioMedia::query()->whereKey($id)->update(['sort_order' => $index + 1]);
        }

        return $this->adminIndex($request);
    }

    public function destroy(PortfolioMedia $media): Response
    {
        MediaStorage::deleteMany([$media->media_url, $media->thumbnail_url]);
        $media->delete();

        return response()->noContent();
    }

    private function filters(Builder $query, Request $request): Builder
    {
        if ($request->filled('type')) $query->where('media_type', $request->string('type'));
        if ($request->filled('category')) $query->where('category', $request->string('category'));
        if ($request->boolean('favorites')) $query->where('is_favorite', true);
        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(fn (Builder $inner) => $inner->where('title', 'like', "%{$search}%")->orWhere('category', 'like', "%{$search}%"));
        }

        return $query;
    }

    /** Manual order first (0 = unsorted), newest capture date after that. */
    private function ordered(Builder $query): Builder
    {
        return $query->orderByRaw('CASE WHEN sort_order = 0 THEN 1 ELSE 0 END')
            ->orderBy('sort_order')
            ->orderByDesc('captured_at');
    }
}
