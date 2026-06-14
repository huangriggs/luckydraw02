/* 極光霓虹抽獎系統 - 核心控制邏輯 (index.js) */

// --------------------------------------------------
// 1. 全域狀態與初始化
// --------------------------------------------------
const STATE = {
    participants: [], // 抽獎者列表
    prizes: [],       // 獎品列表
    history: [],      // 中獎紀錄歷史
    selectedPrizeId: null,
    isDrawing: false,
    soundEnabled: true,
    drawInterval: null,
    canvasAnimationId: null
};

// 本地儲存金鑰
const STORAGE_KEYS = {
    participants: 'aurora_draw_participants',
    prizes: 'aurora_draw_prizes',
    history: 'aurora_draw_history'
};

// 網頁載入後啟動
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadFromStorage();
    initTabs();
    initDownloadHandlers();
    initUploadHandlers();
    initManualForms();
    initControlHandlers();
    initTables();
    initAudio();
    initCanvas();
    
    // 如果資料庫為空，載入預設示範資料
    if (STATE.participants.length === 0 && STATE.prizes.length === 0) {
        loadDemoData();
    } else {
        updateAllUI();
    }
}

// --------------------------------------------------
// 2. 本地儲存與示範資料
// --------------------------------------------------
function loadFromStorage() {
    try {
        STATE.participants = JSON.parse(localStorage.getItem(STORAGE_KEYS.participants)) || [];
        STATE.prizes = JSON.parse(localStorage.getItem(STORAGE_KEYS.prizes)) || [];
        STATE.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
    } catch (e) {
        showToast('讀取本地資料失敗，系統已重置。');
        STATE.participants = [];
        STATE.prizes = [];
        STATE.history = [];
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(STATE.participants));
    localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(STATE.prizes));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(STATE.history));
}

function loadDemoData() {
    STATE.participants = [
        { id: 'p1', name: '張小明', points: 500, department: '研發部', hasWon: false },
        { id: 'p2', name: '李小華', points: 150, department: '設計部', hasWon: false },
        { id: 'p3', name: '王大同', points: 350, department: '市場部', hasWon: false },
        { id: 'p4', name: '趙君雅', points: 600, department: '研發部', hasWon: false },
        { id: 'p5', name: '林阿美', points: 100, department: '人事部', hasWon: false },
        { id: 'p6', name: '錢多多', points: 800, department: '財務部', hasWon: false },
        { id: 'p7', name: '陳小芬', points: 250, department: '行政部', hasWon: false },
        { id: 'p8', name: '孫悟空', points: 1000, department: '研發部', hasWon: false }
    ];

    STATE.prizes = [
        { id: 'pr1', name: '特等獎 - MacBook Pro', quantity: 1, minPoints: 500, drawnWinners: [] },
        { id: 'pr2', name: '頭獎 - iPhone 16', quantity: 1, minPoints: 300, drawnWinners: [] },
        { id: 'pr3', name: '貳獎 - iPad Air', quantity: 2, minPoints: 100, drawnWinners: [] },
        { id: 'pr4', name: '參獎 - AirPods 4', quantity: 3, minPoints: 50, drawnWinners: [] },
        { id: 'pr5', name: '普獎 - 百元超商禮券', quantity: 10, minPoints: 0, drawnWinners: [] }
    ];

    saveToStorage();
    updateAllUI();
    showToast('已載入示範資料！');
}

function resetSystem() {
    if (confirm('確定要清除所有資料並重置系統嗎？（此動作無法還原）')) {
        localStorage.clear();
        STATE.participants = [];
        STATE.prizes = [];
        STATE.history = [];
        STATE.selectedPrizeId = null;
        saveToStorage();
        loadDemoData();
    }
}

// --------------------------------------------------
// 3. UI 互動與分頁切換
// --------------------------------------------------
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'stage-tab') {
                // 重建 Canvas 避免大小跑掉
                resizeCanvas();
            }
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('notification-toast');
    const msgSpan = document.getElementById('toast-message');
    msgSpan.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --------------------------------------------------
