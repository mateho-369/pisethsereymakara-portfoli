# Field Notes — React + Laravel + MinIO

A peaceful personal portfolio and media journal.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| API | Laravel 12 in `/backend` |
| Auth | Sanctum SPA sessions + Socialite Google OAuth |
| Database | **Local:** MySQL 8.4 (Docker) · **Production:** Aiven MySQL (free tier, external) |
| Storage | MinIO (S3-compatible), browser-to-MinIO presigned uploads |
| Theme | Light / Dark / System toggle (Hopecore Peace palette) |

## Local development

```bash
docker compose up --build -d   # starts React + Laravel + MySQL + MinIO
sh scripts/smoke-test.sh        # end-to-end verification
```

Services:

| Service | URL |
|---|---|
| Complete app | http://localhost:5173 |
| Laravel API | http://localhost:8080 |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |
| MySQL | localhost:3306 |

Default owner: `portfolio.owner@example.com` / `peaceful123`

Reset everything: `docker compose down -v && docker compose up --build -d`

## The studio (owner controls)

Sign in as the owner and open **/admin** (a "Studio" button also appears in the header).

| Section | What you can change |
|---|---|
| Overview | Counts for media, cards, people and conversations |
| Profile | Name, role title, location, bio, quote, contact email, portrait (upload or URL), footer links |
| Site text | Every heading, eyebrow, button label and paragraph on the public site, with "restore original" per line |
| Favorites | Add / edit / delete / reorder the "Things I love" cards, with a shared icon picker |
| Media | Upload, edit every field, replace the file, reorder, hide, favourite, delete (storage object included) |
| People | Everyone who signed up: pause messaging, restore, or delete the account and its letters |
| Inbox (`/chat`) | Reply, remove a single letter, archive or delete a thread, pause a visitor from the header |

Notes:

- Site copy lives in `portfolio_settings` as overrides; defaults are declared once in `backend/app/Support/SiteContent.php`, so nothing renders blank and any line can be restored.
- Icons are declared once in `src/lib/icons.ts` and validated against `backend/app/Support/IconLibrary.php`.
- Blocking pauses messaging only — the visitor keeps read access to the portfolio.
- Removing a message keeps the thread readable (a placeholder stays) while the text and any stored attachment are deleted.
- The database intentionally allows a single owner account (`users.admin_lock`), so roles cannot be granted from the UI.

After pulling these changes onto the VM, apply the new tables/columns:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate --build app
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

Use `up -d`, never `docker compose restart app` — `restart` does not reload `env_file` values.

## Production deployment on a VM

See the full step-by-step in [docs/production.md](docs/production.md).
Rate limiting, upload enforcement and the required `TRUSTED_PROXIES` setting
are documented in [docs/security.md](docs/security.md) — read it before
deploying, as IP-based rate limiting is ineffective without that value.

Short version:
1. Create a free **Aiven MySQL** service at aiven.io
2. Copy `backend/.env.example` → `backend/.env` on the VM and fill in all values
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. `docker compose -f docker-compose.prod.yml exec app php artisan migrate --force`
5. `docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force`

## Configuration

See `backend/.env.example` — every variable is documented inline.
