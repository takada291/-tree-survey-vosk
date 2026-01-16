let model = null;
let recognizer = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let isRecording = false;

const statusText = document.getElementById('status-text');
const micBtn = document.getElementById('mic-btn');
const recognizedText = document.getElementById('recognized-text');

// アプリを開いた瞬間に辞書（モデル）の読み込みを開始
async function loadModel() {
    try {
        statusText.textContent = "辞書データをダウンロード中...(40MB)";
        // GitHubのmodelフォルダ内のファイルを読み込みます
        const channel = new MessageChannel();
        model = await Vosk.createModel('model/model.tar.gz');
        model.registerPort(channel.port1);
        
        statusText.textContent = "準備完了！ボタンを押して話してください。";
        micBtn.classList.add('ready');
        micBtn.disabled = false;
        micBtn.textContent = "音声入力開始";
    } catch (e) {
        statusText.textContent = "エラー: 辞書データが見つかりません。" + e;
        console.error(e);
    }
}

// マイクボタンが押されたときの処理
micBtn.addEventListener('click', async () => {
    if (!isRecording) {
        startRecognition();
    } else {
        stopRecognition();
    }
});

async function startRecognition() {
    if (!model) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000
            }
        });

        recognizer = new model.KaldiRecognizer(16000);
        
        // 認識結果が出たときの処理
        recognizer.on("result", (message) => {
            const text = message.result.text;
            if (text) {
                console.log("確定結果:", text);
                processVoiceInput(text); // 入力欄に振り分ける関数へ
            }
        });

        // 途中経過の表示
        recognizer.on("partialresult", (message) => {
            if (message.result.partial) {
                recognizedText.textContent = message.result.partial;
            }
        });

        // マイク音声をVoskへ送る処理
        const source = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
            if (recognizer) {
                recognizer.acceptWaveform(event.inputBuffer);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        isRecording = true;
        micBtn.textContent = "停止";
        micBtn.classList.add('recording');
        statusText.textContent = "聞いています...";

    } catch (err) {
        console.error(err);
        statusText.textContent = "マイクのエラーです: " + err;
    }
}

function stopRecognition() {
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    
    isRecording = false;
    micBtn.textContent = "音声入力開始";
    micBtn.classList.remove('recording');
    statusText.textContent = "準備完了";
}

// 音声データを項目に振り分けるロジック
function processVoiceInput(text) {
    // 空白で区切られた単語リストにする（例: "スギ 24" -> ["スギ", "24"]）
    const words = text.split(/\s+/);

    words.forEach(word => {
        // 数字かどうか判定
        const num = parseFloat(word);
        
        if (isNaN(num)) {
            // 数字じゃない場合 -> 「樹種」とみなす
            // （誤認識を防ぐため、スギ・ヒノキなど特定の言葉だけ拾う条件を入れてもOK）
            if(word.length > 0) {
                document.getElementById('tree-type').value = word;
            }
        } else {
            // 数字の場合 -> 空いている順番に入れる
            const dia = document.getElementById('tree-diameter');
            const hei = document.getElementById('tree-height');

            if (dia.value === "") {
                dia.value = num;
            } else if (hei.value === "") {
                hei.value = num;
            }
        }
    });
}

// 起動時にロード開始
window.onload = loadModel;