// 4. CSV 範例產生與下載 (具有 BOM 的 UTF-8)
// --------------------------------------------------
function initDownloadHandlers() {
    document.getElementById('dl-participants-sample').addEventListener('click', () => {
        const headers = '姓名,積分,部門\r\n';
        const data = '張小明,500,研發部\r\n李小華,150,設計部\r\n王大同,350,市場部\r\n趙君雅,600,研發部\r\n';
        downloadCSVWithBOM('抽獎者名單範例.csv', headers + data);
    });

    document.getElementById('dl-prizes-sample').addEventListener('click', () => {
        const headers = '獎品名稱,數量,最低積分門檻\r\n';
        const data = '特等獎-MacBook Pro,1,500\r\n頭獎-iPhone 16,1,300\r\n貳獎-iPad Air,2,100\r\n普獎-百元超商禮券,10,0\r\n';
        downloadCSVWithBOM('獎品清單範例.csv', headers + data);
    });
}

function downloadCSVWithBOM(filename, content) {
    // 注入 UTF-8 BOM 標頭 (\uFEFF)
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
    
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    showToast(`成功下載範例：${filename}`);
}

// --------------------------------------------------
// 5. 檔案上傳與拖放解析
// --------------------------------------------------
function initUploadHandlers() {
    setupDragDropZone('participants-dropzone', 'participants-file-input', parseParticipantsFile);
    setupDragDropZone('prizes-dropzone', 'prizes-file-input', parsePrizesFile);
}

function setupDragDropZone(zoneId, inputId, parseCallback) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            parseCallback(e.dataTransfer.files[0]);
        }
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            parseCallback(e.target.files[0]);
            input.value = ''; // 重置 input 數值
        }
    });
}

function parseParticipantsFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = parseCSVToArray(text);
        
        if (rows.length < 2) {
            showToast('檔案格式錯誤或無內容。');
            return;
        }

        let addedCount = 0;
        let skipCount = 0;

        // 排除首列標頭，逐行處理
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 || !row[0].trim()) {
                continue;
            }
            
            const name = row[0].trim();
            const points = parseInt(row[1]) || 0;
            const dept = row[2] ? row[2].trim() : '無部門';

            // 避免完全同名重複匯入
            if (STATE.participants.some(p => p.name === name)) {
                skipCount++;
                continue;
            }

            STATE.participants.push({
                id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: name,
                points: points,
                department: dept,
                hasWon: false
            });
            addedCount++;
        }

        saveToStorage();
        updateAllUI();
        showToast(`匯入成功！成功新增 ${addedCount} 筆，略過重複 ${skipCount} 筆。`);
    };
    reader.readAsText(file, 'UTF-8');
}

function parsePrizesFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = parseCSVToArray(text);
        
        if (rows.length < 2) {
            showToast('檔案格式錯誤或無內容。');
            return;
        }

        let addedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 || !row[0].trim()) {
                continue;
            }
            
            const name = row[0].trim();
            const qty = parseInt(row[1]) || 1;
            const minPoints = parseInt(row[2]) || 0;

            STATE.prizes.push({
                id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: name,
                quantity: qty,
                minPoints: minPoints,
                drawnWinners: []
            });
            addedCount++;
        }

        saveToStorage();
        updateAllUI();
        showToast(`匯入成功！新增了 ${addedCount} 種獎品。`);
    };
    reader.readAsText(file, 'UTF-8');
}

// 簡易通用 CSV 解析器 (相容逗號隔開、自動去引號)
function parseCSVToArray(text) {
    // 移除可能存在的 BOM
    if (text.startsWith('\uFEFF')) {
        text = text.substring(1);
    }
    
    const lines = text.split(/\r?\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 簡易分割（不處理欄位內包含逗號的極端情況，相容一般標準 CSV）
        const cols = line.split(',').map(cell => {
            let clean = cell.trim();
            if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.substring(1, clean.length - 1);
            }
            return clean;
        });
        result.push(cols);
    }
    return result;
}

