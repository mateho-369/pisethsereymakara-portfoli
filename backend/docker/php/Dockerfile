FROM php:8.3-fpm-alpine

RUN apk add --no-cache bash curl git curl-dev icu-dev libxml2-dev libzip-dev oniguruma-dev linux-headers $PHPIZE_DEPS \
    && docker-php-ext-install bcmath curl intl mbstring pcntl pdo_mysql simplexml zip \
    && apk del $PHPIZE_DEPS
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json ./
RUN composer install --no-interaction --no-dev --no-scripts --prefer-dist --no-progress
COPY . .
RUN composer install --no-interaction --no-dev --optimize-autoloader --no-progress && chown -R www-data:www-data storage bootstrap/cache
COPY docker/php/entrypoint.sh /usr/local/bin/field-notes-entrypoint
RUN chmod +x /usr/local/bin/field-notes-entrypoint
ENTRYPOINT ["field-notes-entrypoint"]
CMD ["php-fpm"]
