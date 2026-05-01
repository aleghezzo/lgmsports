<?php
use \App\Session as Session;
use \App\Database as Database;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

// Adjustments for PHP's built-in web server (`php -S ... index.php`):
//
// 1. PHP fills SCRIPT_NAME with the request URI when it can't match the
//    request to an actual file (e.g. /web/, which is a directory). Slim 3
//    derives the app's base path from SCRIPT_NAME, so an unstable value
//    causes routes like "/" and "/web/" to be confused. Pin it to
//    /index.php so Slim sees the real request path consistently.
//
// 2. The router script intercepts every request, including those for real
//    files on disk (e.g. the SPA's hashed JS/CSS bundles). Returning FALSE
//    tells the built-in server to serve the file as-is with the correct
//    MIME type.
if (PHP_SAPI === 'cli-server') {
    $_SERVER['SCRIPT_NAME'] = '/index.php';

    $requested = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . $requested;
    if ($requested !== '/' && is_file($file)) {
        return false;
    }
}

require 'vendor/autoload.php';

Session::getInstance();
Database::getInstance();

$config['displayErrorDetails'] = true;
$config['addContentLengthHeader'] = false;
$config['debug'] = true;

$app = new \Slim\App(array('settings' => $config));

$container = $app->getContainer();

$container['db'] = function() {
  return Database::getInstance()->getConn();
};

$container['errorHandler'] = function ($c) {
    return function ($request, $response, $exception) use ($c) {
        return $response->withStatus(500)
            ->withHeader('Content-Type', 'application/json')
            ->withJson(['status' => 'failed', 'message' => $exception->getMessage()]);
    };
};

$app->add(function (Request $request, Response $response, $next) {
  $path = $request->getUri()->getPath();
  if (substr($path, 0, 4) === 'api/' && $path !== 'api/login' && !Session::getInstance()->hasLoggedInUser()) {
    return $response->withStatus(401)
        ->withHeader('Content-Type', 'application/json')
        ->withJson(['status' => 'failed', 'message' => 'Unauthorized']);
  }
  return $next($request, $response);
});

$app->get('/api/logout', function (Request $request, Response $response) {
  Session::getInstance()->destroy();
  return $response->withRedirect('/');
});

// API routes
(new \App\Api\AuthenticationRouter())->loadRoutes($app);
(new \App\Api\PlayerRouter())->loadRoutes($app);
(new \App\Api\UserRouter())->loadRoutes($app);
(new \App\Api\EventRouter())->loadRoutes($app);
(new \App\Api\AdminRouter())->loadRoutes($app);

// Root: redirect to the SPA shell
$app->get('/', function (Request $request, Response $response) {
  return $response->withRedirect('/web/');
});

// Single Page App: serve the built shell for any /web[/...] URL that the
// web server / built-in server didn't already resolve to a static file.
// MUST be registered last so it doesn't shadow the API routes above.
$serveSpa = function (Request $request, Response $response) {
  $path = __DIR__ . '/web/index.html';
  if (!is_file($path)) {
    return $response->withStatus(503)
      ->withHeader('Content-Type', 'text/plain; charset=utf-8')
      ->write("LGM Sports SPA bundle not found.\n\nRun `cd frontend && npm run build` to generate web/.\n");
  }
  $body = file_get_contents($path);
  $response->getBody()->write($body);
  return $response
    ->withHeader('Content-Type', 'text/html; charset=utf-8')
    ->withHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
};

$app->get('/web', $serveSpa);
$app->get('/web/', $serveSpa);
$app->get('/web/{path:.*}', $serveSpa);

$app->run();
