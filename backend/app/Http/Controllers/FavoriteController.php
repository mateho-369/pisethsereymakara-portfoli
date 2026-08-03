<?php

namespace App\Http\Controllers;

use App\Models\PortfolioFavorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FavoriteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(PortfolioFavorite::query()->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $favorite = PortfolioFavorite::create($this->validated($request));
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

    private function validated(Request $request, bool $sometimes = false): array
    {
        $required = $sometimes ? ['sometimes', 'required'] : ['required'];
        return $request->validate([
            'title' => [...$required, 'string', 'max:100'],
            'description' => [...$required, 'string', 'max:500'],
            'icon' => [...$required, 'string', 'max:40'],
            'sort_order' => [...$required, 'integer', 'min:0'],
        ]);
    }
}
