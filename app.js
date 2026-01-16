// --- グローバル変数 ---
let model = null;
let recognizer = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let isRecording = false;
const STORAGE_KEY = 'forest_survey_v3_data';

// --- UI要素の取得 ---
const voiceStatus = document.getElementById('voiceStatus');
const voiceBtn = document.getElementById('voiceBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

// --- 1. Voskモデルの読み込み (起動時に実行) ---
window.onload = async function() {
    renderTable(); // 保存データを表示
    
    try {
        voiceStatus.innerText = "辞書データをロード中(40MB)...";
        
        // 【修正点】現在のURLを元に、モデルの「完全な住所(URL)」を作成する
        // これで「見つからない」という迷子を防ぎます
        const modelUrl = new URL('model/model.tar.gz', window.location.href).href;
        console.log("モデル読み込み先:", modelUrl);

        const channel = new MessageChannel();
        model = await Vosk.createModel(modelUrl);
        model.registerPort(channel.port1);

        voiceStatus.innerText = "音声入力：準備完了";
        voiceStatus.classList.add('ready');
        voiceBtn.disabled = false;
        voiceBtn.classList.add('active');
        voiceBtn.innerText = "音声入力開始";
    } catch (e) {
        // エラー内容を画面に詳しく出す
        voiceStatus.innerText = "エラー: " + e;
        voiceStatus.style.background = "#dc3545"; // 赤色にする
        console.error(e);
        alert("辞書データの読み込みに失敗しました。\n\n詳細エラー: " + e + "\n\nモデルURL: " + new URL('model/model.tar.gz', window.location.href).href);
    }
};

// --- 2. 音声認識の開始・停止 ---
voiceBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecognition();
    } else {
        stopRecognition();
    }
});

async function startRecognition() {
    if (!model) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
        });

        recognizer = new model.KaldiRecognizer(16000);
        
        recognizer.on("result", (message) => {
            const text = message.result.text;
            if (text) {
                console.log("確定:", text);
                voiceStatus.innerText = "認識: " + text;
                processVoiceCommand(text); 
            }
        });

        recognizer.on("partialresult", (message) => {
            if (message.result.partial) {
                voiceStatus.innerText = "聞き取り中: " + message.result.partial;
            }
        });

        const source = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
            if (recognizer) recognizer.acceptWaveform(event.inputBuffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        isRecording = true;
        voiceBtn.innerText = "停止";
        voiceStatus.classList.add('listening');
        voiceStatus.innerText = "聞いています...";
    } catch (err) {
        console.error(err);
        alert("マイクの起動に失敗しました: " + err);
    }
}

function stopRecognition() {
    if (processor) { processor.disconnect(); processor = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(track => track.stop()); }
    if (audioContext) { audioContext.close(); }
    
    isRecording = false;
    voiceBtn.innerText = "音声入力開始";
    voiceStatus.classList.remove('listening');
    voiceStatus.innerText = "音声入力：待機中";
}

// --- 3. 音声コマンドの振り分けロジック ---
function processVoiceCommand(text) {
    const words = text.split(/\s+/);
    
    words.forEach(word => {
        if (word.match(/保存|ほぞん/)) {
            handleSave();
            return;
        }

        if (word.match(/スギ|すぎ/)) document.getElementById('treeType').value = "スギ";
        else if (word.match(/ヒノキ|ひのき/)) document.getElementById('treeType').value = "ヒノキ";
        else if (word.match(/他針|たしん/)) document.getElementById('treeType').value = "他針";
        else if (word.match(/他広|たこう/)) document.getElementById('treeType').value = "他広";
        
        else if (word.match(/A|a|エー|えー/)) document.getElementById('quality').value = "A";
        else if (word.match(/B|b|ビー|びー/)) document.getElementById('quality').value = "B";
        else if (word.match(/C|c|シー|しー/)) document.getElementById('quality').value = "C";

        else if (!isNaN(parseFloat(word))) {
            const num = parseFloat(word);
            const dbhInput = document.getElementById('dbh');
            const heightInput = document.getElementById('height');

            if (dbhInput.value === "") {
                dbhInput.value = num;
            } else {
                heightInput.value = num;
            }
        }
        else if (word.length > 1) {
             const currentMemo = document.getElementById('memo').value;
             document.getElementById('memo').value = currentMemo + " " + word;
        }
    });
}

