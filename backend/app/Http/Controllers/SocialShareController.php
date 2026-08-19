<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Support\CampaignOgImage;
use Illuminate\Http\Response;

/**
 * Public share-card endpoints.
 *
 * Preview crawlers (Facebook, Messenger, iMessage, Discord…) fetch these
 * with plain GET requests — no session, no auth — so nothing here reads an
 * identity. Cards are rendered on the fly and cached briefly downstream.
 */
class SocialShareController extends Controller
{
    /** The site card — og:image for every page that is not a campaign. */
    public function siteOgImage(): Response
    {
        return $this->card(CampaignOgImage::siteCard());
    }

    /**
     * A campaign's own card: its title and question over the site's style.
     * Drafts and unknown slugs 404 — they must not confirm their existence.
     */
    public function campaignOgImage(string $slug): Response
    {
        $campaign = Campaign::query()->slug($slug)->first();

        abort_if(! $campaign || $campaign->status === 'draft', 404);

        return $this->card(CampaignOgImage::render($campaign));
    }

    private function card(string $png): Response
    {
        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline; filename="og-image.png"',
            // The campaign's words rarely change; keep crawlers cheap.
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
