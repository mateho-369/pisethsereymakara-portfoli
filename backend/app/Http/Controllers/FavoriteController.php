<?php

namespace App\Http\Controllers;

use App\Models\PortfolioFavorite;
use App\Support\IconLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class FavoriteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(PortfolioFavorite::query()->orderBy('sort_order')->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['sort_order'] ??= (int) PortfolioFavorite::query()->max('sort_order') + 1;
        $favorite = PortfolioFavorite::create($data);

        return response()->json($favorite, 201);
    }

    public function update(Request $request, PortfolioFavorite $favorite): JsonResponse
    {
        $favorite->update($this->validated($request, true));

        return response()->json($favorite->fresh());
    }

    public function destroy(PortfolioFavorite $favorite): Response
    {
        $favorite->delete();

        return response()->noContent();
    }

    /** Persist the owner's ordering of the "things I love" cards. */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'min:1'],
        ]);

        foreach (array_values($validated['order']) as $index => $id) {
            PortfolioFavorite::query()->whereKey($id)->update(['sort_order' => $index + 1]);
        }

        return $this->index();
    }

    private function validated(Request $request, bool $sometimes = false): array
    {
        $required = $sometimes ? ['sometimes', 'required'] : ['required'];

        return $request->validate([
            'title' => [...$required, 'string', 'max:100'],
            'description' => [...$required, 'string', 'max:500'],
            // Only icons the site can render are accepted.
            'icon' => [...$required, 'string', 'max:40', Rule::in(IconLibrary::FAVORITES)],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);
    }
}
