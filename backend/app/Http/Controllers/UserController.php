<?php

namespace App\Http\Controllers;

use App\Models\PortfolioConversation;
use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserController extends Controller
{
    /** Everyone who ever signed up, with their conversation at a glance. */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderByDesc('created_at')
            ->get();

        $conversations = PortfolioConversation::query()
            ->whereIn('visitor_id', $users->pluck('id')->map(fn ($id) => (string) $id))
            ->get()
            ->keyBy('visitor_id');

        return response()->json($users->map(function (User $user) use ($conversations): array {
            $conversation = $conversations->get((string) $user->id);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url,
                'is_google' => $user->google_id !== null,
                'blocked_at' => optional($user->blocked_at)->toIso8601String(),
                'blocked_reason' => $user->blocked_reason,
                'created_at' => optional($user->created_at)->toIso8601String(),
                'conversation_id' => $conversation?->id,
                'message_count' => $conversation ? $conversation->messages()->count() : 0,
                'last_message_at' => optional($conversation?->last_message_at)->toIso8601String(),
            ];
        })->all());
    }

    /** Pause a visitor's messaging. They can still read the site. */
    public function block(Request $request, User $user): JsonResponse
    {
        $this->guard($request, $user);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update([
            'blocked_at' => now(),
            'blocked_reason' => $validated['reason'] ?? null,
        ]);

        return response()->json($this->summary($user->fresh()));
    }

    public function unblock(Request $request, User $user): JsonResponse
    {
        $this->guard($request, $user);
        $user->update(['blocked_at' => null, 'blocked_reason' => null]);

        return response()->json($this->summary($user->fresh()));
    }

    /** Remove a visitor account together with their conversation and letters. */
    public function destroy(Request $request, User $user): Response
    {
        $this->guard($request, $user);

        $conversation = PortfolioConversation::query()->where('visitor_id', (string) $user->id)->first();

        if ($conversation) {
            PortfolioMessage::query()->where('conversation_id', $conversation->id)->delete();
            $conversation->delete();
        }

        $user->delete();

        return response()->noContent();
    }

    /** The owner can never block, unblock or delete themselves or another admin. */
    private function guard(Request $request, User $user): void
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot moderate your own account.');
        abort_if($user->isAdmin(), 422, 'Owner accounts cannot be moderated.');
    }

    private function summary(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'blocked_at' => optional($user->blocked_at)->toIso8601String(),
            'blocked_reason' => $user->blocked_reason,
        ];
    }
}