// --- 4. データ保存・管理ロジック ---
saveBtn.addEventListener('click', handleSave);
cancelBtn.addEventListener('click', resetForm);
exportBtn.addEventListener('click', handleExport);
clearBtn.addEventListener('click', handleAllClear);

function handleSave() {
    const p = document.getElementById('plotNo').value;
    const t = document.getElementById('treeNo').value;
    const d = document.getElementById('dbh').value;
    const editId = document.getElementById('editId').value;

    if(!p || !t || !d) {
        alert("入力不足です（プロット・立木番号・直径は必須）");
        return;
    }

    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const record = {
        plotNo: p,
        treeNo: t, 
        treeType: document.getElementById('treeType').value,
        dbh: d,
        height: document.getElementById('height').value,
        quality: document.getElementById('quality').value,
        memo: document.getElementById('memo').value,
        id: editId ? editId : String(Date.now())
    };

    if (editId) {
        const index = list.findIndex(item => String(item.id) === String(editId));
        if (index !== -1) list[index] = record;
    } else {
        list.unshift(record);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    resetForm();
    renderTable();
    
    document.getElementById('plotNo').value = p; 
    document.getElementById('treeNo').value = parseInt(t) + 1;
    
    voiceStatus.innerText = "保存しました";
    setTimeout(() => voiceStatus.innerText = "待機中", 2000);
}

function renderTable() {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    list.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.plotNo}</td>
            <td>${item.treeNo}</td>
            <td>${item.treeType}</td>
            <td>${item.dbh}</td>
            <td>${item.height}</td>
            <td>${item.quality || 'A'}</td>
            <td>${item.memo || ''}</td>
            <td class="action-btns">
                <button class="edit-btn" onclick="startEdit('${item.id}')">修正</button>
                <button class="del-btn" onclick="handleDelete('${item.id}')">削除</button>
            </td>`;
        tbody.appendChild(row);
    });
}

window.startEdit = function(id) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const target = list.find(item => String(item.id) === String(id));
    if(target) {
        document.getElementById('editId').value = target.id;
        document.getElementById('plotNo').value = target.plotNo;
        document.getElementById('treeNo').value = target.treeNo;
        document.getElementById('treeType').value = target.treeType;
        document.getElementById('dbh').value = target.dbh;
        document.getElementById('height').value = target.height;
        document.getElementById('quality').value = target.quality || 'A';
        document.getElementById('memo').value = target.memo || '';
        
        document.getElementById('formTitle').innerText = "【修正中】";
        document.getElementById('saveBtn').innerText = "更新";
        document.getElementById('cancelBtn').style.display = "inline-block";
        window.scrollTo(0,0);
    }
};

window.handleDelete = function(id) {
    if(!confirm("削除しますか？")) return;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newList = list.filter(item => String(item.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    renderTable();
};

function handleAllClear() {
    if(!confirm("全データを消去しますか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderTable();
}

function resetForm() {
    document.getElementById('editId').value = "";
    document.getElementById('dbh').value = "";
    document.getElementById('height').value = "";
    document.getElementById('memo').value = "";
    document.getElementById('formTitle').innerText = "立木調査 v3.0 (オフラインAI版)";
    document.getElementById('saveBtn').innerText = "保存";
    document.getElementById('cancelBtn').style.display = "none";
}

function handleExport() {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if(list.length === 0) { alert("データがありません"); return; }
    let csv = "\ufeffプロット番号,立木番号,樹種,胸高直径(cm),樹高(m),材質,備考\n";
    list.forEach(item => {
        csv += `${item.plotNo},${item.treeNo},${item.treeType},${item.dbh},${item.height},${item.quality || 'A'},${(item.memo || "").replace(/,/g, " ")}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    a.href = url;
    a.download = "立木調査_v3_" + dateStr + ".csv";
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
}
