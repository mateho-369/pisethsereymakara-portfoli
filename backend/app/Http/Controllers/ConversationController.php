<?php

namespace App\Http\Controllers;

use App\Models\PortfolioConversation;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_if($request->user()->isAdmin(), 403, 'Use the owner inbox endpoint.');

        return response()->json(
            PortfolioConversation::query()
                ->where('visitor_id', (string) $request->user()->id)
                ->orderByDesc('last_message_at')
                ->get()
        );
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

    /**
     * Owner inbox. Archived threads stay out of the way until asked for, so the
     * owner can tidy up without losing anything.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'open');

        return response()->json(
            PortfolioConversation::query()
                ->when($status !== 'all', fn ($query) => $query->where('status', $status))
                ->orderByDesc('last_message_at')
                ->get()
                ->map(fn (PortfolioConversation $conversation) => $conversation->withVisitorState())
        );
    }

    public function markRead(PortfolioConversation $conversation): JsonResponse
    {
        $conversation->update(['unread_count' => 0]);

        return response()->json($conversation->fresh()->withVisitorState());
    }

    /** Archive keeps the letters; restore brings the thread back to the inbox. */
    public function archive(PortfolioConversation $conversation): JsonResponse
    {
        $conversation->update(['status' => 'archived', 'unread_count' => 0]);

        return response()->json($conversation->fresh()->withVisitorState());
    }

    public function restore(PortfolioConversation $conversation): JsonResponse
    {
        $conversation->update(['status' => 'open']);

        return response()->json($conversation->fresh()->withVisitorState());
    }

    /** Permanently remove a thread, its letters and their stored attachments. */
    public function destroy(PortfolioConversation $conversation): Response
    {
        MediaStorage::deleteMany($conversation->messages()->pluck('attachment_url')->all());
        $conversation->messages()->delete();
        $conversation->delete();

        return response()->noContent();
    }
}
