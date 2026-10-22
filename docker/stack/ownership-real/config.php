<?php
// Site configuration with the real AlteredOwnership service (docker-compose.ownership.yml): the stack's, with the
// digital-ownership service of the overlay instead of the mock.
define('OWNERSHIP_API_URL', 'http://ownership-real:8080');
require __DIR__ . '/docker/stack/config.stack.php';