// --------------------------------------------------
// 6. 手動新增資料表單
// --------------------------------------------------
function initManualForms() {
    // 抽獎者手動表單
    document.getElementById('add-participant-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('manual-p-name');
        const pointsInput = document.getElementById('manual-p-points');
        const deptInput = document.getElementById('manual-p-dept');

        const name = nameInput.value.trim();
        const points = parseInt(pointsInput.value) || 0;
        const dept = deptInput.value.trim() || '無部門';

        if (STATE.participants.some(p => p.name === name)) {
            showToast('姓名重複，請設定不同名稱辨識！');
            return;
        }

        STATE.participants.push({
            id: 'p_' + Date.now(),
            name: name,
            points: points,
            department: dept,
            hasWon: false
        });

        saveToStorage();
        updateAllUI();
        showToast(`新增抽獎者：${name}`);

        // 重置欄位
        nameInput.value = '';
        pointsInput.value = '';
        deptInput.value = '';
    });

    // 獎品手動表單
    document.getElementById('add-prize-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('manual-prz-name');
        const qtyInput = document.getElementById('manual-prz-qty');
        const thresholdInput = document.getElementById('manual-prz-threshold');

        const name = nameInput.value.trim();
        const qty = parseInt(qtyInput.value) || 1;
        const threshold = parseInt(thresholdInput.value) || 0;

        STATE.prizes.push({
            id: 'pr_' + Date.now(),
            name: name,
            quantity: qty,
            minPoints: threshold,
            drawnWinners: []
        });

        saveToStorage();
        updateAllUI();
        showToast(`新增獎品：${name} (${qty} 個)`);

        nameInput.value = '';
        qtyInput.value = '';
        thresholdInput.value = '';
    });
}

// --------------------------------------------------
// 7. 更新資料表格與 UI 狀態
// --------------------------------------------------
function initTables() {
    // 搜尋功能
    document.getElementById('search-participants').addEventListener('input', (e) => {
        renderParticipantsTable(e.target.value.trim());
    });

    // 清空按鈕
    document.getElementById('clear-participants-btn').addEventListener('click', () => {
        if (confirm('確定要清空所有抽獎者名單嗎？這會清除中獎歷史記錄中關聯的姓名。')) {
            STATE.participants = [];
            saveToStorage();
            updateAllUI();
            showToast('已清空抽獎者！');
        }
    });

    document.getElementById('clear-prizes-btn').addEventListener('click', () => {
        if (confirm('確定要清空所有獎品清單嗎？')) {
            STATE.prizes = [];
            saveToStorage();
            updateAllUI();
            showToast('已清空獎品！');
        }
    });

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if (confirm('確定要清除所有中獎紀錄嗎？（清除後所有抽獎者的中獎狀態將會被重設為「未中獎」）')) {
            STATE.history = [];
            STATE.participants.forEach(p => p.hasWon = false);
            STATE.prizes.forEach(pr => pr.drawnWinners = []);
            saveToStorage();
            updateAllUI();
            showToast('中獎歷史紀錄已重設清空！');
        }
    });

    document.getElementById('reset-storage-btn').addEventListener('click', resetSystem);
}

function updateAllUI() {
    renderParticipantsTable();
    renderPrizesTable();
    renderHistoryTable();
    updatePrizeSelect();
    updateEligibleInfo();
}

