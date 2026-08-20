<?php

namespace App\Support;

use App\Models\Campaign;
use App\Models\PortfolioProfile;
use RuntimeException;

/**
 * Renders a 1200×630 share card (og:image) in the site's own palette.
 *
 * Preview crawlers (Facebook, Messenger, iMessage, Discord…) fetch raw HTML
 * and never execute JavaScript, so a campaign's Open Graph image must be a
 * real file — this class draws it server-side with GD. Deliberately plain:
 * a cream card, the horizon gradient, the brand, and the campaign's own
 * words. Nothing here reads an identity or touches the database.
 */
class CampaignOgImage
{
    public const WIDTH = 1200;
    public const HEIGHT = 630;

    /** Light tokens from src/index.css, flattened for GD. */
    private const SURFACE = [248, 244, 233]; // #F8F4E9
    private const INK = [43, 51, 40]; // #2B3328
    private const INK_2 = [83, 96, 80]; // #536050
    private const INK_3 = [104, 112, 100]; // #687064
    private const MOSS = [110, 124, 82]; // #6E7C52
    private const GOLD = [217, 164, 65]; // #D9A441
    private const FJORD = [92, 122, 137]; // #5C7A89

    /** The site card (no campaign) — og:image for every other page. */
    public static function siteCard(): string
    {
        return self::render(null);
    }

