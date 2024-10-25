'use strict';

const SINGNALING_SERVER = 'http://localhost/VideoChat/backend/index.php';
const STUN_SERVER = 'stun:stun.l.google.com:19302';

// HTML要素
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const hungupButton = document.getElementById('hungup-button');

let localMediaStream;
let remoteMediaStream;
const iceCandidates = [];  // ローカル側のICE Candidateの一覧
let lastMessageId = 0;

// WebRTCのコネクションオブジェクトを作成
let peer = createRTCPeerConnection();

// イベントリスナ設定
addIceCandidate();
addRemoteVideoStream();
// ローカル側のカメラ起動
initLocalCamera();
// ポーリング開始
pollMessages();

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
        pollMessages();  // ポーリングの再開

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
            fetch(`${SINGNALING_SERVER}/user2`, {
                method: method
            });
        } else {
            fetch(SINGNALING_SERVER, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: 'user2',  // 決め打ち
                    receiver: 'user1',  // 決め打ち
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
    fetch(`${SINGNALING_SERVER}?receiver=user2&last_id=${lastMessageId}`)
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

                setTimeout(pollMessages, 1000);  // // 1秒間隔で実行
            }
        })
        .catch(error => {
            console.error('Error polling messages:', error);
            setTimeout(pollMessages, 5000);  // エラー時は少し長めの間隔をとってから再取得
        });
}

/**
 * ポーリング（ICE Candidate）
 * 1秒間隔でデータ取得（GET）
 */
function pollMessagesForIce() {
    fetch(`${SINGNALING_SERVER}?receiver=user2&last_id=${lastMessageId}`)
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                result.data.forEach(message => {
                    handleMessage('candidate', JSON.parse(message.message));
                    lastMessageId = message.id;
                });
            }
            // 待機状態
            else if (result.status === 'empty') {
                // console.log(result.message);

                // TODO:必要に応じて、ユーザーに「待機中」と表示するなどの処理を追加

                setTimeout(pollMessagesForIce, 1000);  // 1秒間隔で実行
            }
        })
        .catch(error => {
            console.error('Error polling messages:', error);
            setTimeout(pollMessagesForIce, 5000);  // エラー時は少し長めの間隔をとってから再取得
        });
}

/**
 * メッセージハンドリング
 * @param {string} type offer or candidate
 * @param {array} payload セットするデータ
 */
async function handleMessage(type, payload) {
    switch (type) {
        case 'offer':
            await createAndSendAnswer(payload);
            break;
        case 'candidate':
            await setIceCandidates(payload);
            break;
    }
}

/**
 * Answer SDPの作成と送信
 * @param {string} offer
 */
async function createAndSendAnswer(offer) {
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendMessage(answer);
    pollMessagesForIce();
}

/**
 * ICE Candidate登録
 * @param {array} iceCandidates
 */
async function setIceCandidates(iceCandidates) {
    // すべてのIce Candidateを設定
    for (const iceCandidate of iceCandidates) {
         await peer.addIceCandidate(iceCandidate);
    }
}
