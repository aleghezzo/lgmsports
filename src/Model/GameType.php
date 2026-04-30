<?php

namespace App\Model;

class GameType extends PersistentEntity implements Seriarizable {
    private $id;
    private $name;
    private $teamsAmount;
    private $amountByGender;

    public function __construct($id, $teamsAmount, $amountByGender) {
        $this->id = $id;
        $this->name = $this->getName($id);
        $this->teamsAmount = $teamsAmount;
        $this->amountByGender = $amountByGender;
    }

    public static function getById($id) {
        $dbGameType = self::queryWithParameters('SELECT gameType.*, genderByGameType.genderId, genderByGameType.amount FROM gameType LEFT JOIN genderByGameType on gameTypeId=id WHERE id=?', array(intval($id)));
        if($dbGameType->rowCount() != 0) {
            $gameTypeData = $dbGameType->fetchAll();
            $amountByGender = [];
            foreach ($gameTypeData as $row) {
              $amountByGender[$row['genderId']] = $row['amount'];
            }
            return new GameType($gameTypeData[0]['id'], $gameTypeData[0]['teamsAmount'], $amountByGender);
        } else {
            return null;
        }
    }

    public function jsonSerialize() {
        $amountByGender = [];
        foreach ($this->amountByGender as $genderId => $amount) {
            $amountByGender[(string) $genderId] = (int) $amount;
        }
        return [
            "id" => (int) $this->id,
            "name" => $this->name,
            "teamsAmount" => (int) $this->teamsAmount,
            "amountByGender" => $amountByGender
        ];
    }

    public function getId() {
        return $this->id;
    }

    public function getTeamsAmount() {
        return $this->teamsAmount;
    }

    private function getName($id) {
      $namesById = [
        1 => "Fútbol 5 vs 5 (una cancha)",
        2 => "Fútbol 5 vs 5 (dos canchas)",
        10 => "Fútbol 5 vs 5 (tres canchas)",
        3 => "Tenis 1 vs 1",
        4 => "Tenis 2 vs 2"
      ];
      return $namesById[$id];
    }
}