    /** The site card, personalised: the owner's photo, name, role, and quote. */
    public static function profileCard(PortfolioProfile $profile): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException('The GD extension is not available in this PHP build.');
        }

        $serif = self::font([
            '/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif-Bold.ttf',
        ]);
        $serifItalic = self::font([
            '/usr/share/fonts/dejavu/DejaVuSerif-Italic.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif-Italic.ttf',
            $serif,
        ]);
        $sans = self::font([
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf',
        ]);
        $mono = self::font([
            '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSansMono.ttf',
            $sans,
        ]);

        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        $surface = self::color($image, self::SURFACE);
        $ink = self::color($image, self::INK);
        $ink2 = self::color($image, self::INK_2);
        $ink3 = self::color($image, self::INK_3);
        $moss = self::color($image, self::MOSS);
        $hairline = self::mix($image, self::SURFACE, self::MOSS, 0.28);

        imagefill($image, 0, 0, $surface);
        self::drawHorizon($image);
        imagefttext($image, 40, 0, 80, 108, $ink, $serif, 'Field Notes');

        $left = 80;
        $radius = 95;
        $cx = $left + $radius;
        $cy = 300;
        $hasAvatar = $profile->avatar_url !== null
            && self::drawCircularAvatar($image, $profile->avatar_url, $cx, $cy, $radius);

        $textLeft = $hasAvatar ? $cx + $radius + 44 : $left;
        $textMaxWidth = self::WIDTH - 80 - $textLeft;

        $nameY = 270;
        foreach (self::wrapText($image, $profile->display_name, $serif, 54, $textMaxWidth, 2) as $line) {
            imagefttext($image, 54, 0, $textLeft, $nameY, $ink, $serif, $line);
            $nameY += 66;
        }
        imagefttext($image, 25, 0, $textLeft, $nameY + 8, $ink3, $sans, $profile->role_title);

        if ($profile->quote) {
            $qy = max($nameY + 60, $hasAvatar ? $cy + $radius + 50 : $nameY + 60);
            foreach (self::wrapText($image, $profile->quote, $serifItalic, 28, self::WIDTH - 160, 2) as $line) {
                imagefttext($image, 28, 0, $left, $qy, $ink2, $serifItalic, $line);
                $qy += 40;
            }
        }

        self::drawFooter($image, $mono, $ink3, $moss, $hairline, $left, 'field notes');

        return self::toPng($image);
    }

    /** The /support page card: the KHQR image (if set) and the support blurb. */
    public static function supportCard(PortfolioProfile $profile): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException('The GD extension is not available in this PHP build.');
        }

        $serif = self::font([
            '/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif-Bold.ttf',
        ]);
        $sans = self::font([
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf',
        ]);
        $mono = self::font([
            '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSansMono.ttf',
            $sans,
        ]);

        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        $surface = self::color($image, self::SURFACE);
        $white = imagecolorallocate($image, 255, 255, 255);
        $ink = self::color($image, self::INK);
        $ink2 = self::color($image, self::INK_2);
        $ink3 = self::color($image, self::INK_3);
        $moss = self::color($image, self::MOSS);
        $hairline = self::mix($image, self::SURFACE, self::MOSS, 0.28);

        imagefill($image, 0, 0, $surface);
        self::drawHorizon($image);
        imagefttext($image, 40, 0, 80, 108, $ink, $serif, 'Field Notes');

        $left = 80;
        $qrSize = 300;
        $qrBoxX = self::WIDTH - 80 - $qrSize - 32;
        $qrBoxY = 190;
        $hasQr = $profile->support_qr_url !== null
            && self::drawBoxedImage($image, $profile->support_qr_url, $qrBoxX, $qrBoxY, $qrSize, $white);

        $textMaxWidth = $hasQr ? ($qrBoxX - $left - 40) : (self::WIDTH - 160);

        imagefttext($image, 58, 0, $left, 260, $ink, $serif, 'Support this work');

        $caption = $profile->support_caption
            ?: 'If this space has brought you peace or inspiration, a small tip means a lot.';
        $capY = 320;
        foreach (self::wrapText($image, $caption, $sans, 28, $textMaxWidth, 5) as $line) {
            imagefttext($image, 28, 0, $left, $capY, $ink2, $sans, $line);
            $capY += 40;
        }

        if ($hasQr) {
            imagefttext($image, 20, 0, $qrBoxX, $qrBoxY + $qrSize + 32 + 26, $ink3, $mono, 'Scan to support');
        }

        self::drawFooter($image, $mono, $ink3, $moss, $hairline, $left, '/support');

        return self::toPng($image);
    }

    /**
     * @return string PNG binary
     */
    public static function render(?Campaign $campaign): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException('The GD extension is not available in this PHP build.');
        }

        // Alpine moved the DejaVu directory between releases
        // (ttf-dejavu/ → dejavu/), so both locations are tried.
        $serif = self::font([
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif-Bold.ttf',
            '/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf',
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif.ttf',
            '/usr/share/fonts/dejavu/DejaVuSerif.ttf',
        ]);
        $serifItalic = self::font([
            '/usr/share/fonts/ttf-dejavu/DejaVuSerif-Italic.ttf',
            '/usr/share/fonts/dejavu/DejaVuSerif-Italic.ttf',
            $serif,
        ]);
        $sans = self::font([
            '/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
        ]);
        $mono = self::font([
            '/usr/share/fonts/ttf-dejavu/DejaVuSansMono.ttf',
            '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
            $sans,
        ]);

        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        $surface = self::color($image, self::SURFACE);
        $ink = self::color($image, self::INK);
        $ink2 = self::color($image, self::INK_2);
        $ink3 = self::color($image, self::INK_3);
        $moss = self::color($image, self::MOSS);
        $hairline = self::mix($image, self::SURFACE, self::MOSS, 0.28);

        imagefill($image, 0, 0, $surface);

        // The site's horizon gradient across the top: moss → gold → fjord.
        for ($y = 0; $y < 10; $y++) {
            for ($x = 0; $x < self::WIDTH; $x++) {
                $t = $x / (self::WIDTH - 1);
                imagesetpixel($image, $x, $y, $t < 0.52
                    ? self::mix($image, self::MOSS, self::GOLD, $t / 0.52)
                    : self::mix($image, self::GOLD, self::FJORD, ($t - 0.52) / 0.48));
            }
        }

        // Brand wordmark, top left.
        imagefttext($image, 40, 0, 80, 108, $ink, $serif, 'Field Notes');

        // Type eyebrow, top right — mirrors the campaign page's own copy.
        if ($campaign !== null) {
            $eyebrow = match ($campaign->type) {
                Campaign::TYPE_POLL => 'A quick vote',
                Campaign::TYPE_QUESTION => 'Ask me anything',
                default => 'Send a photo',
            };
            $eyebrow = mb_strtoupper($eyebrow);
            imagefttext($image, 22, 0, self::WIDTH - 80 - self::textWidth($image, $eyebrow, $mono, 22), 100, $ink3, $mono, $eyebrow);
        }

        $left = 80;
        $maxWidth = self::WIDTH - 160;

        if ($campaign !== null) {
            // The campaign's own words: title, then its question.
            $promptLines = $campaign->prompt
                ? self::wrapText($image, $campaign->prompt, $sans, 30, $maxWidth, 3)
                : [];

            $titleY = $promptLines === [] ? 320 : 250;

            foreach (self::wrapText($image, $campaign->title, $serif, 66, $maxWidth, 2) as $line) {
                imagefttext($image, 66, 0, $left, $titleY, $ink, $serif, $line);
                $titleY += 84;
            }

            $promptY = $titleY + 16;
            foreach ($promptLines as $line) {
                imagefttext($image, 30, 0, $left, $promptY, $ink2, $sans, $line);
                $promptY += 46;
            }
        } else {
            // Site card: the site's own eyebrow copy as the centrepiece.
            // Wrapped and sized conservatively (same helper campaign cards
            // use) so it survives aggressive crops in Messenger/WhatsApp,
            // which don't always respect the full 1200x630 canvas.
            $safeWidth = self::WIDTH - 320; // wider margins than campaign cards
            $taglineY = 280;
            foreach (self::wrapText($image, 'A quiet corner of the internet.', $serifItalic, 56, $safeWidth, 2) as $line) {
                imagefttext($image, 56, 0, $left, $taglineY, $ink, $serifItalic, $line);
                $taglineY += 70;
            }
            imagefttext($image, 30, 0, $left, $taglineY + 30, $ink3, $sans, 'Piseth Serey Makara · Field Notes');
        }

        // Footer hairline and line: where to find it, and the house note.
        imagefilledrectangle($image, $left, 552, self::WIDTH - 80, 553, $hairline);
        $footerLeft = $campaign !== null ? '/ask/'.$campaign->slug : 'field notes';
        imagefttext($image, 22, 0, $left, 602, $ink3, $mono, $footerLeft);
        $note = 'Made slowly, shared warmly.';
        imagefttext($image, 22, 0, self::WIDTH - 80 - self::textWidth($image, $note, $mono, 22), 602, $moss, $mono, $note);

        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    /** First font file that actually exists; a missing font fails loudly. */
    private static function font(array $candidates): string
    {
        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        throw new RuntimeException('No usable TTF font found. Expected one of: '.implode(', ', $candidates));
    }

    /**
     * Greedy word wrap that never returns more than $maxLines lines. When the
     * text does not fit, the final line is ended with an ellipsis.
     */
    private static function wrapText($image, string $text, string $font, int $size, int $maxWidth, int $maxLines): array
    {
        $words = array_values(array_filter(preg_split('/\s+/', trim($text))));
        $lines = [];
        $line = '';
        $truncated = false;

        // Move the current line into $lines, never exceeding $maxLines.
        $finishLine = function () use (&$lines, &$line, &$truncated, $maxLines): void {
            if ($line === '') {
                return;
            }

            if (count($lines) < $maxLines) {
                $lines[] = $line;
            } else {
                $truncated = true;
            }

            $line = '';
        };

        foreach ($words as $word) {
            $candidate = $line === '' ? $word : $line.' '.$word;

            if (self::textWidth($image, $candidate, $font, $size) <= $maxWidth) {
                $line = $candidate;
                continue;
            }

            // The word does not fit on the current line: flush that line,
            // then start the next one with this word.
            $finishLine();

            if (count($lines) >= $maxLines) {
                $truncated = true;
                break;
            }

            // One word wider than the whole column: shorten it with an ellipsis.
            if (self::textWidth($image, $word.'…', $font, $size) > $maxWidth) {
                while (mb_strlen($word) > 1 && self::textWidth($image, $word.'…', $font, $size) > $maxWidth) {
                    $word = mb_substr($word, 0, -1);
                }
                $word = $word.'…';
            }

            $line = $word;
        }

        $finishLine();

        if ($truncated && $lines !== []) {
            $last = $lines[count($lines) - 1];
            while (mb_strlen($last) > 1 && self::textWidth($image, $last.'…', $font, $size) > $maxWidth) {
                $last = mb_substr($last, 0, -1);
            }
            $lines[count($lines) - 1] = $last.'…';
        }

        return $lines;
    }

    private static function textWidth($image, string $text, string $font, int $size): int
    {
        $box = @imageftbbox($size, 0, $font, $text, []);

        return is_array($box) ? (int) ceil($box[2] - $box[0]) : 0;
    }

    private static function color($image, array $rgb): int
    {
        return imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);
    }

    private static function mix($image, array $from, array $to, float $t): int
    {
        $t = max(0.0, min(1.0, $t));

        return imagecolorallocate(
            $image,
            (int) round($from[0] + ($to[0] - $from[0]) * $t),
            (int) round($from[1] + ($to[1] - $from[1]) * $t),
            (int) round($from[2] + ($to[2] - $from[2]) * $t),
        );
    }

    /** The horizon gradient across the top ten pixel rows: moss -> gold -> fjord. */
    private static function drawHorizon($image): void
    {
        for ($y = 0; $y < 10; $y++) {
            for ($x = 0; $x < self::WIDTH; $x++) {
                $t = $x / (self::WIDTH - 1);
                imagesetpixel($image, $x, $y, $t < 0.52
                    ? self::mix($image, self::MOSS, self::GOLD, $t / 0.52)
                    : self::mix($image, self::GOLD, self::FJORD, ($t - 0.52) / 0.48));
            }
        }
    }

    /** The hairline + left/right footer line every card shares. */
    private static function drawFooter($image, string $mono, int $ink3, int $moss, int $hairline, int $left, string $footerLeft): void
    {
        imagefilledrectangle($image, $left, 552, self::WIDTH - 80, 553, $hairline);
        imagefttext($image, 22, 0, $left, 602, $ink3, $mono, $footerLeft);
        $note = 'Made slowly, shared warmly.';
        imagefttext($image, 22, 0, self::WIDTH - 80 - self::textWidth($image, $note, $mono, 22), 602, $moss, $mono, $note);
    }

    private static function toPng($image): string
    {
        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    /**
     * Fetch a remote image (avatar/QR). Times out fast and never throws:
     * a slow or dead URL degrades to no photo, never a broken card.
     */
    private static function fetchImage(string $url): ?\GdImage
    {
        $context = stream_context_create([
            'http' => ['timeout' => 3],
            'https' => ['timeout' => 3],
        ]);

        $data = @file_get_contents($url, false, $context);

        if ($data === false || $data === '') {
            return null;
        }

        $image = @imagecreatefromstring($data);

        return $image instanceof \GdImage ? $image : null;
    }

    /** Fetch, centre-crop to a square, and mask into a circle at ($cx, $cy). */
    private static function drawCircularAvatar($image, string $url, int $cx, int $cy, int $radius): bool
    {
        $src = self::fetchImage($url);

        if ($src === null) {
            return false;
        }

        $srcW = imagesx($src);
        $srcH = imagesy($src);
        $cropSize = min($srcW, $srcH);
        $srcX = intdiv($srcW - $cropSize, 2);
        $srcY = intdiv($srcH - $cropSize, 2);

        $d = $radius * 2;
        $circle = imagecreatetruecolor($d, $d);
        imagesavealpha($circle, true);
        $transparent = imagecolorallocatealpha($circle, 0, 0, 0, 127);
        imagefill($circle, 0, 0, $transparent);
        imagecopyresampled($circle, $src, 0, 0, $srcX, $srcY, $d, $d, $cropSize, $cropSize);

        for ($y = 0; $y < $d; $y++) {
            for ($x = 0; $x < $d; $x++) {
                $dx = $x - $radius;
                $dy = $y - $radius;

                if ($dx * $dx + $dy * $dy > $radius * $radius) {
                    imagesetpixel($circle, $x, $y, $transparent);
                }
            }
        }

        imagecopy($image, $circle, $cx - $radius, $cy - $radius, 0, 0, $d, $d);
        imagedestroy($circle);
        imagedestroy($src);

        return true;
    }

    /** Fetch and draw into a white padded square (keeps a QR code scannable-looking). */
    private static function drawBoxedImage($image, string $url, int $x, int $y, int $size, int $white): bool
    {
        $src = self::fetchImage($url);

        if ($src === null) {
            return false;
        }

        $pad = 16;
        imagefilledrectangle($image, $x, $y, $x + $size + $pad * 2, $y + $size + $pad * 2, $white);
        imagecopyresampled($image, $src, $x + $pad, $y + $pad, 0, 0, $size, $size, imagesx($src), imagesy($src));
        imagedestroy($src);

        return true;
    }
}
