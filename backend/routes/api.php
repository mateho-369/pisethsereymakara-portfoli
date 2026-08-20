<?php

use App\Http\Controllers\AdminCampaignController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SocialShareController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/profile', [ProfileController::class, 'show']);
Route::get('/status', [SystemController::class, 'status']);
Route::get('/favorites', [FavoriteController::class, 'index']);
Route::get('/media', [MediaController::class, 'index']);
Route::get('/settings', [SettingController::class, 'index']);

// Public campaign page. Readable signed-out.
Route::get('/campaigns/{slug}', [CampaignController::class, 'show']);

// Campaign participation: polls still require a login (the controller
// enforces it), while open questions and photo requests may also be answered
// by guests. Not gated by the site-wide chat pause, same as before.
Route::post('/campaigns/{slug}/respond', [CampaignController::class, 'respond'])->middleware('throttle:campaign-respond');
Route::post('/campaigns/uploads/presign', [UploadController::class, 'campaign'])->middleware('throttle:uploads');

// Social share cards for link previews. Crawlers fetch these with plain GET
// requests — no session, no auth — so they stay public.
Route::get('/og-image.png', [SocialShareController::class, 'siteOgImage']);
Route::get('/support/og-image.png', [SocialShareController::class, 'supportOgImage']);
Route::get('/campaigns/{slug}/og-image.png', [SocialShareController::class, 'campaignOgImage']);

Route::prefix('auth')->group(function (): void {
    // Brute-force / credential-stuffing / signup-spam guard: 5 per minute,
    // keyed by IP and by submitted email so neither can be rotated around.
    Route::middleware('throttle:auth')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    });
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);

    // Writing is paused for blocked visitors; reading stays open.
    Route::middleware('not-blocked')->group(function (): void {
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
        Route::post('/uploads/presign', [UploadController::class, 'chat'])->middleware('throttle:uploads');
    });
});

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function (): void {
    Route::put('/profile', [ProfileController::class, 'update']);

    Route::get('/settings', [SettingController::class, 'adminIndex']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::post('/settings/reset', [SettingController::class, 'reset']);

    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::put('/favorites/{favorite}', [FavoriteController::class, 'update']);
    Route::delete('/favorites/{favorite}', [FavoriteController::class, 'destroy']);
    Route::post('/favorites/reorder', [FavoriteController::class, 'reorder']);

    Route::get('/media', [MediaController::class, 'adminIndex']);
    Route::post('/media', [MediaController::class, 'store']);
    Route::put('/media/{media}', [MediaController::class, 'update']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy']);
    Route::post('/media/reorder', [MediaController::class, 'reorder']);
    Route::post('/uploads/presign', [UploadController::class, 'media'])->middleware('throttle:uploads');

    Route::get('/conversations', [ConversationController::class, 'adminIndex']);
    Route::post('/conversations/{conversation}/read', [ConversationController::class, 'markRead']);
    Route::post('/conversations/{conversation}/archive', [ConversationController::class, 'archive']);
    Route::post('/conversations/{conversation}/restore', [ConversationController::class, 'restore']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);

    Route::get('/campaigns', [AdminCampaignController::class, 'index']);
    Route::post('/campaigns', [AdminCampaignController::class, 'store']);
    Route::put('/campaigns/{campaign}', [AdminCampaignController::class, 'update']);
    Route::post('/campaigns/{campaign}/status', [AdminCampaignController::class, 'setStatus']);
    Route::delete('/campaigns/{campaign}', [AdminCampaignController::class, 'destroy']);
    Route::get('/campaigns/{campaign}/responses', [AdminCampaignController::class, 'responses']);
    Route::post('/campaign-responses/{response}/moderate', [AdminCampaignController::class, 'moderate']);
    Route::post('/campaign-responses/{response}/publish', [AdminCampaignController::class, 'publishToGallery']);
    Route::delete('/campaign-responses/{response}', [AdminCampaignController::class, 'destroyResponse']);
    Route::get('/campaign-blocks', [AdminCampaignController::class, 'blocks']);
    Route::post('/campaign-blocks', [AdminCampaignController::class, 'block']);
    Route::delete('/campaign-blocks/{block}', [AdminCampaignController::class, 'unblock']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users/{user}/block', [UserController::class, 'block']);
    Route::post('/users/{user}/unblock', [UserController::class, 'unblock']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
});
