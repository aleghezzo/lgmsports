<?php
namespace App\Model;

class Admin extends PersistentEntity {

    const ROLE_PLAYER = 1;
    const ROLE_ADMIN  = 2;

    /** Admin "Users" tab data: user joined to its player + pickPlayer count. */
    public static function listUsers() {
        $sql = "SELECT u.id, u.userName, u.roleId, r.name AS roleName,
                       u.playerId, p.nickName, p.genderId, u.lastLogin,
                       COALESCE(picks.cnt, 0) AS picksCount
                FROM user u
                JOIN player p ON p.id = u.playerId
                JOIN role r ON r.id = u.roleId
                LEFT JOIN (SELECT playerId, COUNT(*) AS cnt FROM pickPlayer GROUP BY playerId) picks
                  ON picks.playerId = u.playerId
                ORDER BY u.userName ASC";
        $rows = self::query($sql)->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id'         => (int) $r['id'],
                'userName'   => $r['userName'],
                'roleId'     => (int) $r['roleId'],
                'roleName'   => $r['roleName'],
                'playerId'   => (int) $r['playerId'],
                'nickName'   => $r['nickName'],
                'genderId'   => self::intOrNull($r['genderId']),
                'lastLogin'  => $r['lastLogin'],
                'picksCount' => (int) $r['picksCount'],
            ];
        }
        return $out;
    }

    /** Admin "Players" tab data: every player + (optional) linked user + pick count. */
    public static function listPlayers() {
        $sql = "SELECT p.id, p.nickName, p.genderId, p.hasInmunity, p.levelId,
                       u.id AS userId, u.userName,
                       COALESCE(picks.cnt, 0) AS picksCount
                FROM player p
                LEFT JOIN user u ON u.playerId = p.id
                LEFT JOIN (SELECT playerId, COUNT(*) AS cnt FROM pickPlayer GROUP BY playerId) picks
                  ON picks.playerId = p.id
                ORDER BY p.nickName ASC, p.id ASC";
        $rows = self::query($sql)->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id'          => (int) $r['id'],
                'nickName'    => $r['nickName'],
                'genderId'    => self::intOrNull($r['genderId']),
                'hasInmunity' => (int) $r['hasInmunity'] ? 1 : 0,
                'levelId'     => self::intOrNull($r['levelId']),
                'userId'      => self::intOrNull($r['userId']),
                'userName'    => $r['userName'],
                'picksCount'  => (int) $r['picksCount'],
            ];
        }
        return $out;
    }

    /**
     * Promote/demote a user. Refuses to demote the last admin (so we never
     * leave the system without anyone who can reach this page) and refuses
     * to demote oneself (the caller would lock themself out).
     *
     * @param int  $userId        user being modified
     * @param int  $roleId        new role (1 = player, 2 = admin)
     * @param ?int $callerUserId  the logged-in admin's user id (for self-demote check)
     */
    public static function updateUserRole($userId, $roleId, $callerUserId = null) {
        $userId = (int) $userId;
        $roleId = (int) $roleId;
        if (!$userId) {
            throw new \InvalidArgumentException('Missing user id');
        }
        if ($roleId !== self::ROLE_PLAYER && $roleId !== self::ROLE_ADMIN) {
            throw new \InvalidArgumentException('Invalid role');
        }

        $pdo = \App\Database::getInstance()->getConn();

        $stmt = $pdo->prepare('SELECT id, userName, roleId FROM user WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) {
            throw new \InvalidArgumentException('User not found');
        }

        $current = (int) $user['roleId'];
        if ($current === $roleId) {
            return [
                'id' => $userId,
                'userName' => $user['userName'],
                'roleId' => $current,
                'changed' => false,
            ];
        }

        // Self-demote guard: callers can't kick themselves out of admin.
        if (
            $roleId === self::ROLE_PLAYER
            && $callerUserId !== null
            && (int) $callerUserId === $userId
        ) {
            throw new \InvalidArgumentException(
                'You cannot remove your own admin role; ask another admin to do it.'
            );
        }

        // Last-admin guard: refuse to demote the only remaining admin.
        if ($roleId === self::ROLE_PLAYER && $current === self::ROLE_ADMIN) {
            $cnt = (int) $pdo->query(
                'SELECT COUNT(*) FROM user WHERE roleId = ' . self::ROLE_ADMIN
            )->fetchColumn();
            if ($cnt <= 1) {
                throw new \InvalidArgumentException(
                    'Cannot remove the last admin; promote someone else first.'
                );
            }
        }

        $upd = $pdo->prepare('UPDATE user SET roleId = ? WHERE id = ?');
        $upd->execute([$roleId, $userId]);

        return [
            'id' => $userId,
            'userName' => $user['userName'],
            'roleId' => $roleId,
            'changed' => true,
        ];
    }

    /**
     * Merge one or more source players into a target player.
     *
     * Behaviour matches the rules confirmed for the admin UI:
     *   - 2 players, neither has a user: re-point picks, delete source.
     *   - 1 player has a user, other doesn't: the user-linked one wins. The
     *     caller passes whichever it likes as target; if it picks the
     *     no-user one, this method auto-promotes the user-linked source.
     *   - Multiple players have users: target *must* be one of them.
     *     pickPlayer references on every source migrate to the chosen
     *     target; users tied to source players are deleted.
     *
     * Pick collisions on (gameId, target) are resolved by dropping the
     * source row (target's row is preserved).
     *
     * @return array summary { targetId, sourceIds, picksMoved, picksDropped, usersDeleted, playersDeleted }
     * @throws \InvalidArgumentException for bad input
     * @throws \Exception for SQL failures (transaction rolled back)
     */
    public static function mergePlayers($targetId, array $sourceIds) {
        $targetId = (int) $targetId;
        $sourceIds = self::cleanIdList($sourceIds);
        $sourceIds = array_values(array_filter($sourceIds, function ($id) use ($targetId) {
            return $id !== $targetId;
        }));
        if (!$targetId) {
            throw new \InvalidArgumentException('Missing target player id');
        }
        if (count($sourceIds) === 0) {
            throw new \InvalidArgumentException('Pick at least one source player to merge');
        }

        $allIds = array_merge([$targetId], $sourceIds);
        $existing = self::fetchPlayerIds($allIds);
        if (count($existing) !== count($allIds)) {
            throw new \InvalidArgumentException('One or more selected players do not exist');
        }

        $effective = self::resolvePlayerMergeTarget($targetId, $sourceIds);
        return self::doMergePlayers($effective['target'], $effective['sources']);
    }

    /**
     * Merge one or more source users into a target user. The associated
     * players are merged at the same time (the caller picks the target user;
     * its player implicitly becomes the canonical player for the merge).
     */
    public static function mergeUsers($targetId, array $sourceIds) {
        $targetId = (int) $targetId;
        $sourceIds = self::cleanIdList($sourceIds);
        $sourceIds = array_values(array_filter($sourceIds, function ($id) use ($targetId) {
            return $id !== $targetId;
        }));
        if (!$targetId) {
            throw new \InvalidArgumentException('Missing target user id');
        }
        if (count($sourceIds) === 0) {
            throw new \InvalidArgumentException('Pick at least one source user to merge');
        }

        $userRows = self::fetchUsers(array_merge([$targetId], $sourceIds));
        if (count($userRows) !== count($sourceIds) + 1) {
            throw new \InvalidArgumentException('One or more selected users do not exist');
        }

        $byId = [];
        foreach ($userRows as $row) {
            $byId[(int) $row['id']] = (int) $row['playerId'];
        }
        $targetPlayerId = $byId[$targetId];
        $sourcePlayerIds = [];
        foreach ($sourceIds as $sid) {
            $pid = $byId[$sid];
            if ($pid !== $targetPlayerId) {
                $sourcePlayerIds[$pid] = true;
            }
        }
        $sourcePlayerIds = array_keys($sourcePlayerIds);

        $pdo = \App\Database::getInstance()->getConn();
        $pdo->beginTransaction();
        try {
            // Drop the source user rows first so the player merge below can
            // safely delete the source player rows without leaving dangling
            // user.playerId references.
            self::execIn($pdo, 'DELETE FROM user WHERE id IN', $sourceIds);

            $playerSummary = ['picksMoved' => 0, 'picksDropped' => 0, 'usersDeleted' => 0, 'playersDeleted' => 0];
            if (count($sourcePlayerIds) > 0) {
                $playerSummary = self::executeMergePlayersInsideTxn($pdo, $targetPlayerId, $sourcePlayerIds);
            }
            $pdo->commit();
            return [
                'targetId' => $targetId,
                'sourceIds' => $sourceIds,
                'usersDeleted' => count($sourceIds) + $playerSummary['usersDeleted'],
                'playersDeleted' => $playerSummary['playersDeleted'],
                'picksMoved' => $playerSummary['picksMoved'],
                'picksDropped' => $playerSummary['picksDropped'],
            ];
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private static function doMergePlayers($targetId, array $sourceIds) {
        $pdo = \App\Database::getInstance()->getConn();
        $pdo->beginTransaction();
        try {
            $summary = self::executeMergePlayersInsideTxn($pdo, $targetId, $sourceIds);
            $pdo->commit();
            return [
                'targetId' => $targetId,
                'sourceIds' => $sourceIds,
                'picksMoved' => $summary['picksMoved'],
                'picksDropped' => $summary['picksDropped'],
                'usersDeleted' => $summary['usersDeleted'],
                'playersDeleted' => $summary['playersDeleted'],
            ];
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Hard-delete a player and any users tied to it. Refuses if the player
     * has any pickPlayer references — the admin must merge first. Both
     * "delete user" and "delete player" routes converge here because the
     * user/player relationship is 1-to-1 in practice.
     *
     * @return array { playerId, usersDeleted, playersDeleted }
     */
    public static function deletePlayerCompletely($playerId) {
        $playerId = (int) $playerId;
        if (!$playerId) {
            throw new \InvalidArgumentException('Missing player id');
        }
        $pdo = \App\Database::getInstance()->getConn();

        $stmt = $pdo->prepare('SELECT id FROM player WHERE id = ?');
        $stmt->execute([$playerId]);
        if (!$stmt->fetch()) {
            throw new \InvalidArgumentException('Player not found');
        }

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM pickPlayer WHERE playerId = ?');
        $stmt->execute([$playerId]);
        $picks = (int) $stmt->fetchColumn();
        if ($picks > 0) {
            throw new \InvalidArgumentException(
                "Player has $picks pick(s); merge or remove from games before deleting."
            );
        }

        $pdo->beginTransaction();
        try {
            $delUsers = $pdo->prepare('DELETE FROM user WHERE playerId = ?');
            $delUsers->execute([$playerId]);
            $usersDeleted = $delUsers->rowCount();

            $delPlayer = $pdo->prepare('DELETE FROM player WHERE id = ?');
            $delPlayer->execute([$playerId]);
            $playersDeleted = $delPlayer->rowCount();

            $pdo->commit();
            return [
                'playerId' => $playerId,
                'usersDeleted' => $usersDeleted,
                'playersDeleted' => $playersDeleted,
            ];
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Rename a player. Mirrors `Player::create`'s uniqueness rule: no two
     * players are allowed to share the same (nickName, genderId) pair. The
     * admin can merge before renaming if they hit a duplicate.
     *
     * @return array { id, nickName, genderId }
     */
    public static function updatePlayerNickName($playerId, $nickName) {
        $playerId = (int) $playerId;
        $nickName = is_string($nickName) ? trim($nickName) : '';
        if (!$playerId) {
            throw new \InvalidArgumentException('Missing player id');
        }
        if ($nickName === '') {
            throw new \InvalidArgumentException('NickName cannot be empty');
        }
        if (mb_strlen($nickName) > 191) {
            throw new \InvalidArgumentException('NickName must be at most 191 characters');
        }

        $pdo = \App\Database::getInstance()->getConn();

        $stmt = $pdo->prepare('SELECT id, nickName, genderId FROM player WHERE id = ?');
        $stmt->execute([$playerId]);
        $player = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$player) {
            throw new \InvalidArgumentException('Player not found');
        }

        // Uniqueness scoped to the same gender, same as Player::create.
        $genderId = $player['genderId'];
        if ($genderId !== null && $genderId !== '') {
            $dup = $pdo->prepare(
                'SELECT id FROM player WHERE nickName = ? AND genderId = ? AND id <> ? LIMIT 1'
            );
            $dup->execute([$nickName, $genderId, $playerId]);
            if ($dup->fetch()) {
                throw new \InvalidArgumentException(
                    "Another player with nickName \"$nickName\" already exists for that gender; merge them first."
                );
            }
        }

        $upd = $pdo->prepare('UPDATE player SET nickName = ? WHERE id = ?');
        $upd->execute([$nickName, $playerId]);

        return [
            'id' => $playerId,
            'nickName' => $nickName,
            'genderId' => self::intOrNull($genderId),
        ];
    }

    /** Convenience: delete the user *and* its player. Same eligibility check. */
    public static function deleteUserCompletely($userId) {
        $userId = (int) $userId;
        if (!$userId) {
            throw new \InvalidArgumentException('Missing user id');
        }
        $pdo = \App\Database::getInstance()->getConn();
        $stmt = $pdo->prepare('SELECT playerId FROM user WHERE id = ?');
        $stmt->execute([$userId]);
        $playerId = $stmt->fetchColumn();
        if ($playerId === false) {
            throw new \InvalidArgumentException('User not found');
        }
        return self::deletePlayerCompletely((int) $playerId);
    }

    /**
     * Core player-merge work that runs inside a caller-controlled transaction.
     * Migrates pickPlayer rows, removes source-tied users, deletes source players.
     */
    private static function executeMergePlayersInsideTxn(\PDO $pdo, $targetId, array $sourceIds) {
        $picksMoved = 0;
        $picksDropped = 0;

        // Process sources one at a time so collisions against the target *or*
        // earlier sources (which by now have been re-pointed to the target)
        // are detected naturally each time.
        foreach ($sourceIds as $sourceId) {
            $del = $pdo->prepare(
                'DELETE pp1 FROM pickPlayer pp1
                 JOIN pickPlayer pp2 ON pp2.gameId = pp1.gameId AND pp2.playerId = ?
                 WHERE pp1.playerId = ?'
            );
            $del->execute([$targetId, $sourceId]);
            $picksDropped += $del->rowCount();

            $upd = $pdo->prepare('UPDATE pickPlayer SET playerId = ? WHERE playerId = ?');
            $upd->execute([$targetId, $sourceId]);
            $picksMoved += $upd->rowCount();
        }

        // Delete users that pointed at any source player.
        $usersDeleted = self::execIn($pdo, 'DELETE FROM user WHERE playerId IN', $sourceIds);

        // Finally drop the source players themselves.
        $playersDeleted = self::execIn($pdo, 'DELETE FROM player WHERE id IN', $sourceIds);

        return [
            'picksMoved' => $picksMoved,
            'picksDropped' => $picksDropped,
            'usersDeleted' => $usersDeleted,
            'playersDeleted' => $playersDeleted,
        ];
    }

    /**
     * If the caller picked a user-less player as target while one of the
     * sources has a user, swap them so the user-linked player wins. If
     * multiple selected players have users, the chosen target *must* be one
     * of them (otherwise we'd silently pick a user to delete).
     */
    private static function resolvePlayerMergeTarget($targetId, array $sourceIds) {
        $allIds = array_merge([$targetId], $sourceIds);
        $usersByPlayer = self::usersGroupedByPlayer($allIds);

        $playersWithUsers = array_keys($usersByPlayer);
        $targetHasUser = in_array($targetId, $playersWithUsers, true);

        if (count($playersWithUsers) <= 1) {
            // Trivial: at most one user-linked player. Make sure it wins.
            if (!$targetHasUser && count($playersWithUsers) === 1) {
                $newTarget = $playersWithUsers[0];
                $sources = array_values(array_filter($allIds, function ($id) use ($newTarget) {
                    return $id !== $newTarget;
                }));
                return ['target' => $newTarget, 'sources' => $sources];
            }
            return ['target' => $targetId, 'sources' => $sourceIds];
        }

        if (!$targetHasUser) {
            throw new \InvalidArgumentException(
                'Several selected players have user accounts; pick a player-with-user as target so we know which user to keep.'
            );
        }
        return ['target' => $targetId, 'sources' => $sourceIds];
    }

    private static function fetchPlayerIds(array $ids) {
        $stmt = self::executeIn(\App\Database::getInstance()->getConn(), 'SELECT id FROM player WHERE id IN', $ids);
        $found = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $found[(int) $r['id']] = true;
        }
        return array_keys($found);
    }

    private static function fetchUsers(array $ids) {
        $stmt = self::executeIn(\App\Database::getInstance()->getConn(), 'SELECT id, playerId FROM user WHERE id IN', $ids);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** Returns [playerId => [userId, ...]] for any selected player that has at least one user row. */
    private static function usersGroupedByPlayer(array $playerIds) {
        $stmt = self::executeIn(\App\Database::getInstance()->getConn(), 'SELECT id, playerId FROM user WHERE playerId IN', $playerIds);
        $out = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $pid = (int) $r['playerId'];
            $out[$pid][] = (int) $r['id'];
        }
        return $out;
    }

    /** Build & execute "<sql> (?, ?, ...)" for a non-empty int list. */
    private static function executeIn(\PDO $pdo, $sqlPrefix, array $ids) {
        if (count($ids) === 0) {
            // Statement that returns/affects nothing.
            $stmt = $pdo->prepare('SELECT 1 WHERE 1=0');
            $stmt->execute();
            return $stmt;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("$sqlPrefix ($placeholders)");
        $stmt->execute(array_values(array_map('intval', $ids)));
        return $stmt;
    }

    private static function execIn(\PDO $pdo, $sqlPrefix, array $ids) {
        return self::executeIn($pdo, $sqlPrefix, $ids)->rowCount();
    }

    private static function cleanIdList(array $ids) {
        $clean = [];
        foreach ($ids as $id) {
            $n = (int) $id;
            if ($n > 0) {
                $clean[$n] = true;
            }
        }
        return array_keys($clean);
    }

}
