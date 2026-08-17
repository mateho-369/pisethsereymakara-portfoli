<?php

namespace App\Http\Controllers;

use App\Models\PortfolioProfile;
use App\Support\MediaStorage;
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
        $previousAvatar = $profile->avatar_url;

        $validated = $request->validate([
            'display_name' => ['sometimes', 'required', 'string', 'max:120'],
            'role_title' => ['sometimes', 'required', 'string', 'max:200'],
            'location' => ['sometimes', 'required', 'string', 'max:160'],
            'bio' => ['sometimes', 'required', 'string', 'max:3000'],
            'quote' => ['sometimes', 'required', 'string', 'max:1000'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'avatar_url' => ['sometimes', 'required', 'url', 'max:2000'],
            'social_links' => ['sometimes', 'array', 'max:12'],
            // Links may be a web address or a mailto:/tel: shortcut, so the
            // seeded "mailto:" entry stays editable instead of failing validation.
            'social_links.*' => ['string', 'max:2000', 'regex:/^(https?:\/\/|mailto:|tel:)/i'],
        ], [
            'social_links.*.regex' => 'Each link must start with https://, mailto: or tel:.',
        ]);

        $profile->update($validated);
        $fresh = $profile->fresh();

        // A replaced avatar that lives in our own storage is cleaned up.
        if (array_key_exists('avatar_url', $validated) && $previousAvatar !== $fresh->avatar_url && str_contains((string) $previousAvatar, '/media/')) {
            MediaStorage::delete($previousAvatar);
        }

        return response()->json($fresh);
    }
}
