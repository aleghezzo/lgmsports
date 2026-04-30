<?php

namespace App\Model;

class Game extends PersistentEntity implements Seriarizable {

    private $id;
    private $date;
    private $type;
    private $status;
    private $teams;
    private $teamless;
    private $doodleUrl;

    function __construct($id, $date, $type, $status, $doodleUrl) {
        $this->id = $id;
        $this->date = $date;
        $this->type = $type;
        $this->status = $status;
        $this->doodleUrl = $doodleUrl;
        $this->teams = new SerializableCollection();
        $this->teamless = new SerializableCollection();
    }

    public function jsonSerialize() {
        return [
            "id" => (int) $this->id,
            "date" => $this->date,
            "type" => $this->type->jsonSerialize(),
            "status" => (int) $this->status,
            "teams" => $this->teams->jsonSerialize(),
            "teamless" => $this->teamless->jsonSerialize()
        ];
    }

    public static function create($date, $typeId, $doodleUrl) {
        $gameInfo = GameType::getById($typeId);
        if($gameInfo) {
            try {
              self::queryWithParameters("INSERT INTO game(date, typeId, doodleurl, status) VALUES(?, ?, ?, 0)", array($date, $typeId, $doodleUrl));
            } catch (\Exception $e) {
              throw new \Exception("There's alreay another game at that time", 1);
            }
            return Game::getById(self::lastInsertId());
        }
        return null;
    }

    /**
     * List games filtered by status, with optional date range, pagination
     * and sort direction. Past games (status=1) default to newest-first;
     * any other status defaults to oldest-first.
     *
     * @param int|string $status
     * @param int|null   $limit  page size (default 10, capped at 100)
     * @param int        $offset rows to skip
     * @param string|null $from  inclusive lower bound, YYYY-MM-DD
     * @param string|null $to    inclusive upper bound, YYYY-MM-DD
     */
    public static function getAllByStatus($status, $limit = 10, $offset = 0, $from = null, $to = null) {
        $limit = max(1, min(100, intval($limit ?: 10)));
        $offset = max(0, intval($offset));
        $sortDir = (intval($status) === 1) ? 'DESC' : 'ASC';

        list($where, $params) = self::buildStatusFilter($status, $from, $to);
        $sql = "SELECT id FROM game WHERE $where ORDER BY date $sortDir LIMIT $limit OFFSET $offset";

        $rows = self::queryWithParameters($sql, $params);
        $events = array();
        for($i = 0; $i < $rows->rowCount(); $i++) {
            $events[] = Game::getById($rows->fetch()['id']);
        }
        return $events;
    }

    /**
     * Number of games matching the same filters used by getAllByStatus,
     * ignoring pagination. Useful for X-Total-Count style responses.
     */
    public static function countByStatus($status, $from = null, $to = null) {
        list($where, $params) = self::buildStatusFilter($status, $from, $to);
        $row = self::queryWithParameters("SELECT COUNT(*) AS n FROM game WHERE $where", $params)->fetch();
        return intval($row['n']);
    }

    private static function buildStatusFilter($status, $from, $to) {
        $clauses = ['status = ?'];
        $params = [intval($status)];
        if ($from !== null && $from !== '') {
            $clauses[] = 'date >= ?';
            $params[] = $from . ' 00:00:00';
        }
        if ($to !== null && $to !== '') {
            $clauses[] = 'date <= ?';
            $params[] = $to . ' 23:59:59';
        }
        return [implode(' AND ', $clauses), $params];
    }

    public static function getById($id) {
        $dbGame = self::queryWithParameters("SELECT * FROM game WHERE id = ?", array(intval($id)));
        if($dbGame->rowCount() == 0){
            return null;
        } else {
            $dbGameRow = $dbGame->fetch();
            $gameType = GameType::getById($dbGameRow['typeId']);
            $game = new Game($dbGameRow['id'], $dbGameRow['date'], $gameType, $dbGameRow['status'], $dbGameRow['doodleurl']);
            $offset = 1;
            for ($i = 0; $i < $gameType->getTeamsAmount(); $i++) {
                if ($i == 4) {
                    $offset++;
                }
                $game->teams->add(Team::getById($id, $i + $offset));
            }

            $gamePlayers = self::getGameTeamless($id);
            if($gamePlayers != null) {
                for ($i = 0; $i < count($gamePlayers); $i++) {
                    $player = Player::getById($gamePlayers[$i]["playerId"]);
                    $game->teamless->add($player);
                }
            }

            $losersTeam = Team::getById($id, 5);
            if($losersTeam != null) {
                $players = $losersTeam->getPlayers();
                for ($i = 0; $i < $players->size(); $i++) {
                    $game->teamless->add($players->get($i));
                }
            }
            return $game;
        }
    }

    public static function getGameTeamless($id) {
      $dbPlayersInfo = self::queryWithParameters("SELECT playerId FROM pickPlayer WHERE gameId = ?  AND teamId IS NULL", array($id));
      if($dbPlayersInfo->rowCount() != 0) {
        return $dbPlayersInfo->fetchAll();
      }
      return null;
    }

    public function delete() {
        self::queryWithParameters("DELETE FROM pickPlayer WHERE gameId= ?", array($this->id));
        self::queryWithParameters("DELETE FROM game WHERE id = ?", array($this->id));
        return true;
    }


    public function addPlayer($playerId) { // Teamless
        $player = Player::getById($playerId);
        $dbPickPlayer = $this->queryWithParameters("SELECT * FROM pickPlayer WHERE gameId = ? AND playerId = ?", array($this->id, $playerId));
        if($dbPickPlayer->rowCount() != 0) {
            return null;
        } else {
            $this->queryWithParameters("INSERT INTO pickPlayer(gameId, playerId, timeStamp) VALUES(?, ?, NOW())", array($this->id, $playerId));
            $this->teamless->add($player);
            return $player;
        }
    }

    public function removePlayer($playerId) {
        $player = Player::getById($playerId);
        $dbPickPlayer = $this->queryWithParameters("SELECT * FROM pickPlayer WHERE gameId = ? AND playerId = ?", array($this->id, intval($playerId)));
        if($dbPickPlayer->rowCount() == 0) {
            return null;
        } else {
            $this->queryWithParameters("DELETE FROM pickPlayer WHERE gameId= ? AND playerId= ?", array($this->id, intval($playerId)));
            $this->teamless->remove($player);
            return $playerId;
        }
    }

    public function getTeams() {
        return $this->teams;
    }

    public function getTeam($teamId) {
        for ($i=0; $i < $this->teams->size(); $i++) {
            #echo "Comparing: ".$this->teams->get($i)->getId()." with ".$teamId;
            if($this->teams->get($i)->getId() == $teamId) {
                return $this->teams->get($i);
            }
        }
        return null;
    }

    public function putStatus($status) {
        $this->queryWithParameters("UPDATE game SET status=? WHERE id=?", array($status,$this->id));
        $this->status = $status;
        return $this;
    }
}
