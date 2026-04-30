# Dev image for the LGM Sports PHP backend.
#
# Uses the PHP built-in server with `index.php` as the front controller,
# matching the workflow documented in README.md.
FROM php:7.4-cli

RUN apt-get update \
 && apt-get install -y --no-install-recommends git unzip \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pdo_mysql

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies into the image so it works even without a bind
# mount. In dev the project root is bind-mounted over /var/www/html, which
# transparently uses the repo's own vendor/ directory.
COPY composer.json ./
# --no-security-blocking: phpunit 6.5.5 has a known security advisory; we
# tolerate it in this dev-only image so the build doesn't fail.
RUN composer install --no-interaction --no-progress --no-scripts --no-security-blocking

COPY . .

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "-t", "/var/www/html", "index.php"]
