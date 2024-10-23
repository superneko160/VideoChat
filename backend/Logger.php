<?php
declare(strict_types=1);

/**
 * ロガー（デバッグ用）
 */
class Logger {
    /**
     * ログファイルに変数または配列の中身を書き出す
     * @param string $logPath データを書き込むファイルのパス（初期値：debug.log）
     * @param mixed $data ファイルに書き込むデータ（初期値：The data to be verified is not set.）
     * @param string $mode ファイルの書き込みモード（初期値：w（上書きモード））
     * @return void
     */
    public static function dumpLog(string $logPath = "debug.log", mixed $data = "The data to be verified is not set.", string $mode = "w"): void {
        try {
            self::validateFileExtension($logPath);
            $data = self::formatData($data);
            self::writeToFile($logPath, $data, $mode);
        }
        catch (Exception $e) {
            throw new Exception($e->getMessage());
        }
    }

    /**
     * ファイルにデータを書き込む
     * @param string $logPath データを書き込むファイルのパス
     * @param string $data ファイルに書き込むデータ（初期値：The data to be verified is not set.）
     * @param string $mode ファイルの書き込みモード（初期値：w（上書きモード））
     * @return void
     */
    public static function writeToFile(string $logPath, string $data = "The data to be verified is not set.", string $mode = "w"): void {
        $fileHandle = fopen($logPath, $mode);

        if ($fileHandle === false) {
            throw new Exception("Failed to open the file: {$logPath}");
        }

        fwrite($fileHandle, $data . PHP_EOL);
        fclose($fileHandle);
    }

    /**
     * ファイルの拡張子が .txt または .log であることを確認する
     * @param string $logPath データを書き込むファイルのパス
     * @return void
     * @throws Exception
     */
    private static function validateFileExtension(string $logPath): void {
        $ext = pathinfo($logPath, PATHINFO_EXTENSION);
        if (!in_array($ext, ['txt', 'log'])) {
            throw new Exception("File extension should be txt or log.");
        }
    }

    /**
     * データを適切な文字列に変換する
     * @param mixed $data ファイルに書き込むデータ
     * @return string
     */
    private static function formatData(mixed $data): string {
        if (is_null($data)) {
            return "Null";
        }

        if (is_bool($data)) {
            return $data ? "True" : "False";
        }

        if (is_array($data)) {
            return implode(PHP_EOL, $data);
        }

        if (is_object($data)) {
            return var_export($data, true);
        }

        return (string)$data;
    }
}
