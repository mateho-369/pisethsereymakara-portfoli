#!/usr/bin/env sh
set -eu
cd /var/www/html
if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist --no-progress
fi
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# In production (APP_ENV=production) we skip auto-migrate/seed so the
# operator can run them explicitly after verifying the Aiven connection.
# In local/staging, migrate+seed automatically on every container start.
if [ "${APP_ENV:-local}" = "production" ]; then
  echo "[entrypoint] Production mode: skipping auto-migrate/seed."
  echo "[entrypoint] Run manually: docker compose -f docker-compose.prod.yml exec app php artisan migrate --force"
else
  php artisan migrate --force
  php artisan db:seed --force
fi

php artisan config:clear
exec "$@"
