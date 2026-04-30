<?php

namespace App\Api;

use \App\Session as Session;
use \App\Database as Database;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class PlayerRouter implements Router {
	function loadRoutes(\Slim\App $app) {

		$app->get('/api/players', function (Request $request, Response $response) {
			if (!Session::getInstance()->hasLoggedInUser()) {
				return $response->withStatus(401);
			}
			$search = (string) ($request->getParam('search') ?? '');
			$limit = (int) ($request->getParam('limit') ?? 10);
			return $response->withJson(\App\Model\Player::search($search, $limit));
		});

		$app->post('/api/players/{id}/inmunity', function (Request $request, Response $response, $args) {
			if (!Session::getInstance()->hasLoggedInUser()) {
				return $response->withStatus(401);
			}
			$user = \App\Session::getInstance()->getLoggedUser();
			if ($user->getRoleId() != 2) {
				return $response->withStatus(401);
			}

			$player = \App\Model\Player::updateInmunity($args['id'], 1);
			return $response->withJson($player);
		});

		$app->delete('/api/players/{id}/inmunity', function (Request $request, Response $response, $args) {
			if (!Session::getInstance()->hasLoggedInUser()) {
				return $response->withStatus(401);
			}
			$user = \App\Session::getInstance()->getLoggedUser();
			if ($user->getRoleId() != 2) {
				return $response->withStatus(401);
			}

			$player = \App\Model\Player::updateInmunity($args['id'], 0);
			return $response->withJson($player);
		});

		$app->post('/api/players/inmunity', function (Request $request, Response $response, $args) {
			if (!Session::getInstance()->hasLoggedInUser()) {
				return $response->withStatus(401);
			}
			$user = \App\Session::getInstance()->getLoggedUser();
			if ($user->getRoleId() != 2) {
				return $response->withStatus(401);
			}

			$player = \App\Model\Player::updateInmunityByNickName($request->getParam('nickName'), 1);
			return $response->withJson($player);
		});

		$app->get('/api/players/inmunity', function (Request $request, Response $response, $args) {
			if (!Session::getInstance()->hasLoggedInUser()) {
				return $response->withStatus(401);
			}
			$user = \App\Session::getInstance()->getLoggedUser();
			if ($user->getRoleId() != 2) {
				return $response->withJson([]);
			}

			return $response->withJson(\App\Model\Player::getAllWithInmunity());
		});

	}
}
