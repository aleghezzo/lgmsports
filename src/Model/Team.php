<?php

namespace App\Model;

class Team extends PersistentEntity implements Seriarizable {

    private $id;
    private $name;
    #private $size;
    private $players;

    function __construct($id, $name) {
        $this->id = $id;
        $this->name = $name;
        $this->players = new SerializableCollection();
    }

    public function jsonSerialize() {
        return [
            "id" => (int) $this->id,
            "name" => $this->name,
            "players" => $this->players->jsonSerialize(),
        ];
    }

    public static function createTeam($name,$size) {
        $dbTeam = self::queryWithParameters("SELECT * FROM team WHERE name = ? AND size = ?", array($name, $size));
        if ($dbTeam->rowCount() == 0) {
            self::queryWithParameters("INSERT INTO team (name, size) VALUES(?, ?)", array($name, $size));
        return(self::getTeam(self::lastInsertId()));
        } else {
            return null;
        }
    }

    public static function getById($gameId, $id) {
        $dbTeam = self::queryWithParameters("SELECT * FROM team WHERE id= ?",array($id));
        if ($dbTeam->rowCount() == 1) {
            $teamData = $dbTeam->fetch();
            $team = new Team($teamData["id"], $teamData["name"]);
            $team->loadPlayers($gameId);
            return $team;
        } else {
            return null;
        }
    }

    public static function deleteTeam($id) {
        self::queryWithParameters("DELETE FROM team WHERE id = ?", array($id));
    }

    public function getId() {
        return $this->id;
    }

    public function getPlayers() {
      return $this->players;
    }

    private function loadPlayers($gameId) {
        $dbTeam = $this->queryWithParameters("SELECT * FROM pickPlayer WHERE gameId = ? AND teamId = ?", array($gameId, $this->id));
        if ($dbTeam->rowCount() != 0) {
            for ($i=0; $i < $dbTeam->rowCount(); $i++) {
                $teamData = $dbTeam->fetch();
                $dbPlayer = $this->queryWithParameters("SELECT * FROM player WHERE id = ?", array($teamData["playerId"]));
                $playerData = $dbPlayer->fetch();
                $player = new Player($playerData["id"], $playerData["nickName"], $playerData["genderId"], $playerData["levelId"], $playerData["hasInmunity"]);
                $this->players->add($player);
            }
        } else {
            return null;
        }
    }

    public function putPlayer($playerId) {
        $player = Player::getPlayerById($playerId);
        $this->players->add($player);
        return $playerId;
    }

    public function removePlayer($teamId, $gameId, $playerId) {

    }

    public function transferPlayer($playerId,$gameId) {
        $player = Player::getById($playerId);
        self::queryWithParameters("UPDATE pickPlayer SET teamId=? WHERE playerId= ? AND gameId= ? ", array($this->getId(), $playerId, $gameId));
        $this->players->add($player);
        return array(["playerId" => $playerId, "gameId" => $gameId]);
    }

    public static function transferPlayerWithId($playerId, $teamId, $gameId) {
        $player = Player::getById($playerId);
        if ($teamId == null) {
            self::queryWithParameters("UPDATE pickPlayer SET teamId=NULL WHERE playerId= ? AND gameId= ? ", array($playerId, $gameId));
            return array(["playerId" => $playerId, "teamId" => $teamId, "gameId" => $gameId]);
        } else {
            self::queryWithParameters("UPDATE pickPlayer SET teamId=? WHERE playerId= ? AND gameId= ? ", array($teamId, $playerId, $gameId));
            return array(["playerId" => $playerId, "teamId" => $teamId, "gameId" => $gameId]);
        }

    }

}
