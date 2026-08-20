FROM alpine:3.20

# 1. Ensure www-data user exists
RUN adduser -u 82 -D -S -G www-data www-data 2>/dev/null || true

# 2. Install pre-compiled PHP 8.3 & extensions
RUN apk add --no-cache \
    bash \
    curl \
    git \
    ttf-dejavu \
    php83 \
    php83-fpm \
    php83-bcmath \
    php83-ctype \
    php83-curl \
    php83-dom \
    php83-fileinfo \
    php83-gd \
    php83-intl \
    php83-mbstring \
    php83-openssl \
    php83-pcntl \
    php83-pdo_mysql \
    php83-phar \
    php83-session \
    php83-simplexml \
    php83-tokenizer \
    php83-xml \
    php83-xmlwriter \
    php83-zip \
    composer \
    && ln -sf /usr/bin/php83 /usr/bin/php \
    && sed -i 's/listen = 127.0.0.1:9000/listen = 0.0.0.0:9000/' /etc/php83/php-fpm.d/www.conf \
    && sed -i 's/user = nobody/user = www-data/' /etc/php83/php-fpm.d/www.conf \
    && sed -i 's/group = nobody/group = www-data/' /etc/php83/php-fpm.d/www.conf

WORKDIR /var/www/html
COPY composer.json ./
RUN composer install --no-interaction --no-dev --no-scripts --prefer-dist --no-progress
COPY . .
RUN composer install --no-interaction --no-dev --optimize-autoloader --no-progress \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/php/entrypoint.sh /usr/local/bin/field-notes-entrypoint
RUN chmod +x /usr/local/bin/field-notes-entrypoint
RUN echo "clear_env = no" >> /etc/php83/php-fpm.d/www.conf
ENTRYPOINT ["field-notes-entrypoint"]
CMD ["php-fpm83", "-F"]
