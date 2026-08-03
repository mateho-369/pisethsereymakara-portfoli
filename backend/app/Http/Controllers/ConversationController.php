<?php

namespace App\Http\Controllers;

use App\Models\PortfolioConversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_if($request->user()->isAdmin(), 403, 'Use the owner inbox endpoint.');
        return response()->json(PortfolioConversation::query()->where('visitor_id', (string) $request->user()->id)->orderByDesc('last_message_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_if($request->user()->isAdmin(), 403, 'Visitors begin conversations.');
        $conversation = PortfolioConversation::firstOrCreate(
            ['visitor_id' => (string) $request->user()->id],
            [
                'visitor_name' => $request->user()->name,
                'visitor_email' => $request->user()->email,
                'avatar_url' => $request->user()->avatar_url,
                'status' => 'open',
                'unread_count' => 0,
                'last_message_at' => now(),
            ]
        );
        return response()->json($conversation, $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json(PortfolioConversation::query()->orderByDesc('last_message_at')->get());
    }

    public function markRead(PortfolioConversation $conversation): JsonResponse
    {
        $conversation->update(['unread_count' => 0]);
        return response()->json($conversation->fresh());
    }
}
