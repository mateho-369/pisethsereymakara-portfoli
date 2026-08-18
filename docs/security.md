# Security notes

Findings and mitigations from the pre-launch audit pass. Anything marked
**ACTION REQUIRED** is an operator task that code cannot do on its own.

## Rate limiting

`/api/auth/login`, `/api/auth/register` and `/api/auth/forgot-password` are
limited to **5 requests per minute**, keyed on two buckets at once:

- the visitor's IP, so one address cannot walk a password list; and
- the submitted email *combined with* the IP, so a credential-stuffing run
  cannot rotate accounts to stay under the per-IP bucket.

Either bucket tripping returns `429` with a `Retry-After` header. The frontend
turns that into "Too many attempts. Please wait N seconds and try again."

Other limits: `throttle:api` (120/min) on every `/api` route as a backstop,
`throttle:uploads` (20/min) on the presign endpoints, and
`throttle:campaign-respond` (10/min) on campaign submissions.

Limiter state lives in the cache, which is `database`-backed
(`CACHE_STORE=database`), so the `cache` table must exist — it does, via
`0001_01_01_000001_create_cache_table.php`.

### ACTION REQUIRED — `TRUSTED_PROXIES`

IP-keyed limiting only works if Laravel can see the visitor's real address.
In production the Cloudflare Worker proxies `/api` **server-to-server**, so
without configuration every request appears to come from the Worker's egress
IP and all visitors share one bucket — five failed logins anywhere would lock
out the entire site.

The Worker now forwards `CF-Connecting-IP` and `X-Forwarded-For`, and Laravel
reads them **only** when the request arrives from an address listed in
`TRUSTED_PROXIES` (see `backend/.env.example`).

Set `TRUSTED_PROXIES` on the VM to the address(es) that actually reach nginx,
or to [Cloudflare's published ranges](https://www.cloudflare.com/ips/).

**Do not set `TRUSTED_PROXIES=*` while port 8080 is reachable from the
internet.** `docs/production.md` deliberately publishes 8080 on `0.0.0.0` so
the Worker can reach it; with a wildcard, anyone hitting that port directly
could spoof `CF-Connecting-IP` and get a fresh limiter bucket per request,
defeating the login limiter entirely. Restrict 8080 with the VM firewall.

Left blank (the default, and correct for local development) the limiter falls
back to the direct socket address.

## Upload size enforcement

The `size` field sent to `/uploads/presign` is a **client claim**. A presigned
PUT URL cannot carry a `content-length-range` condition the way a presigned
POST policy can, so the URL itself constrains only `ContentType`. Someone could
request a presign claiming 12 KB and then stream gigabytes to MinIO.

`App\Support\UploadGuard` closes this by reading the object's real size back
from storage before any record referencing it is accepted. Oversized objects
are deleted and the request fails validation. Applied at all three consumer
paths:

| Path | Field verified |
|---|---|
| `MediaController::store` / `::update` | `media_url`, `thumbnail_url` |
| `MessageController::store` | `attachment_url` |
| `CampaignController::respond` | `photo_key` |

An unverifiable size is treated as a failure, not a pass. `size_label` is now
derived from the verified byte count rather than trusting the client's string.

A presigned POST with an embedded `content-length-range` would reject oversized
bytes at the door rather than after transfer, and is worth revisiting; it needs
a different frontend upload path (multipart form fields instead of a raw PUT),
so it was not bundled into this pass. The bytes still cross the network under
the current fix — they just never get referenced, and are deleted immediately.

## Security response headers

`App\Http\Middleware\SecurityHeaders` adds, on every response:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Cache-Control: no-store, private` on `/api/*` (responses are per-account
  behind a session cookie and must not be held by a shared cache)

Existing headers are never overwritten.

## Dependency audit

`npm audit`: **0 vulnerabilities**, production and dev.

- `react-router-dom` `7.13.1` → `^7.18.2`, clearing 12 advisories including a
  vendored `turbo-stream` RCE, several XSS paths, and two open redirects.
- `nanoid` (transitive via `vite` → `postcss`) and the `wrangler` /
  `@cloudflare/vite-plugin` / `miniflare` / `undici` chain updated in place.

All updates stayed inside the existing semver ranges; only the
`react-router-dom` floor in `package.json` moved.

`composer audit` **could not be run** — no PHP or Composer in this environment,
and `backend/composer.lock` does not exist (so there is no pinned dependency
set to audit in the first place). Run on a machine with PHP:

```sh
cd backend && composer install && composer audit
```

The absence of a committed `composer.lock` is itself worth fixing: production
installs currently resolve dependencies fresh, so two deploys can get different
package versions and an audit result is not reproducible.

## SQL injection

Reviewed every raw-SQL escape hatch outside the query builder:
`orderByRaw` in `MediaController`, `selectRaw` in `CampaignController` and
`AdminCampaignController`, `DB::select('select 1')` in `SystemController`,
`DB::transaction` in `AdminCampaignController`. All are constant strings with
no interpolated input. User-supplied filters (`search`, `type`, `category`) go
through parameter binding. No issues found.

## Campaign / login surface

- Submission and presign endpoints carry their own limiters (above).
- Campaign photo uploads reuse `UploadGuard`, not a reimplementation.
- Campaign photos live under a private `campaigns/` prefix with no anonymous
  policy, reachable only via short-lived signed URLs.
- `respond` enforces login, campaign window, campaign-specific blocks, and the
  `respond` policy; a unique index plus a `UniqueConstraintViolationException`
  catch makes one-response-per-user race-safe.

### ACTION REQUIRED — MinIO bucket policy on existing deployments

`minio-init` sets anonymous download **per prefix** (`media` and `chat` public,
`campaigns` none). It runs `mc mb --ignore-existing`, so an **already-created**
bucket keeps whatever policy it had — previously anonymous download at the
bucket root, which would expose campaign photos. On an existing deployment,
run once:

```sh
docker compose exec minio-init sh -c '
  mc alias set local http://minio:9000 "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY" &&
  mc anonymous set download local/portfolio/media &&
  mc anonymous set download local/portfolio/chat &&
  mc anonymous set none local/portfolio/campaigns'
```

## Outstanding — not fixable in code

- **Rotate the Aiven MySQL password.** It was exposed in an early credentials
  file and has not been rotated. This is an Aiven-console task for the owner,
  followed by updating `DB_PASSWORD` in `backend/.env` on the VM and restarting
  the stack.
- **Commit a `backend/composer.lock`** and run `composer audit` (see above).
