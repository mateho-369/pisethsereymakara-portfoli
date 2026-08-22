# Field Notes Laravel API

Laravel 12 REST API with Sanctum session auth, Socialite Google login, MySQL 8.4, and direct-to-MinIO presigned uploads.

## Local start

From the repository root, the single Compose command starts the frontend and every backend dependency:

```bash
docker compose up --build -d
sh scripts/smoke-test.sh
```

The complete app is served at `http://localhost:5173`, the API is also available directly at `http://localhost:8080`, MinIO at `http://localhost:9000`, and the MinIO console at `http://localhost:9001`.

The compose entrypoint migrates and seeds the database. Change all passwords and OAuth settings before production deployment.

## Single-container deployment (Koyeb, Render, Railway)

For platforms that run one container per service, build the dedicated image
(`docker/php/Dockerfile.koyeb`) instead of the VM/compose one. It runs
nginx + PHP-FPM together under supervisord and serves Laravel on the port the
platform injects via the `PORT` environment variable (Koyeb defaults to 8000):

```bash
# Build from the backend/ directory (context = backend/)
docker build -f docker/php/Dockerfile.koyeb -t field-notes-api .

# Run locally (defaults to PORT=8000)
docker run --rm -p 8000:8000 \
  -e PORT=8000 \
  -e APP_ENV=production \
  -e APP_KEY=... \
  -e DB_HOST=... -e DB_PORT=3306 -e DB_DATABASE=... -e DB_USERNAME=... -e DB_PASSWORD=... \
  -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... -e AWS_DEFAULT_REGION=... \
  -e AWS_BUCKET=... -e AWS_ENDPOINT=... -e MINIO_PUBLIC_ENDPOINT=... -e MINIO_PUBLIC_URL=... \
  field-notes-api
```

At startup the entrypoint renders `docker/nginx/default.conf.template` with the
runtime `$PORT` (via `envsubst`) and supervisord starts php-fpm and nginx as two
supervised programs inside the single container. In production (`APP_ENV=production`)
migrations are not run automatically — run `php artisan migrate --force` once
(e.g. as a one-off command) after verifying the database connection.

The original `docker/php/Dockerfile` + `docker-compose.prod.yml` (separate nginx
container) remain in place for the VM deployment until it is decommissioned.
