<?php

namespace App\Providers;

use App\Support\ClientIp;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class RateLimitServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->trustConfiguredProxies();

        // Credential endpoints. Three buckets are registered and any one of
        // them tripping rejects the request: IP alone lets an attacker
        // targeting a single account rotate addresses, and email alone lets a
        // credential-stuffing run rotate accounts, so neither key is
        // sufficient by itself.
        RateLimiter::for('auth', function (Request $request) {
            $ip = ClientIp::for($request);
            $email = Str::lower(trim((string) $request->input('email')));
            $hash = $email !== '' ? sha1($email) : 'none';

            return [
                // One address may not walk a password list.
                Limit::perMinute(5)->by('auth:ip:'.$ip),
                // One address may not walk an *account* list either.
                Limit::perMinute(5)->by('auth:pair:'.$hash.'|'.$ip),
                // Distributed attempts against a single account. Deliberately
                // looser than the per-IP bucket: this key is reachable by
                // anyone who knows the address, so a tight limit here would
                // let a third party lock the owner out of their own login.
                Limit::perMinute(20)->by('auth:email:'.$hash),
            ];
        });

        // Campaign submissions: a logged-in account is required, so key on the
        // user. Falls back to IP for the rare unauthenticated edge.
        RateLimiter::for('campaign-respond', function (Request $request) {
            return [Limit::perMinute(10)->by('campaign:'.($request->user()?->id ?? ClientIp::for($request)))];
        });

        // Presigned upload minting — the step before bytes reach MinIO.
        RateLimiter::for('uploads', function (Request $request) {
            return [Limit::perMinute(20)->by('uploads:'.($request->user()?->id ?? ClientIp::for($request)))];
        });

        // General backstop so no endpoint is completely unbounded.
        RateLimiter::for('api', function (Request $request) {
            return [Limit::perMinute(120)->by('api:'.($request->user()?->id ?? ClientIp::for($request)))];
        });
    }

    /**
     * Configured here rather than in bootstrap/app.php: the withMiddleware
     * callback runs when the HTTP kernel is resolved, which is before the
     * configuration (and .env) has been loaded, so the value would be empty.
     */
    private function trustConfiguredProxies(): void
    {
        $proxies = trim((string) config('app.trusted_proxies'));

        if ($proxies === '') {
            return;
        }

        TrustProxies::at($proxies === '*' ? '*' : array_filter(array_map('trim', explode(',', $proxies))));
    }
}
