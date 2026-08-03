<?php

namespace App\Http\Controllers;

use App\Models\PortfolioConversation;
use App\Models\PortfolioMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, PortfolioConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);
        return response()->json($conversation->messages()->orderBy('created_at')->get());
    }

    public function store(Request $request, PortfolioConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:attachment_url'],
            'attachment_url' => ['nullable', 'url', 'max:2000', 'required_without:body'],
        ]);
        $isAdmin = $request->user()->isAdmin();
        $message = PortfolioMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => (string) $request->user()->id,
            'sender_role' => $isAdmin ? 'admin' : 'visitor',
            'body' => trim($validated['body'] ?? ''),
            'attachment_url' => $validated['attachment_url'] ?? null,
            'created_at' => now(),
        ]);
        $conversation->update([
            'last_message_at' => now(),
            'unread_count' => $isAdmin ? 0 : $conversation->unread_count + 1,
        ]);
        return response()->json($message, 201);
    }

    private function authorizeConversation(Request $request, PortfolioConversation $conversation): void
    {
        abort_unless($request->user()->isAdmin() || $conversation->visitor_id === (string) $request->user()->id, 403, 'This conversation is private.');
    }
}
