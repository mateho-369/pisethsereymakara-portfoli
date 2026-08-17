<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/profile', [ProfileController::class, 'show']);
Route::get('/status', [SystemController::class, 'status']);
Route::get('/favorites', [FavoriteController::class, 'index']);
Route::get('/media', [MediaController::class, 'index']);
Route::get('/settings', [SettingController::class, 'index']);

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
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
        Route::post('/uploads/presign', [UploadController::class, 'chat']);
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
    Route::post('/uploads/presign', [UploadController::class, 'media']);

    Route::get('/conversations', [ConversationController::class, 'adminIndex']);
    Route::post('/conversations/{conversation}/read', [ConversationController::class, 'markRead']);
    Route::post('/conversations/{conversation}/archive', [ConversationController::class, 'archive']);
    Route::post('/conversations/{conversation}/restore', [ConversationController::class, 'restore']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users/{user}/block', [UserController::class, 'block']);
    Route::post('/users/{user}/unblock', [UserController::class, 'unblock']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
});
