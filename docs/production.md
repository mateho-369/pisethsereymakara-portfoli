# Production Deployment Guide

This guide deploys the Field Notes stack on a single Linux VM (GCP e2-micro or equivalent). The frontend is served separately via Cloudflare Pages. There is **no WebSocket service** — the chat uses polling.

## Prerequisites

- A VM with Docker and Docker Compose installed
- A domain with DNS you control (e.g. `yourdomain.com`)
- A free [Aiven](https://aiven.io) account (no credit card required)
- (Optional) Google OAuth credentials

## Step 1 — Aiven MySQL

1. Go to [aiven.io](https://aiven.io) → Sign up → Create service → **MySQL** → Free plan
2. Wait for provisioning to complete
3. Copy the **Service URI** or the individual fields: `Host`, `Port`, `Database`, `User`, `Password`
4. Aiven requires TLS — the Laravel config handles this automatically when `DB_SSL_CA` is set (see below)

## Step 2 — Generate secrets

Run these **on the VM** (or locally and paste the output):

```bash
# Laravel app key (32 bytes, base64)
openssl rand -base64 32
# Produces something like: abc123...== — the full string goes in APP_KEY as: base64:<output>

# All other passwords (MinIO, admin account, etc.)
openssl rand -base64 24 | tr -d '=+/' | cut -c1-20
```

Generate a **separate** password for:
- `APP_KEY` (use the 32-byte base64 command above, prefix with `base64:`)
- `AWS_ACCESS_KEY_ID` (MinIO username)
- `AWS_SECRET_ACCESS_KEY` (MinIO password)
- `ADMIN_PASSWORD` (portfolio owner login)

## Step 3 — Create `backend/.env` on the VM

```bash
cd /home/<you>/personal-portfoli-makara-mateho/backend
cp .env.example .env
nano .env   # or vim, or any editor
```

Fill in every value. Key fields for production:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:<32-byte secret from step 2>
APP_URL=https://api.yourdomain.com

FRONTEND_URL=https://portfolio.yourdomain.com
FRONTEND_URLS=https://portfolio.yourdomain.com

# Aiven MySQL
DB_CONNECTION=mysql
DB_HOST=<aiven-host>.aivencloud.com
DB_PORT=<aiven-port>
DB_DATABASE=defaultdb
DB_USERNAME=avnadmin
DB_PASSWORD=<aiven-password>
# Download Aiven CA cert and set path here (optional but recommended)
# DB_SSL_CA=/home/<you>/aiven-ca.pem

SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
SESSION_DOMAIN=.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=portfolio.yourdomain.com

# MinIO — use the secrets from step 2
AWS_ACCESS_KEY_ID=<minio-username>
AWS_SECRET_ACCESS_KEY=<minio-password>
AWS_ENDPOINT=http://minio:9000
MINIO_PUBLIC_ENDPOINT=https://storage.yourdomain.com
MINIO_PUBLIC_URL=https://storage.yourdomain.com/portfolio

ADMIN_EMAIL=<your-real-email>
ADMIN_PASSWORD=<secret from step 2>

GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
```

## Step 4 — Start the production stack

```bash
cd /home/<you>/personal-portfoli-makara-mateho
docker compose -f docker-compose.prod.yml up -d --build
```

This starts **3 services only**: `app` (PHP-FPM), `nginx` (API proxy), `minio` (object storage), and the one-shot `minio-init` (bucket creation).

- MySQL is **not** in the prod Compose file — it lives on Aiven
- The frontend is **not** in the prod Compose file — deploy it to Cloudflare Pages
- The MinIO console (port 9001) is **not** publicly exposed — access via SSH tunnel:

```bash
ssh -L 9001:127.0.0.1:9001 user@your-vm
# Then open http://localhost:9001 in your browser
```

## Step 5 — Migrate and seed

Run **once** after the first deploy, and after any schema-changing release:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force
```

The seed creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

## Step 6 — Nginx reverse proxy on the VM

Install Nginx on the VM host (not in Docker) and create server blocks:

```nginx
# /etc/nginx/sites-available/field-notes

# Laravel API
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 8m;
    }
}

# MinIO object storage
server {
    listen 80;
    server_name storage.yourdomain.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name storage.yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/storage.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/storage.yourdomain.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 8m;
    }
}
# NOTE: No ws.yourdomain.com block needed — this backend uses polling, not WebSockets.
```

Obtain TLS certificates:

```bash
sudo certbot --nginx -d api.yourdomain.com -d storage.yourdomain.com
```

## Step 7 — Cloudflare Pages (frontend)

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=https://api.yourdomain.com`
5. Deploy

Cloudflare Pages serves the React SPA. All `/api` and `/sanctum` calls go to `https://api.yourdomain.com` via the `VITE_API_URL` env var.

## DNS records

| Name | Type | Value |
|---|---|---|
| `api` | A | `<VM public IP>` |
| `storage` | A | `<VM public IP>` |
| `portfolio` | CNAME | `<your-pages-subdomain>.pages.dev` |

## Updating

```bash
cd /home/<you>/personal-portfoli-makara-mateho
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

## Aiven SSL CA (optional but recommended)

Download the CA certificate from the Aiven console → your MySQL service → **Quick connect** → **Download CA**. Save it to the VM and set:

```dotenv
DB_SSL_CA=/home/<you>/aiven-ca.pem
```

This enables full certificate verification for the Aiven TLS connection.
