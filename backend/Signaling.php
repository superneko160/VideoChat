<?php
require_once 'Database.php';
require_once 'Logger.php';

class Signaling {

    private PDO $db;

    /**
     * DB接続
     */
    function __construct() {
        $this->db = Database::connectDatabase();
    }

    /**
     * SDP or ICE Candidate登録
     * @param array $data POSTデータ
     * @return string レスポンス
     */
    public function store(array $data) {
        try {
            $sql = 'INSERT INTO signaling_messages (sender, receiver, message) VALUES (:sender, :receiver, :message)';
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue('sender', $data['sender'], PDO::PARAM_STR);
            $stmt->bindValue('receiver', $data['receiver'], PDO::PARAM_STR);
            $stmt->bindValue('message', $data['message'], PDO::PARAM_STR);
            $result = $stmt->execute();
        } catch (PDOException $e) {
            Logger::dumpLog(
                './../log/error.log',
                date('Y/m/d H:i:s') . __CLASS__ . ':' . __METHOD__ . $e->getMessage(),
                'a'
            );
        }

        if ($result) {
            return json_encode(['status' => 'success', 'message' => 'Message sent']);
        } else {
            return json_encode(['status' => 'error', 'message' => 'Error: ' . $db->error]);
        }
    }

    /**
     * SDP or ICE Candidate取得
     * @param array $data GETデータ
     * @return string レスポンス
     */
    public function read(array $data) {
        $last_id = isset($data['last_id']) ? intval($data['last_id']) : 0;

        try {
            $sql = 'SELECT * FROM signaling_messages WHERE receiver = :receiver AND id > :last_id ORDER BY id ASC';
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue('receiver', $data['receiver'], PDO::PARAM_STR);
            $stmt->bindValue(':last_id', $last_id, PDO::PARAM_INT);
            $stmt->execute();
        } catch (PDOException $e) {
            Logger::dumpLog(
                './../log/error.log',
                date('Y/m/d H:i:s') . ' ' . __CLASS__ . ':' . __METHOD__ . ' ' . $e->getMessage(),
                'a'
            );
        }

        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($messages)) {
            return json_encode(['status' => 'success', 'data' => $messages]);
        } else {
            return json_encode(['status' => 'empty', 'message' => 'No new messages']);
        }
    }
}
