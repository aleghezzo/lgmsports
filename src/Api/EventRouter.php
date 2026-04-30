<?php

namespace App\Api;

use \App\Session as Session;
use \App\Database as Database;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class EventRouter implements Router {
  function loadRoutes(\Slim\App $app) {

    $app->get('/api/events', function (Request $request, Response $response) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $status = $request->getParam('status');
      // pageSize is the canonical name; `amount` kept as a backward-compat alias.
      $pageSize = $request->getParam('pageSize');
      if ($pageSize === null || $pageSize === '') {
        $pageSize = $request->getParam('amount');
      }
      $pageSize = (int) ($pageSize ?: 10);

      $page = max(1, (int) ($request->getParam('page') ?: 1));
      $offset = ($page - 1) * $pageSize;

      $from = $request->getParam('from');
      $to = $request->getParam('to');

      $events = \App\Model\Game::getAllByStatus($status, $pageSize, $offset, $from, $to);
      $total = \App\Model\Game::countByStatus($status, $from, $to);

      return $response
        ->withHeader('X-Total-Count', (string) $total)
        ->withHeader('Access-Control-Expose-Headers', 'X-Total-Count')
        ->withJson($events);
    });

    $app->get('/api/events/{id}', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['id']);
      return $response->withJson($event);
    });

    $app->post('/api/events', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::create($request->getParam('date') . ' ' . $request->getParam('time'), $request->getParam('typeId'), '');
      if($event) {
          return $response->withJson($event);
      }
      throw new \Exception("Cannot create event");
    });

    $app->put('/api/events/{eventId}', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['eventId']);
      if ($event) {
        $event->putStatus($request->getParam('status'));
      }
      return $response->withJson($event);
    });

    $app->delete('/api/events/{eventId}', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['eventId']);
      if ($event) {
        $event->delete();
      }
      return $response->withJson([]);
    });

    $app->post('/api/events/{eventId}/players', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['eventId']);
      $playerId = $request->getParam('id');
      if (!$playerId && $request->getParam('nickName') && $request->getParam('genderId')) {
        $nickName = $request->getParam('nickName');
        $genderId = $request->getParam('genderId');
        // Default skill for ad-hoc "external" players: id 3 ("I know what a
        // ball is") — admins later set the real skill from the admin page.
        $defaultSkillId = 3;
        $player = \App\Model\Player::getByNickNameAndGenderId($nickName, $genderId);
        if (!$player) {
          $player = \App\Model\Player::create($nickName, $genderId, $defaultSkillId);
        }
        $playerId = $player ? $player->getId() : null;
      }
      if ($playerId) {
        $event->addPlayer($playerId);
      }
      return $response->withJson($event);
    });

    $app->put('/api/events/{eventId}/players/{playerId}', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['eventId']);
      if ($event) {
        $team = $event->getTeam($request->getParam('teamId'));
        \App\Model\Team::transferPlayerWithId($args['playerId'], $request->getParam('teamId'), $args['eventId']);
      }
      return $response->withJson($event);
    });

    $app->delete('/api/events/{eventId}/players/{playerId}', function (Request $request, Response $response, $args) {
      if (!Session::getInstance()->hasLoggedInUser()) {
        return $response->withStatus(401);
      }
      $event = \App\Model\Game::getById($args['eventId']);
      $event->removePlayer($args['playerId']);
      return $response->withJson($event);
    });

  }
}
