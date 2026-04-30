<?php

namespace App\Model;

class PersistentEntity {

    protected static function sanitize($value) {
        return \App\Database::getInstance()->getConn()->quote($value);
    }

    protected static function lastInsertId() {
        return \App\Database::getInstance()->getConn()->lastInsertId();
    }

    protected static function query($query) {
        return \App\Database::getInstance()->getConn()->query($query);
    }

    protected static function queryWithParameters($query, $params) {
        $statement = \App\Database::getInstance()->getConn()->prepare($query);
        for ($i = 0; $i < count($params); $i++) {
            $statement->bindParam($i + 1, $params[$i]);
        }
        $statement->execute();
        return $statement;
    }

    protected static function queryErrorInfo() {
        return \App\Database::getInstance()->getConn()->errorInfo();
    }

    /**
     * PDO returns every column as a string. The SPA's TypeScript types
     * declare numeric ids/flags as `number`, and uses strict-equality (===)
     * comparisons all over the place. Coerce here, preserving NULL.
     */
    protected static function intOrNull($value) {
        if ($value === null || $value === '') {
            return null;
        }
        return (int) $value;
    }
}
