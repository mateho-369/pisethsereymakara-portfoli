#!/usr/bin/env sh
set -eu
cd /var/www/html
if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist --no-progress
fi
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# In production (APP_ENV=production) we skip auto-migrate/seed so the
# operator can run them explicitly after verifying the database connection.
# In local/staging, migrate+seed automatically on every container start.
if [ "${APP_ENV:-local}" = "production" ]; then
  echo "[entrypoint] Production mode: skipping auto-migrate/seed."
  echo "[entrypoint] Run manually: php artisan migrate --force"
else
  php artisan migrate --force
  php artisan db:seed --force
fi

php artisan config:clear

# Single-container platforms inject the port to bind at runtime (Koyeb uses
# $PORT, typically 8000). Default to 8000 when unset (e.g. local docker run).
export PORT="${PORT:-8000}"
echo "[entrypoint] nginx will listen on port ${PORT}"

# Render the nginx site config from the template, substituting only $PORT
# (nginx's own $uri/$query_string/$document_root variables are left intact).
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Hand off to supervisord, which starts php-fpm and nginx in the foreground.
exec "$@"