function renderParticipantsTable(searchFilter = '') {
    const tbody = document.getElementById('participants-table-body');
    const totalSpan = document.getElementById('total-participants-count');
    totalSpan.textContent = STATE.participants.length;

    // 過濾搜尋字詞
    const filtered = STATE.participants.filter(p => {
        if (!searchFilter) return true;
        const f = searchFilter.toLowerCase();
        return p.name.toLowerCase().includes(f) || p.department.toLowerCase().includes(f);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row">${searchFilter ? '找不到符合搜尋條件的抽獎者' : '目前尚無抽獎者名單'}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(p => {
        const tr = document.createElement('tr');
        
        const badgeClass = p.hasWon ? 'badge-success' : 'badge-muted';
        const badgeText = p.hasWon ? '已得獎' : '未中獎';

        tr.innerHTML = `
            <td><strong>${escapeHTML(p.name)}</strong></td>
            <td><input type="number" class="form-control inline-edit-input" value="${p.points}" min="0" data-id="${p.id}" data-type="p-points"></td>
            <td>${escapeHTML(p.department)}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>
                <button class="text-danger-btn-sm" data-delete-id="${p.id}" data-type="participant">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 註冊表格內修改積分的事件監聽
    tbody.querySelectorAll('[data-type="p-points"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const newPoints = parseInt(e.target.value) || 0;
            const p = STATE.participants.find(x => x.id === id);
            if (p) {
                p.points = newPoints;
                saveToStorage();
                updateEligibleInfo(); // 更新合規人數
            }
        });
    });

    // 註冊刪除按鈕事件
    tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-delete-id');
            STATE.participants = STATE.participants.filter(x => x.id !== id);
            saveToStorage();
            updateAllUI();
        });
    });
}

function renderPrizesTable() {
    const tbody = document.getElementById('prizes-table-body');
    const totalSpan = document.getElementById('total-prizes-count');
    totalSpan.textContent = STATE.prizes.length;

    if (STATE.prizes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">目前尚無獎品清單</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    STATE.prizes.forEach(pr => {
        const tr = document.createElement('tr');
        
        const winnersText = pr.drawnWinners.length > 0 
            ? pr.drawnWinners.map(w => escapeHTML(w.name)).join(', ') 
            : '無';

        tr.innerHTML = `
            <td><strong>${escapeHTML(pr.name)}</strong></td>
            <td><input type="number" class="form-control inline-edit-input" value="${pr.quantity}" min="0" data-id="${pr.id}" data-type="pr-qty"></td>
            <td><input type="number" class="form-control inline-edit-input" value="${pr.minPoints}" min="0" data-id="${pr.id}" data-type="pr-min"></td>
            <td class="winners-td">${winnersText}</td>
            <td>
                <button class="text-danger-btn-sm" data-delete-id="${pr.id}" data-type="prize">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 註冊表格內修改欄位的事件
    tbody.querySelectorAll('[data-type="pr-qty"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const val = parseInt(e.target.value) || 0;
            const pr = STATE.prizes.find(x => x.id === id);
            if (pr) {
                pr.quantity = val;
                saveToStorage();
                updateEligibleInfo();
            }
        });
    });

    tbody.querySelectorAll('[data-type="pr-min"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const val = parseInt(e.target.value) || 0;
            const pr = STATE.prizes.find(x => x.id === id);
            if (pr) {
                pr.minPoints = val;
                saveToStorage();
                updateEligibleInfo();
            }
        });
    });

    // 註冊刪除按鈕
    tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-delete-id');
            STATE.prizes = STATE.prizes.filter(x => x.id !== id);
            if (STATE.selectedPrizeId === id) {
                STATE.selectedPrizeId = null;
            }
            saveToStorage();
            updateAllUI();
        });
    });
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    if (STATE.history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">目前尚無抽獎中獎紀錄</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    // 將紀錄倒序排列（最新抽出的在最上方）
    const sortedHistory = [...STATE.history].reverse();
    sortedHistory.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-highlight">${escapeHTML(h.prizeName)}</td>
            <td><strong>${escapeHTML(h.participantName)}</strong></td>
            <td><span class="text-warning">${h.participantPoints} 分</span></td>
            <td>${escapeHTML(h.participantDept)}</td>
            <td><small>${h.time}</small></td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePrizeSelect() {
    const select = document.getElementById('prize-select');
    const originalValue = select.value;
    
    // 清空舊選項，只留提示項
    select.innerHTML = '<option value="" disabled selected>-- 請選擇獎品 --</option>';
    
    STATE.prizes.forEach(pr => {
        const opt = document.createElement('option');
        opt.value = pr.id;
        opt.textContent = `${pr.name} (剩餘: ${pr.quantity})`;
        if (pr.quantity <= 0) {
            opt.disabled = true;
        }
        select.appendChild(opt);
    });

    // 恢復已選數值（若仍然有效）
    if (originalValue && STATE.prizes.some(pr => pr.id === originalValue)) {
        select.value = originalValue;
        STATE.selectedPrizeId = originalValue;
    } else {
        STATE.selectedPrizeId = null;
    }
}

function updateEligibleInfo() {
    const selectedPrizeId = STATE.selectedPrizeId;
    const qtySpan = document.getElementById('prize-qty');
    const thresholdSpan = document.getElementById('prize-threshold');
    const countSpan = document.getElementById('eligible-count');
    const startBtn = document.getElementById('start-draw-btn');

    if (!selectedPrizeId) {
        qtySpan.textContent = '--';
        thresholdSpan.textContent = '--';
        countSpan.textContent = '--';
        startBtn.disabled = true;
        return;
    }

    const prize = STATE.prizes.find(pr => pr.id === selectedPrizeId);
    if (!prize) return;

    qtySpan.textContent = prize.quantity + ' 個';
    thresholdSpan.textContent = prize.minPoints + ' 分';

    // 計算符合本獎品積分門檻且未中獎的人數
    const eligibleCount = STATE.participants.filter(p => !p.hasWon && p.points >= prize.minPoints).length;
    countSpan.textContent = eligibleCount + ' 人';

    // 如果剩餘獎品數量大於 0，且合規抽獎者大於 0，則允許點擊按鈕
    if (prize.quantity > 0 && eligibleCount > 0) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// --------------------------------------------------
// 8. 抽獎控制器與核心算法
// --------------------------------------------------
function initControlHandlers() {
    const select = document.getElementById('prize-select');
    select.addEventListener('change', (e) => {
        STATE.selectedPrizeId = e.target.value;
        updateEligibleInfo();
        
        const prize = STATE.prizes.find(pr => pr.id === STATE.selectedPrizeId);
        if (prize) {
            document.getElementById('stage-hint').textContent = `準備抽取【${prize.name}】`;
        }
    });

    // 🔊 音效開關
    const soundBtn = document.getElementById('sound-toggle-btn');
    soundBtn.addEventListener('click', () => {
        STATE.soundEnabled = !STATE.soundEnabled;
        soundBtn.textContent = STATE.soundEnabled ? '🔊' : '🔇';
        soundBtn.setAttribute('title', STATE.soundEnabled ? '切換靜音' : '開啟音效');
    });

    // 開始抽獎按鈕
    const drawBtn = document.getElementById('start-draw-btn');
    drawBtn.addEventListener('click', toggleDraw);

    // 關閉 Modal 彈出視窗
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        const modal = document.getElementById('winner-modal');
        modal.classList.remove('open');
        stopConfetti();
    });

    // 匯出歷史中獎歷史到 CSV (BOM UTF-8)
    document.getElementById('export-history-btn').addEventListener('click', () => {
        if (STATE.history.length === 0) {
            showToast('尚無中獎資料可匯出！');
            return;
        }
        
        let content = '中獎品項,得獎姓名,得獎積分,部門,中獎時間\r\n';
        STATE.history.forEach(h => {
            content += `"${h.prizeName}","${h.participantName}",${h.participantPoints},"${h.participantDept}","${h.time}"\r\n`;
        });
        downloadCSVWithBOM('極光霓虹抽獎中獎名單.csv', content);
    });
}

