<?php

namespace App;

use \PDO;

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;

    static function getInstance() {
        static $instance = null;
        if ($instance === null) {
            $instance = new Database();
        }
        return $instance;
    }

    private function __construct() {
        // Defaults preserve the original local-dev setup (php -S + local
        // MySQL). Docker compose overrides these via DB_* env vars.
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->db_name = getenv('DB_NAME') ?: 'futbolmixto';
        $this->username = getenv('DB_USER') ?: 'dev';
        $envPassword = getenv('DB_PASSWORD');
        $this->password = $envPassword !== false ? $envPassword : '';

        $this->conn = new PDO('mysql:host=' . $this->host . ';dbname=' . $this->db_name, $this->username, $this->password);
        $this->conn->exec('SET NAMES UTF8');
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    function getConn() {
        return $this->conn;
    }
}
