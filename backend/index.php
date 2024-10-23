<?php
require_once 'Signaling.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$signaling = new Signaling();

// SDP登録
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo $signaling->store($data);
}

// SDP取得
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo $signaling->read($_GET);
}
