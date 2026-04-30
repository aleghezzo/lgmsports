<?php

namespace App\Api;

use \App\Session as Session;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class AdminRouter implements Router {

	const ROLE_ADMIN = 2;

	function loadRoutes(\Slim\App $app) {

	$app->get('/api/admins/users', function (Request $request, Response $response) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		return $response->withJson(\App\Model\Admin::listUsers());
	});

	$app->get('/api/admins/players', function (Request $request, Response $response) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		return $response->withJson(\App\Model\Admin::listPlayers());
	});

	$app->put('/api/admins/users/{id}/role', function (Request $request, Response $response, $args) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		$caller = Session::getInstance()->getLoggedUser();
		try {
			$summary = \App\Model\Admin::updateUserRole(
				(int) $args['id'],
				(int) $request->getParam('roleId'),
				$caller ? (int) $caller->getId() : null
			);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	$app->post('/api/admins/players/merge', function (Request $request, Response $response) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		$targetId = (int) $request->getParam('targetId');
		$sourceIds = self::parseIdList($request->getParam('sourceIds'));
		try {
			$summary = \App\Model\Admin::mergePlayers($targetId, $sourceIds);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	$app->post('/api/admins/users/merge', function (Request $request, Response $response) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		$targetId = (int) $request->getParam('targetId');
		$sourceIds = self::parseIdList($request->getParam('sourceIds'));
		try {
			$summary = \App\Model\Admin::mergeUsers($targetId, $sourceIds);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	$app->delete('/api/admins/players/{id}', function (Request $request, Response $response, $args) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		try {
			$summary = \App\Model\Admin::deletePlayerCompletely((int) $args['id']);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	$app->put('/api/admins/players/{id}', function (Request $request, Response $response, $args) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		try {
			$summary = \App\Model\Admin::updatePlayerNickName(
				(int) $args['id'],
				$request->getParam('nickName')
			);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	$app->delete('/api/admins/users/{id}', function (Request $request, Response $response, $args) {
		if (!self::guardAdmin()) {
			return $response->withStatus(403)->withJson(['status' => 'failed', 'message' => 'Forbidden']);
		}
		try {
			$summary = \App\Model\Admin::deleteUserCompletely((int) $args['id']);
		} catch (\InvalidArgumentException $e) {
			return $response->withStatus(400)->withJson(['status' => 'failed', 'message' => $e->getMessage()]);
		}
		return $response->withJson(['status' => 'success', 'message' => $summary]);
	});

	}

	private static function guardAdmin() {
		if (!Session::getInstance()->hasLoggedInUser()) {
			return false;
		}
		$user = Session::getInstance()->getLoggedUser();
		return $user && (int) $user->getRoleId() === self::ROLE_ADMIN;
	}

	/**
	 * Accepts "1,2,3" (the form-encoded shape produced by URLSearchParams when
	 * an Array is passed as a body value) or arrays from `getParam`. Returns
	 * a deduplicated list of positive ints.
	 */
	private static function parseIdList($raw) {
		if (is_array($raw)) {
			$parts = $raw;
		} elseif (is_string($raw) && $raw !== '') {
			$parts = explode(',', $raw);
		} else {
			$parts = [];
		}
		$ids = [];
		foreach ($parts as $p) {
			$n = (int) trim((string) $p);
			if ($n > 0) {
				$ids[$n] = true;
			}
		}
		return array_keys($ids);
	}
}