function toggleDraw() {
    if (STATE.isDrawing) {
        // 暫停抽獎 -> 開獎結果
        stopDrawAndReveal();
    } else {
        // 開始滾動抽獎
        startDrawScrolling();
    }
}

function startDrawScrolling() {
    const prize = STATE.prizes.find(pr => pr.id === STATE.selectedPrizeId);
    if (!prize) return;

    // 再次計算合規人，以防中途修改
    const candidates = STATE.participants.filter(p => !p.hasWon && p.points >= prize.minPoints);
    if (candidates.length === 0) {
        showToast('無合乎積分門檻的抽獎者！');
        return;
    }

    STATE.isDrawing = true;
    
    // UI 控制元件鎖定
    document.getElementById('prize-select').disabled = true;
    document.getElementById('draw-count').disabled = true;
    document.querySelectorAll('input[name="draw-mode"]').forEach(el => el.disabled = true);
    
    const drawBtn = document.getElementById('start-draw-btn');
    drawBtn.textContent = '暫停開獎';
    drawBtn.classList.remove('btn-primary');
    drawBtn.classList.add('btn-danger');

    document.getElementById('stage-hint').textContent = '抽獎名單滾動中...';

    // 啟動音效
    playTickSoundLoop();

    // 粒子加速旋轉效果
    CANVAS_STATE.spinSpeed = 0.15;

    // 動態名字滾動顯示
    STATE.drawInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        document.getElementById('rolling-name-display').textContent = candidates[randomIndex].name;
    }, 80);
}

