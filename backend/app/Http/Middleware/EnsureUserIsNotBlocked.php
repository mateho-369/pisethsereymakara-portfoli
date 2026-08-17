<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocked visitors keep full read access to the portfolio — only the writing
 * side of the chat is paused. Applied to conversation/message/upload writes.
 */
class EnsureUserIsNotBlocked
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if ($user && $user->isBlocked()) {
            return response()->json([
                'error' => 'Messaging is paused for this account.',
                'blocked' => true,
                'blocked_reason' => $user->blocked_reason,
            ], 403);
        }

        return $next($request);
    }
}
