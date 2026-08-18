<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\CampaignParticipantBlock;
use App\Models\CampaignResponse;
use App\Models\User;

/**
 * Campaign authorization.
 *
 * Managing campaigns is owner-only. Responding is open to any signed-in
 * account that is not campaign-blocked — site-wide chat blocking is a separate
 * concern and is deliberately not consulted here.
 */
class CampaignPolicy
{
    public function manage(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $user->isAdmin();
    }

    /** May this account submit (or update) a response to this campaign? */
    public function respond(User $user, Campaign $campaign): bool
    {
        if (! $campaign->isAcceptingResponses()) {
            return false;
        }

        return ! CampaignParticipantBlock::blocks($user->id, $campaign->id);
    }

    /**
     * Campaign photos stay private: only the owner and the person who
     * submitted it may ever be handed a signed read URL.
     */
    public function viewPhoto(User $user, CampaignResponse $response): bool
    {
        return $user->isAdmin() || $response->user_id === $user->id;
    }
}
