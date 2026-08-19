FROM php:8.3-fpm-alpine

# The -dev packages below (freetype/libpng/libjpeg/libwebp) are build-time
# only for the gd extension; they are removed at the end. ttf-dejavu is
# runtime: the OG share-card renderer (app/Support/CampaignOgImage.php) draws
# with these TrueType fonts, so it must stay in the image.
RUN apk add --no-cache bash curl git curl-dev icu-dev libxml2-dev libzip-dev oniguruma-dev linux-headers \
        freetype-dev libpng-dev libjpeg-turbo-dev libwebp-dev ttf-dejavu $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install bcmath curl gd intl mbstring pcntl pdo_mysql simplexml zip \
    && apk del $PHPIZE_DEPS freetype-dev libpng-dev libjpeg-turbo-dev libwebp-dev
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
