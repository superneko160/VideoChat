<?php
require_once 'Signaling.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$signaling = new Signaling();

// SDP or ICE Candidate登録
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo $signaling->store($data);
}

// SDP or ICE Candidate取得
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo $signaling->read($_GET);
}

//  SDP or ICE Candidate削除
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));

    if (!empty($parts)) {
        $user = end($parts);

        if (!empty($user)) {
            echo $signaling->delete([
                'sender' => $user
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid user parameter']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'No user specified']);
    }
}