function stopDrawAndReveal() {
    clearInterval(STATE.drawInterval);
    stopTickSoundLoop();

    STATE.isDrawing = false;
    
    // UI 解除鎖定
    document.getElementById('prize-select').disabled = false;
    document.getElementById('draw-count').disabled = false;
    document.querySelectorAll('input[name="draw-mode"]').forEach(el => el.disabled = false);
    
    const drawBtn = document.getElementById('start-draw-btn');
    drawBtn.textContent = '開始抽獎';
    drawBtn.classList.add('btn-primary');
    drawBtn.classList.remove('btn-danger');

    // Canvas 粒子恢復平緩轉速
    CANVAS_STATE.spinSpeed = 0.015;

    // 核心抽獎邏輯運算
    const prize = STATE.prizes.find(pr => pr.id === STATE.selectedPrizeId);
    const drawCountInput = parseInt(document.getElementById('draw-count').value) || 1;
    const drawMode = document.querySelector('input[name="draw-mode"]:checked').value;

    const candidates = STATE.participants.filter(p => !p.hasWon && p.points >= prize.minPoints);
    
    // 取中獎人數上限（不能大於合規候選人，也不能大於獎品剩餘數量）
    const actualDrawCount = Math.min(drawCountInput, prize.quantity, candidates.length);
    
    if (actualDrawCount <= 0) {
        showToast('無法抽取！可能符合人數不足或獎品已抽完。');
        updateEligibleInfo();
        return;
    }

    const winners = [];
    const pool = [...candidates];

    for (let k = 0; k < actualDrawCount; k++) {
        let winnerIndex = -1;
        
        if (drawMode === 'equal') {
            // 1. 等機率抽獎
            winnerIndex = Math.floor(Math.random() * pool.length);
        } else {
            // 2. 加權抽獎 (積分做權重)
            winnerIndex = getWeightedRandomIndex(pool);
        }

        if (winnerIndex !== -1) {
            const winner = pool[winnerIndex];
            winners.push(winner);
            // 從候選池剔除，防止單次抽獎重複抽中同人
            pool.splice(winnerIndex, 1);
        }
    }

    // 記錄結果
    const timeNow = new Date().toLocaleString('zh-TW');
    winners.forEach(winner => {
        // 設定該抽獎者已中獎
        const pObj = STATE.participants.find(p => p.id === winner.id);
        if (pObj) pObj.hasWon = true;

        // 該獎品記錄得獎者
        prize.drawnWinners.push({
            id: winner.id,
            name: winner.name,
            points: winner.points,
            dept: winner.department
        });

        // 減少獎品庫存數量
        prize.quantity--;

        // 寫入中獎歷史
        STATE.history.push({
            prizeId: prize.id,
            prizeName: prize.name,
            participantId: winner.id,
            participantName: winner.name,
            participantPoints: winner.points,
            participantDept: winner.department,
            time: timeNow
        });
    });

    saveToStorage();
    updateAllUI();

    // 播放勝利大喇叭 fanfare 音效
    playWinSound();

    // 彈出獲獎結果
    showWinnerModal(prize.name, winners);

    document.getElementById('stage-hint').textContent = `恭喜開獎成功！`;
    document.getElementById('rolling-name-display').textContent = winners.map(w => w.name).join(', ');
}

// 積分加權選擇演算法
function getWeightedRandomIndex(pool) {
    // 總積分
    const totalPoints = pool.reduce((sum, item) => sum + (item.points || 0), 0);
    if (totalPoints <= 0) {
        // 若全部人積分都是 0，則退化為等機率
        return Math.floor(Math.random() * pool.length);
    }

    const randVal = Math.random() * totalPoints;
    let sum = 0;
    for (let i = 0; i < pool.length; i++) {
        sum += pool[i].points || 0;
        if (sum > randVal) {
            return i;
        }
    }
    return pool.length - 1;
}

// 顯示中獎 Modal 與 Confetti 碎紙片動畫
function showWinnerModal(prizeName, winners) {
    document.getElementById('modal-prize-name').textContent = prizeName;
    
    const container = document.getElementById('winners-container');
    container.innerHTML = '';

    winners.forEach(w => {
        const card = document.createElement('div');
        card.className = 'winner-item-card';
        card.innerHTML = `
            <div class="w-name">${escapeHTML(w.name)}</div>
            <div class="w-points">💰 積分: ${w.points}</div>
            <div class="w-dept">🏢 ${escapeHTML(w.department)}</div>
        `;
        container.appendChild(card);
    });

    const modal = document.getElementById('winner-modal');
    modal.classList.add('open');
    
    // 啟動五彩紙屑渲染動畫
    startConfetti();
}

// --------------------------------------------------
// 9. Web Audio API 音效合成引擎
// --------------------------------------------------
let audioCtx = null;
let tickOscillator = null;
let tickInterval = null;

function initAudio() {
    // 當使用者首次與網頁互動時解鎖 AudioContext
    const unlockAudio = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };
    document.body.addEventListener('click', unlockAudio, { once: true });
}

// 播放短暫滴答音效 (抽獎名單飛速滾動中)
function playTickSoundLoop() {
    if (!STATE.soundEnabled) return;
    
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        let pitch = 300;
        tickInterval = setInterval(() => {
            if (!STATE.soundEnabled || !audioCtx) return;
            
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // 隨機微小頻率震盪
            osc.frequency.setValueAtTime(pitch + (Math.random() * 50 - 25), audioCtx.currentTime);
            osc.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        }, 80);
    } catch (e) {
        console.warn('Audio ticks failed', e);
    }
}

