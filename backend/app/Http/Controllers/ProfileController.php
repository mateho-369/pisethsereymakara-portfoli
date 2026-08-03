<?php

namespace App\Http\Controllers;

use App\Models\PortfolioProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(PortfolioProfile::query()->orderBy('id')->firstOrFail());
    }

    public function update(Request $request): JsonResponse
    {
        $profile = PortfolioProfile::query()->orderBy('id')->firstOrFail();
        $profile->update($request->validate([
            'display_name' => ['sometimes', 'required', 'string', 'max:120'],
            'role_title' => ['sometimes', 'required', 'string', 'max:200'],
            'location' => ['sometimes', 'required', 'string', 'max:160'],
            'bio' => ['sometimes', 'required', 'string', 'max:3000'],
            'quote' => ['sometimes', 'required', 'string', 'max:1000'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'avatar_url' => ['sometimes', 'required', 'url', 'max:2000'],
            'social_links' => ['sometimes', 'required', 'array'],
            'social_links.*' => ['url', 'max:2000'],
        ]));
        return response()->json($profile->fresh());
    }
}
