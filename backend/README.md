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
