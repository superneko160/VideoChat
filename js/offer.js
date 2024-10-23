'use strict';

const SINGNALING_SERVER = 'http://localhost/VideoChat/backend/index.php';

// HTML要素
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callButton = document.getElementById('call-button');

let localMediaStream;
let remoteMediaStream;
const iceCandidates = [];  // ローカル側のICE Candidateの一覧
let lastMessageId = 0

// WebRTCのコネクションオブジェクトを作成
const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
// ローカル側のカメラ起動
initLocalCamera();

/**
 * ローカル側のカメラ起動
 */
async function initLocalCamera() {
    try {
        // ローカル側のビデオストリームを取得
        localMediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localMediaStream;
        // ローカル側のビデオストリームを設定
        localMediaStream.getTracks().forEach((track) => peer.addTrack(track, localMediaStream));
    } catch (error) {
        console.error('デバイスへのアクセスに失敗: ', error);
    }
}

/**
 * Callボタン押下時（Offer SDPの作成）
 */
callButton.addEventListener('click', async () => {
    // Offer SDPを作成
    const sessionDescription = await peer.createOffer();
    // ローカル側のOffer SDPを設定
    await peer.setLocalDescription(sessionDescription);
    // DBにOffer SDP登録
    sendMessage(sessionDescription);
    // ポーリング開始
    pollMessages();
});

/**
 * ICE Candidate生成
 */
peer.addEventListener('icecandidate', (event) => {
    if (event.candidate === null) return;
    // ローカル側のIce Candidateを追加
    iceCandidates.push(event.candidate);
});

/**
 * Trackを取得時
 */
peer.addEventListener('track', (event) => {
    // リモート側のカメラ起動
    remoteVideo.srcObject = event.streams[0];
});

/**
 * SDP or ICE Candidate送信
 * @param {string} message SDP or ICE Candidate
 */
function sendMessage(message) {
    try {
        fetch(SINGNALING_SERVER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender: 'user1',  // 決め打ち
                receiver: 'user2',  // 決め打ち
                message: JSON.stringify(message)
            }),
        });
    } catch (error) {
        console.error(error);
    }
}

/**
 * ポーリング（SDP）
 * 1秒間隔でデータ取得（GET）
 */
function pollMessages() {
    fetch(`${SINGNALING_SERVER}?receiver=user1&last_id=${lastMessageId}`)
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                result.data.forEach(message => {
                    const {type, payload} = JSON.parse(message.message);
                    handleMessage(type, JSON.parse(message.message));
                    lastMessageId = message.id;
                });
            }
            // 待機状態
            else if (result.status === 'empty') {
                // console.log(result.message);

                // TODO:必要に応じて、ユーザーに「接続中」と表示するなどの処理を追加

                setTimeout(pollMessages, 1000);  // 1秒間隔で実行
            }
        })
        .catch(error => {
            console.error('Error polling messages:', error);
            setTimeout(pollMessages, 5000);  // エラー時は少し長めの間隔をとってから再取得
        });
}

/**
 * メッセージハンドリング
 * @param {string} type answer or candidate
 * @param {string} payload セットするデータ
 */
async function handleMessage(type, payload) {
    switch (type) {
        case 'answer':
            await peer.setRemoteDescription(payload);
            sendMessage(iceCandidates);  // ICE Candidate送信
            break;
        case 'candidate':
            await peer.addIceCandidate(payload);
            break;
    }
}
