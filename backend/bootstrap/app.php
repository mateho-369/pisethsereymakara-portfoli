<?php

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsNotBlocked;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        // Baseline security headers on every response, web and API.
        $middleware->append(SecurityHeaders::class);

        // Every /api route gets the general limiter; auth and upload routes
        // add a stricter named limiter on top in routes/api.php.
        $middleware->api(append: ['throttle:api']);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'not-blocked' => EnsureUserIsNotBlocked::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Laravel's JSON exception renderer handles API responses.
    })->create();
