<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response|JsonResponse
    {
        if (! $request->user() || $request->user()->role !== $role) {
            return response()->json(['error' => 'Owner access required.'], 403);
        }

        return $next($request);
    }
}
