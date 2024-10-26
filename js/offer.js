'use strict';

const SINGNALING_SERVER = 'http://localhost/VideoChat/backend/index.php';
const STUN_SERVER = 'stun:stun.l.google.com:19302';

// HTML要素
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callButton = document.getElementById('call-button');
const hungupButton = document.getElementById('hungup-button');

let localMediaStream;
let remoteMediaStream;
const iceCandidates = [];  // ローカル側のICE Candidateの一覧
let lastMessageId = 0;

// 起動時Hungupボタン無効化しておく
disableButton(hungupButton);

// WebRTCのコネクションオブジェクトを作成
let peer = createRTCPeerConnection();

// イベントリスナ設定
addIceCandidate();
addRemoteVideoStream();
// ローカル側のカメラ起動
initLocalCamera();

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
    // Callボタン無効化
    disableButton(callButton);
    // Hungupボタン有効化
    enableButton(hungupButton);
});

/**
 * Hungupボタン押下時
 */
hungupButton.addEventListener('click', async () => {
    try {
        // リモート側のメディアストリームの停止
        if (remoteMediaStream) {
            remoteMediaStream.getTracks().forEach(track => {
                track.stop();
            });
            remoteMediaStream = null;
        }

        // リモート側のビデオ要素のクリア
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }

        // ICE Candidateのクリア
        iceCandidates.length = 0;

        // RTCPeerConnectionの終了
        if (peer) {
            peer.close();

            peer = createRTCPeerConnection();

            // イベントリスナ再設定
            addIceCandidate();
            addRemoteVideoStream();

            // ローカルのメディアストリームを新しいピアコネクションに追加
            localMediaStream.getTracks().forEach((track) => {
                peer.addTrack(track, localMediaStream);
            });
        }

        // DBからSDPとICE Candidateの情報を削除
        sendMessage('', 'DELETE');

        lastMessageId = 0;  // メッセージIDをリセット

        // Callボタンの有効化
        enableButton(callButton);
        // Hungupボタンの無効化
        disableButton(hungupButton);
    } catch (error) {
        console.error('切断処理中にエラーが発生:', error);
    }
});

/**
 * ICE Candidate生成
 */
function addIceCandidate() {
    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate === null) return;
        // ローカル側のICE Candidateを追加
        iceCandidates.push(event.candidate);
    });
}

/**
 * Track取得
 */
function addRemoteVideoStream() {
    peer.addEventListener('track', (event) => {
        // リモート側のカメラ起動
        remoteVideo.srcObject = event.streams[0];
    });
}

/**
 * RTCPeerConnectionオブジェクト作成
 * @returns {RTCPeerConnection} RTCPeerConnectionオブジェクト
 */
function createRTCPeerConnection() {
    return new RTCPeerConnection({
        iceServers: [{ urls: STUN_SERVER }]
    });
}

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
 * SDP or ICE Candidate送信
 * @param {string} message SDP or ICE Candidate
 * @param {string} method リクエストメソッド
 */
function sendMessage(message, method = 'POST') {
    try {
        if (method === 'DELETE') {
            fetch(`${SINGNALING_SERVER}/user1`, {
                method: method
            });
        } else {
            fetch(SINGNALING_SERVER, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: 'user1',  // 決め打ち
                    receiver: 'user2',  // 決め打ち
                    message: JSON.stringify(message)
                }),
            });
        }
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
            sendMessage(iceCandidates);
            break;
        case 'candidate':
            await peer.addIceCandidate(payload);
            break;
    }
}
