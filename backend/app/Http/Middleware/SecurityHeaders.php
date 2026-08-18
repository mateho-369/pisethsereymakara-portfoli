<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security response headers for API responses.
 *
 * The storage layer already sends some of these; Laravel's own responses did
 * not send any. These are deliberately conservative: this app serves JSON and
 * OAuth redirects, so nothing here needs to be framed or sniffed.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            // Never let a browser re-interpret a JSON body as HTML/JS.
            'X-Content-Type-Options' => 'nosniff',
            // No part of this API is meant to be embedded in a frame.
            'X-Frame-Options' => 'DENY',
            // Do not leak campaign slugs or reset tokens to third parties.
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            // API responses are not a browsing context; block plugin content.
            'X-Permitted-Cross-Domain-Policies' => 'none',
        ];

        foreach ($headers as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        // JSON responses should never be cached by a shared proxy: they are
        // per-account (own submissions, admin lists) behind a session cookie.
        if ($request->is('api/*') && ! $response->headers->has('Cache-Control')) {
            $response->headers->set('Cache-Control', 'no-store, private');
        }

        return $response;
    }
}