function stopTickSoundLoop() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

// 播放中獎的和弦樂與慶典音效 (音階掃描合聲)
function playWinSound() {
    if (!STATE.soundEnabled || !audioCtx) return;

    try {
        const now = audioCtx.currentTime;
        
        // 經典大三和弦 (C Major Fanfare): C4(261.63Hz), E4(329.63Hz), G4(392Hz), C5(523.25Hz)
        const notes = [261.63, 329.63, 392.00, 523.25];
        
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            
            // 和弦尾音微拉高
            osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + idx * 0.12 + 1.2);
            
            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.4);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 1.5);
        });

        // 鼓點聲模擬煙火爆炸效果 (低頻爆破聲)
        setTimeout(() => {
            if (!STATE.soundEnabled) return;
            const fireworksOsc = audioCtx.createOscillator();
            const fireworksGain = audioCtx.createGain();
            fireworksOsc.frequency.setValueAtTime(90, audioCtx.currentTime);
            fireworksOsc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.45);
            
            fireworksGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
            fireworksGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            
            fireworksOsc.connect(fireworksGain);
            fireworksGain.connect(audioCtx.destination);
            fireworksOsc.start();
            fireworksOsc.stop(audioCtx.currentTime + 0.5);
        }, 400);

    } catch (e) {
        console.warn('Fanfare play failed', e);
    }
}

// --------------------------------------------------
// 10. Canvas 3D 粒子名字漩渦引擎
// --------------------------------------------------
let canvas = null;
let ctx = null;
const CANVAS_STATE = {
    particles: [],
    spinSpeed: 0.015,
    angleY: 0,
    angleX: 0
};

class NameParticle {
    constructor(name) {
        this.name = name;
        this.reset();
    }

    reset() {
        // 在一個 3D 球體上隨機分佈座標
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 220 + Math.random() * 80;

        this.x3d = radius * Math.sin(phi) * Math.cos(theta);
        this.y3d = radius * Math.sin(phi) * Math.sin(theta);
        this.z3d = radius * Math.cos(phi);

        // 隨機的粒子字型大小與透明度
        this.fontSize = 12 + Math.floor(Math.random() * 10);
        this.opacity = 0.3 + Math.random() * 0.5;
        this.color = Math.random() > 0.5 ? 'hsl(186, 100%, 75%)' : 'hsl(282, 100%, 75%)';
    }

    // 進行 3D 旋轉計算
    rotate(angleX, angleY) {
        // 繞 Y 軸旋轉
        let cosY = Math.cos(angleY);
        let sinY = Math.sin(angleY);
        let x1 = this.x3d * cosY - this.z3d * sinY;
        let z1 = this.z3d * cosY + this.x3d * sinY;

        // 繞 X 軸旋轉
        let cosX = Math.cos(angleX);
        let sinX = Math.sin(angleX);
        let y2 = this.y3d * cosX - z1 * sinX;
        let z2 = z1 * cosX + this.y3d * sinX;

        this.rotX = x1;
        this.rotY = y2;
        this.rotZ = z2;
    }

