<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        // Remember where the visitor came from (e.g. /ask/{slug}) so they land
        // back on the campaign instead of the inbox.
        $request->session()->put('oauth_return_to', $this->safeReturnPath($request->query('return_to')));

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $returnTo = $request->session()->pull('oauth_return_to') ?: '/chat';

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
            $request->session()->regenerate();

            return redirect()->away($frontend.$returnTo);
        } catch (Throwable $error) {
            report($error);

            return redirect()->away($frontend.'/login?google_error=1');
        }
    }

    /**
     * Only ever return to a path on this site. Never an absolute URL, never a
     * protocol-relative one — that would make this an open redirect.
     */
    private function safeReturnPath(mixed $value): string
    {
        $path = is_string($value) ? trim($value) : '';

        if ($path === '' || ! str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return '/chat';
        }

        return preg_match('#^/[A-Za-z0-9\-._~/?&=%]*$#', $path) ? $path : '/chat';
    }
}
