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

## Production deployment on a VM

See the full step-by-step in [docs/production.md](docs/production.md).

Short version:
1. Create a free **Aiven MySQL** service at aiven.io
2. Copy `backend/.env.example` → `backend/.env` on the VM and fill in all values
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. `docker compose -f docker-compose.prod.yml exec app php artisan migrate --force`
5. `docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force`

## Configuration

See `backend/.env.example` — every variable is documented inline.
