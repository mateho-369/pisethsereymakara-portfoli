<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        try {
            $googleUser = Socialite::driver('google')->user();
            $user = User::where('email', strtolower($googleUser->getEmail()))->first();

            if (! $user) {
                $user = User::create([
                    'name' => $googleUser->getName() ?: 'New friend',
                    'email' => strtolower($googleUser->getEmail()),
                    'password' => Str::password(32),
                    'role' => 'visitor',
                    'google_id' => $googleUser->getId(),
                    'avatar_url' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);
            } else {
                $user->update(['google_id' => $googleUser->getId(), 'avatar_url' => $googleUser->getAvatar()]);
            }

            Auth::login($user, true);
            request()->session()->regenerate();
            return redirect()->away($frontend.'/chat');
        } catch (Throwable $error) {
            report($error);
            return redirect()->away($frontend.'/login?google_error=1');
        }
    }
}
