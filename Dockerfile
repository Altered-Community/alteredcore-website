FROM php:7.4-apache

# php:7.4 is Debian 11 (bullseye), whose LTS ended in August 2026: the bullseye-security
# mirror now 404s on package files and breaks apt-get. Install from bullseye main only.
RUN sed -i '/bullseye-security/d' /etc/apt/sources.list \
    && apt-get update && apt-get install -y \
        libpng-dev \
        libjpeg62-turbo-dev \
        libwebp-dev \
        libfreetype6-dev \
        libonig-dev \
        libzip-dev \
    && docker-php-ext-configure gd \
        --with-jpeg \
        --with-webp \
        --with-freetype \
    && docker-php-ext-install \
        pdo_mysql \
        gd \
        mbstring \
        opcache \
        zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

# Entrypoint applies pending DB migrations (bin/migrate.php) then runs Apache.
# Lives outside /var/www/html so the dev/compose source bind-mount doesn't shadow it.
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
