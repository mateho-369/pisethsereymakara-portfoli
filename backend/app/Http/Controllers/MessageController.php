<?php

namespace App\Http\Controllers;

use App\Models\PortfolioConversation;
use App\Models\PortfolioMessage;
use App\Support\MediaStorage;
use App\Support\UploadGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, PortfolioConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        return response()->json(
            $conversation->messages()
                ->orderBy('created_at')
                ->get()
                ->map(fn (PortfolioMessage $message) => $this->present($message))
        );
    }

    public function store(Request $request, PortfolioConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:attachment_url'],
            'attachment_url' => ['nullable', 'url', 'max:2000', 'required_without:body'],
        ]);
        // Chat attachments go through the same presigned PUT, so the claimed
        // size is equally untrustworthy; confirm it against storage.
        UploadGuard::verifyUrl($validated['attachment_url'] ?? null, 'attachment_url');

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
            'status' => $isAdmin ? $conversation->status : 'open',
        ]);

        return response()->json($this->present($message), 201);
    }

    /**
     * Owner moderation: the letter stays in place as a quiet placeholder, while
     * its text and any stored attachment are removed for good.
     */
    public function destroy(PortfolioMessage $message): JsonResponse
    {
        if (! $message->isRemoved()) {
            MediaStorage::delete($message->attachment_url);
            $message->update([
                'body' => '',
                'attachment_url' => null,
                'deleted_at' => now(),
                'deleted_by' => 'admin',
            ]);
        }

        return response()->json($this->present($message->fresh()));
    }

    /** Removed letters never leak their old contents to the client. */
    private function present(PortfolioMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'sender_role' => $message->sender_role,
            'body' => $message->isRemoved() ? '' : $message->body,
            'attachment_url' => $message->isRemoved() ? null : $message->attachment_url,
            'created_at' => optional($message->created_at)->toIso8601String(),
            'deleted_at' => optional($message->deleted_at)->toIso8601String(),
        ];
    }

    private function authorizeConversation(Request $request, PortfolioConversation $conversation): void
    {
        abort_unless($request->user()->isAdmin() || $conversation->visitor_id === (string) $request->user()->id, 403, 'This conversation is private.');
    }
}
