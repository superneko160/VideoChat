<?php

class CodeInfo {
    private const DSN = 'mysql:dbname=videochat;host=localhost;charset=utf8mb4';
    private const DB_USER = 'root';  // 開発用（本番は環境変数を利用）
    private const DB_PASSWORD = '';  // 開発用（本番は環境変数を利用）

    /**
     * DB設定情報の取得
     * @return array DSN情報、DBユーザ名、DBパスワード
     */
    public static function getDBCodes(): array {
        return [
            "DSN" => self::DSN,
            "DB_USER" => self::DB_USER,
            "DB_PASSWORD" => self::DB_PASSWORD
        ];
    }
}
