<?php
require_once 'CodeInfo.php';

class Database {
    /**
     * DBの取得
     * @return array DSN情報、DBユーザ名、DBパスワード
     */
    public static function connectDatabase(): PDO {
        try {
            $db_codes = CodeInfo::getDBCodes();
            return new PDO (
              $db_codes["DSN"],
              $db_codes["DB_USER"],
              $db_codes["DB_PASSWORD"]
            );
        }
        catch (PDOException $e) {
            die($e->getMessage());
        }
    }
}