    // 將 3D 空間座標投影渲染到 2D Canvas 畫布上
    draw(width, height) {
        // 設定相機焦距與透視距離
        const fov = 350;
        const scale = fov / (fov + this.rotZ);
        
        // 投影成 2D 畫布座標，中心為 (width/2, height/2)
        const x2d = (width / 2) + this.rotX * scale;
        const y2d = (height / 2) + this.rotY * scale;

        const size = this.fontSize * scale;
        if (size <= 0) return;

        // 根據 Z 軸深度計算粒子透明度，前面的更清晰，後面的更模糊透明
        let alpha = this.opacity * (fov / (fov + this.rotZ * 0.8));
        alpha = Math.max(0.1, Math.min(1, alpha));

        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${size}px var(--font-outfit)`;
        ctx.fillText(this.name, x2d, y2d);
    }
}

function initCanvas() {
    canvas = document.getElementById('stage-canvas');
    ctx = canvas.getContext('2d');
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // 初始化 3D 粒子池
    rebuildParticles();
    
    // 啟動渲染迴圈
    renderCanvasLoop();
}

function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}

function rebuildParticles() {
    CANVAS_STATE.particles = [];
    
    // 使用抽獎名單內所有名字來做粒子
    if (STATE.participants.length > 0) {
        // 限制最大粒子數，避免人過多效能受阻
        const listToUse = [...STATE.participants];
        // 如果人數較少，複製數遍讓粒子球體飽滿好看
        while (listToUse.length < 50) {
            listToUse.push(...STATE.participants);
        }
        
        const maxParticles = Math.min(listToUse.length, 120);
        for (let i = 0; i < maxParticles; i++) {
            CANVAS_STATE.particles.push(new NameParticle(listToUse[i].name));
        }
    } else {
        // 無名字時使用英文字母模擬科技感粒子
        const dummyNames = ['Aurora', 'Draw', 'Helix', 'Agent', 'Lucky', 'Winner', 'Star', 'Neon', 'Cosmic', 'Tech'];
        for (let i = 0; i < 60; i++) {
            const name = dummyNames[i % dummyNames.length] + ' ' + Math.floor(Math.random() * 100);
            CANVAS_STATE.particles.push(new NameParticle(name));
        }
    }
}

function renderCanvasLoop() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 累積自旋轉角度
    CANVAS_STATE.angleY += CANVAS_STATE.spinSpeed;
    CANVAS_STATE.angleX += CANVAS_STATE.spinSpeed * 0.4;

    // 先針對粒子深度排序，Z 軸越深（在後面）的粒子先畫，越近的後畫，建立真實的 3D 透視遮擋感
    CANVAS_STATE.particles.forEach(p => p.rotate(CANVAS_STATE.angleX, CANVAS_STATE.angleY));
    
    const sortedParticles = [...CANVAS_STATE.particles].sort((a, b) => b.rotZ - a.rotZ);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    sortedParticles.forEach(p => {
        p.draw(canvas.width, canvas.height);
    });

    ctx.globalAlpha = 1.0; // 重設透明度

    STATE.canvasAnimationId = requestAnimationFrame(renderCanvasLoop);
}

// --------------------------------------------------
// 11. Confetti (五彩紙屑煙火效果) 引擎
// --------------------------------------------------
let confettiCanvas = null;
let confettiCtx = null;
let confettiAnimId = null;
let confettiParticles = [];
let isConfettiActive = false;

class ConfettiPiece {
    constructor(w, h) {
        this.canvasWidth = w;
        this.canvasHeight = h;
        this.reset();
    }

    reset() {
        // 大多數紙屑從頂部或者隨機處飛散
        this.x = Math.random() * this.canvasWidth;
        this.y = Math.random() * -this.canvasHeight - 20;
        this.size = 8 + Math.random() * 10;
        
        // 隨機鮮明色彩
        const colors = [
            '#00f3ff', // 霓虹藍
            '#ba64f8', // 霓虹紫
            '#50ff91', // 成功綠
            '#ffdf00', // 金黃
            '#ff5050', // 鮮紅
            '#ff9f00'  // 橘黃
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.speedX = Math.random() * 4 - 2;
        this.speedY = 3 + Math.random() * 5;
        this.rotationSpeed = Math.random() * 0.08 + 0.02;
        this.rotation = Math.random() * Math.PI;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;

        // 當落到畫布外時重置
        if (this.y > this.canvasHeight) {
            this.reset();
        }
    }

    draw() {
        confettiCtx.save();
        confettiCtx.translate(this.x, this.y);
        confettiCtx.rotate(this.rotation);
        confettiCtx.fillStyle = this.color;
        
        // 畫矩形色塊
        confettiCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        confettiCtx.restore();
    }
}

function startConfetti() {
    confettiCanvas = document.getElementById('confetti-canvas');
    confettiCtx = confettiCanvas.getContext('2d');
    
    // 設定大小與視窗一致
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
        confettiParticles.push(new ConfettiPiece(confettiCanvas.width, confettiCanvas.height));
    }
    
    isConfettiActive = true;
    renderConfettiLoop();
}

function stopConfetti() {
    isConfettiActive = false;
    cancelAnimationFrame(confettiAnimId);
    if (confettiCtx && confettiCanvas) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

function renderConfettiLoop() {
    if (!isConfettiActive) return;
    
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    confettiParticles.forEach(p => {
        p.update();
        p.draw();
    });
    
    confettiAnimId = requestAnimationFrame(renderConfettiLoop);
}

// --------------------------------------------------
// 12. 動態變更粒子池以對應新資料
// --------------------------------------------------
const originalSaveToStorage = saveToStorage;
saveToStorage = function() {
    originalSaveToStorage();
    rebuildParticles(); // 資料改變時，同步重構粒子球體的名字
};
