<?php

namespace App\Api;

use \App\Session as Session;
use \App\Database as Database;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class UserRouter implements Router {
  function loadRoutes(\Slim\App $app) {

    $app->get('/api/user', function (Request $request, Response $response) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      if($user = \App\Model\User::getById(Session::getInstance()->userId)) {
        return $response->withJson([
          "id" => (int) $user->getId(),
          "username" => $user->getUserName(),
          "roleId" => (int) $user->getRoleId(),
          "playerId" => (int) $user->getPlayerId()
        ]);
      }
      throw new \Exception("Missing user, please sign in again", 1);
    });

  }
}
