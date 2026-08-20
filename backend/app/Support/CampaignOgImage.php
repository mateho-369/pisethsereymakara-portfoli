<?php

namespace App\Support;

use App\Models\Campaign;
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
            imagefttext($image, 72, 0, $left, 300, $ink, $serifItalic, 'A quiet corner of the internet.');
            imagefttext($image, 30, 0, $left, 380, $ink3, $sans, 'Piseth Serey Makara · Field Notes');
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
}
