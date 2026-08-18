<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Resolves the real visitor IP for rate limiting.
 *
 * The frontend is a Cloudflare Worker that proxies /api server-to-server, so
 * every request arrives at Laravel from the Worker's egress address. Keying a
 * limiter on that raw address would put *all* visitors in one bucket — the
 * first five failed logins anywhere would lock out the whole site.
 *
 * The Worker forwards the original address as `CF-Connecting-IP`. We only
 * believe that header when the request actually came from a trusted proxy
 * (TRUSTED_PROXIES), because port 8080 is reachable from the internet and an
 * attacker hitting it directly could otherwise spoof a fresh IP per attempt
 * and walk straight around the limiter.
 */
class ClientIp
{
    public static function for(Request $request): string
    {
        if (self::fromTrustedProxy($request)) {
            $forwarded = trim((string) $request->headers->get('CF-Connecting-IP'));

            if ($forwarded !== '' && filter_var($forwarded, FILTER_VALIDATE_IP)) {
                return $forwarded;
            }
        }

        // Symfony already applies the trusted-proxy rules to X-Forwarded-For.
        return (string) ($request->ip() ?? 'unknown');
    }

    /** Did this request arrive from an address we configured as a proxy? */
    private static function fromTrustedProxy(Request $request): bool
    {
        $proxies = array_filter(array_map('trim', explode(',', (string) config('app.trusted_proxies'))));

        if ($proxies === []) {
            return false;
        }

        if (in_array('*', $proxies, true)) {
            return true;
        }

        $remote = (string) $request->server->get('REMOTE_ADDR', '');

        foreach ($proxies as $proxy) {
            if ($remote === $proxy || (str_contains($proxy, '/') && self::inCidr($remote, $proxy))) {
                return true;
            }
        }

        return false;
    }

    private static function inCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = array_pad(explode('/', $cidr, 2), 2, null);
        $bits = (int) $bits;

        $ipLong = ip2long($ip);
        $subnetLong = ip2long((string) $subnet);

        if ($ipLong === false || $subnetLong === false || $bits < 0 || $bits > 32) {
            return false;
        }

        // ip2long returns a signed int for addresses above 127.x on 32-bit
        // builds; mask both sides to compare as unsigned.
        $ipLong &= 0xFFFFFFFF;
        $subnetLong &= 0xFFFFFFFF;

        $mask = $bits === 0 ? 0 : (-1 << (32 - $bits)) & 0xFFFFFFFF;

        return ($ipLong & $mask) === ($subnetLong & $mask);
    }
}
