// app.js - Ganesa Setya Private Workspace
// Aplikasi produktivitas pribadi dengan penyimpanan data lokal
// Google API functionality removed - data stored 100% locally in localStorage

// ---- Auth redirect: ensure user is logged in (set 'ganesa_logged_in' in localStorage) ----
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('ganesa_logged_in') !== '1') {
      // not logged in - redirect to index (login) page
      if (location.pathname.endsWith('dashboard.html') || location.pathname === '/' || location.pathname.endsWith('/')) {
        location.href = 'index.html';
      }
    }
  } catch (e) {}
}
// ---- end auth check ----

// Utility functions
const $ = sel => document.querySelector(sel);
const uid = () => 'id-' + Math.random().toString(36).slice(2, 9);

function toast(msg, ms = 3200) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Data management
const STORAGE_KEY = 'ganesa_v5_5_appdata';
let appData = {
  tasks: [],
  journals: [],
  goals: [],
  finance: { transactions: [], savings: [] },
  timerHistory: [],
  settings: { theme: 'light', pinHash: null, lastSync: null },
  focus: { text: '', date: '' }
};

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      appData = JSON.parse(raw);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }
}

async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// UI Layout and Components
function buildLayout() {
  document.getElementById('app-root').innerHTML = `
  <div class="bg-wrap">
    <div class="bg-gradient"></div>
    <div class="particle p1"></div>
    <div class="particle p2"></div>
  </div>
  <div class="toast-container" id="toastContainer"></div>
  <div class="app">
    <aside class="sidebar">
      <div class="logo">
        <div class="g">G</div>
        <div>
          <div class="brand">Ganesa Setya</div>
          <div class="brand-sub">Private Workspace</div>
        </div>
      </div>
      <nav class="nav">
        <div class="nav-item active" data-panel="dashboard">📊 Dashboard</div>
        <div class="nav-item" data-panel="tasks">✅ Tugas</div>
        <div class="nav-item" data-panel="journal">📝 Jurnal</div>
        <div class="nav-item" data-panel="goals">🎯 Goals</div>
        <div class="nav-item" data-panel="finance">💰 Keuangan</div>
        <div class="nav-item" data-panel="calendar">📅 Kalender</div>
        <div style="margin-top:12px" class="muted-xs">Alat</div>
        <div class="nav-item" data-panel="timer">⏳ Timer</div>
        <div class="nav-item" data-panel="analytics">📈 Analytics</div>
        <div class="nav-item" data-panel="integrations">🔄 Backup/Sync</div>
      </nav>
      <div style="margin-top:auto">
        <div class="muted-xs" style="margin-bottom:8px">Privasi: data tersimpan lokal</div>
        <div style="display:flex;gap:8px">
          <button id="lockBtn" class="btn ghost small" style="flex:1">Kunci</button>
          <button id="clearBtn" class="btn ghost small" style="flex:1">Reset</button>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <label class="muted-xs">Tema</label>
          <button id="themeToggle" class="btn small">Toggle</button>
        </div>
      </div>
    </aside>
    <main class="main">
      <div class="panel" id="mainPanel">
        <div class="header">
          <div>
            <h1 style="margin:0;font-family:Poppins,Inter">Dashboard</h1>
            <div class="muted-xs" id="panelDesc">Ringkasan</div>
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            <div class="muted-xs" id="dateTime">—</div>
            <div class="muted-xs" id="userBadge">Ganesa</div>
          </div>
        </div>
        <div class="kpis">
          <div class="card">
            <div class="muted-xs">Produktivitas</div>
            <div class="amount" id="productivityScore">0%</div>
          </div>
          <div class="card">
            <div class="muted-xs">Tugas Selesai</div>
            <div class="amount" id="doneCount">0</div>
            <div class="muted-xs">dari <span id="totalCount">0</span></div>
          </div>
          <div class="card">
            <div class="muted-xs">Saldo</div>
            <div class="amount" id="balance">Rp 0</div>
          </div>
          <div class="card">
            <div class="muted-xs">Tabungan Tercapai</div>
            <div class="amount" id="savingsReached">0</div>
          </div>
        </div>
        <div class="cols-2" style="display:grid;grid-template-columns:1fr 380px;gap:14px">
          <div>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Fokus Hari Ini</h3>
              <div style="margin-top:8px">
                <input id="dailyFocus" class="input" placeholder="Apa fokus utama hari ini?" />
              </div>
              <div style="display:flex;gap:8px;margin-top:8px">
                <button id="saveFocus" class="btn small">Simpan</button>
                <button id="clearFocus" class="btn ghost small">Hapus</button>
              </div>
            </div>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Tugas Terbaru</h3>
              <ul id="recentTasks" class="list" style="margin-top:10px"></ul>
            </div>
            <div class="card">
              <h3 style="margin:0">Ringkasan Keuangan</h3>
              <div style="margin-top:8px" class="muted-xs">Pemasukan terakhir: <span id="lastIncome">-</span></div>
              <div class="muted-xs">Pengeluaran terakhir: <span id="lastExpense">-</span></div>
            </div>
          </div>
          <aside>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Timer Pomodoro</h3>
              <div style="font-size:2.2rem;font-weight:800;text-align:center;margin-top:12px" id="timerDisplay">25:00</div>
              <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
                <button id="timerStart" class="btn small">Mulai</button>
                <button id="timerPause" class="btn ghost small">Jeda</button>
                <button id="timerReset" class="btn ghost small">Reset</button>
              </div>
            </div>
            <div class="card">
              <h3 style="margin:0">Mini Calendar</h3>
              <div id="miniCalendar" style="margin-top:10px"></div>
            </div>
          </aside>
        </div>
      </div>

      <div class="panel hidden" id="tasksPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Tugas</h1>
          <div class="muted-xs" id="tasksDesc">Kelola tugas dan aktivitas</div>
        </div>
        <div id="tasksList" class="card"></div>
      </div>
      
      <div class="panel hidden" id="journalPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Jurnal</h1>
          <div class="muted-xs" id="journalDesc">Catatan harian dan refleksi</div>
        </div>
        <div id="journalList" class="card"></div>
      </div>
      
      <div class="panel hidden" id="goalsPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Goals</h1>
          <div class="muted-xs" id="goalsDesc">Target dan pencapaian</div>
        </div>
        <div id="goalsList" class="card"></div>
      </div>
      
      <div class="panel hidden" id="financePanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Keuangan</h1>
          <div class="muted-xs" id="financeDesc">Transaksi dan tabungan</div>
        </div>
        <div class="card" style="margin-bottom:12px">
          <h3 style="margin:0">Transaksi</h3>
          <div id="txnList" style="margin-top:10px"></div>
        </div>
        <div class="card">
          <h3 style="margin:0">Tabungan</h3>
          <div id="savingsList" style="margin-top:10px"></div>
        </div>
      </div>
      
      <div class="panel hidden" id="timerPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Timer</h1>
          <div class="muted-xs" id="timerDesc">Riwayat sesi timer</div>
        </div>
        <div id="timerHistory" class="card"></div>
      </div>
      
      <div class="panel hidden" id="analyticsPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Analytics</h1>
          <div class="muted-xs" id="analyticsDesc">Statistik produktivitas</div>
        </div>
        <div class="card">
          <canvas id="prodChart" width="380" height="220"></canvas>
        </div>
      </div>
      
      <div class="panel hidden" id="integrationsPanel">
        <div class="header">
          <h1 style="margin:0;font-family:Poppins,Inter">Backup & Export</h1>
          <div class="muted-xs" id="integrationsDesc">Cadangkan data Anda</div>
        </div>
        <div class="card">
          <div class="muted-xs">Sinkronisasi Google Sheets telah dihapus. Harap gunakan ekspor di bawah untuk mencadangkan data Anda secara manual.</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button id="exportXlsx" class="btn">Ekspor .xlsx</button>
            <button id="exportJson" class="btn ghost">Ekspor JSON</button>
          </div>
          <div style="margin-top:8px" class="muted-xs" id="exportStatus">Status: Data Anda 100% tersimpan lokal.</div>
        </div>
      </div>
    </main>
  </div>
  <div class="voice-fab" id="voiceFab" title="Asisten Suara">🎤</div>
  <div class="login-overlay" id="loginOverlay">
    <div class="login-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <h2 style="margin:0">Silakan login</h2>
          <div class="muted-xs">Masukkan PIN 4-6 digit untuk membuka workspace Anda</div>
        </div>
        <div style="font-weight:800;color:var(--accent);font-size:24px">G</div>
      </div>
      <div id="firstTime">
        <div class="muted-xs">Belum ada PIN? Buat PIN 4-6 digit.</div>
        <div style="margin-top:8px">
          <input id="newPin" class="input" placeholder="Buat PIN (4-6 digit)" type="password" maxlength="6" inputmode="numeric"/>
        </div>
        <div style="margin-top:8px">
          <button id="createPin" class="btn">Buat PIN</button>
        </div>
      </div>
      <div id="loginBox" style="display:none;margin-top:10px">
        <div class="muted-xs">Masukkan PIN</div>
        <input id="pinInput" class="input" placeholder="PIN" type="password" maxlength="6" inputmode="numeric" style="margin-top:8px"/>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="enterPin" class="btn">Masuk</button>
          <button id="resetApp" class="btn ghost">Reset App</button>
        </div>
      </div>
      <div style="margin-top:10px" class="muted-xs">PIN di-hash & disimpan lokal — jangan bagikan PIN Anda.</div>
    </div>
  </div>
  `;

  // Attach event listeners
  attachEventListeners();
}

function attachEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', e => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const panel = e.currentTarget.dataset.panel;
    switchPanel(panel);
  }));

  // Theme and actions
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('lockBtn').addEventListener('click', () => {
    document.getElementById('loginOverlay').style.display = 'flex';
    toast('Dashboard terkunci');
  });
  
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Hapus semua data lokal?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // Export functions
  document.getElementById('exportXlsx').addEventListener('click', exportXlsx);
  document.getElementById('exportJson').addEventListener('click', exportJson);
  
  // Voice assistant
  document.getElementById('voiceFab').addEventListener('click', startVoice);
  
  // Focus management
  document.getElementById('saveFocus').addEventListener('click', saveDailyFocus);
  document.getElementById('clearFocus').addEventListener('click', clearDailyFocus);
  
  // Timer controls
  document.getElementById('timerStart').addEventListener('click', startTimer);
  document.getElementById('timerPause').addEventListener('click', pauseTimer);
  document.getElementById('timerReset').addEventListener('click', resetTimer);
  
  // PIN handlers
  document.getElementById('createPin').addEventListener('click', createPin);
  document.getElementById('enterPin').addEventListener('click', enterPin);
  document.getElementById('resetApp').addEventListener('click', resetApp);
}

// Panel navigation
function switchPanel(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  
  if (panel === 'dashboard') {
    document.getElementById('mainPanel').classList.remove('hidden');
  } else {
    const el = document.getElementById(panel + 'Panel');
    if (el) el.classList.remove('hidden');
  }
  
  // Update specific panel content
  switch (panel) {
    case 'tasks':
      renderTasks();
      break;
    case 'finance':
      renderTxns();
      renderSavings();
      break;
    case 'analytics':
      renderAnalytics();
      break;
    case 'timer':
      renderTimerHistory();
      break;
  }
}

// Theme management
function toggleTheme() {
  const cur = document.body.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  appData.settings.theme = next;
  saveData();
  toast('Tema: ' + next);
}

// PIN and authentication
function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  const exists = !!appData.settings.pinHash;
  
  if (exists) {
    document.getElementById('firstTime').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
  } else {
    document.getElementById('firstTime').style.display = 'block';
    document.getElementById('loginBox').style.display = 'none';
  }
}

async function createPin() {
  const p = document.getElementById('newPin').value.trim();
  if (!/^[0-9]{4,6}$/.test(p)) {
    toast('PIN harus 4-6 digit');
    return;
  }
  
  const h = await sha256Hex(p);
  appData.settings.pinHash = h;
  saveData();
  document.getElementById('newPin').value = '';
  toast('PIN dibuat. Silakan masuk.');
  showLogin();
}

async function enterPin() {
  const p = document.getElementById('pinInput').value.trim();
  if (!p) {
    toast('Masukkan PIN');
    return;
  }
  
  const h = await sha256Hex(p);
  if (h === appData.settings.pinHash) {
    document.getElementById('pinInput').value = '';
    document.getElementById('loginOverlay').style.display = 'none';
    localStorage.setItem('ganesa_logged_in', '1');
    toast('Selamat datang!');
    renderAll();
  } else {
    toast('PIN salah');
  }
}

function resetApp() {
  if (confirm('Reset aplikasi dan hapus semua data?')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('ganesa_logged_in');
    location.reload();
  }
}

// Daily focus
function saveDailyFocus() {
  const focusText = document.getElementById('dailyFocus').value.trim();
  if (focusText) {
    appData.focus = {
      text: focusText,
      date: new Date().toISOString().slice(0, 10)
    };
    saveData();
    toast('Fokus harian disimpan');
  }
}

function clearDailyFocus() {
  document.getElementById('dailyFocus').value = '';
  appData.focus = { text: '', date: '' };
  saveData();
  toast('Fokus harian dihapus');
}

// Timer functionality
let timerInterval = null;
let timerSeconds = 25 * 60; // 25 minutes
let timerRunning = false;

function startTimer() {
  if (!timerRunning) {
    timerRunning = true;
    timerInterval = setInterval(updateTimer, 1000);
    document.getElementById('timerStart').textContent = 'Lanjut';
    toast('Timer dimulai');
  }
}

function pauseTimer() {
  if (timerRunning) {
    timerRunning = false;
    clearInterval(timerInterval);
    toast('Timer dijeda');
  }
}

function resetTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerSeconds = 25 * 60;
  updateTimerDisplay();
  document.getElementById('timerStart').textContent = 'Mulai';
  toast('Timer direset');
}

function updateTimer() {
  if (timerSeconds > 0) {
    timerSeconds--;
    updateTimerDisplay();
  } else {
    resetTimer();
    toast('Timer selesai!');
    // Add to history
    appData.timerHistory.push({
      date: new Date().toISOString(),
      duration: 25 * 60
    });
    saveData();
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Rendering functions
function renderAll() {
  // Update focus
  if (document.getElementById('dailyFocus')) {
    document.getElementById('dailyFocus').value = appData.focus ? appData.focus.text || '' : '';
  }
  
  // Update dashboard
  renderDashboard();
  
  // Update date time
  updateDateTime();
  
  // Update mini calendar
  renderMiniCalendar();
}

function renderDashboard() {
  // Productivity score
  const totalTasks = appData.tasks.length;
  const doneTasks = appData.tasks.filter(t => t.done).length;
  const productivityScore = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  if (document.getElementById('productivityScore')) {
    document.getElementById('productivityScore').textContent = productivityScore + '%';
  }
  
  // Task counts
  if (document.getElementById('doneCount')) {
    document.getElementById('doneCount').textContent = doneTasks;
  }
  if (document.getElementById('totalCount')) {
    document.getElementById('totalCount').textContent = totalTasks;
  }
  
  // Balance
  const balance = calculateBalance();
  if (document.getElementById('balance')) {
    document.getElementById('balance').textContent = 'Rp ' + balance.toLocaleString('id-ID');
  }
  
  // Recent tasks
  renderRecentTasks();
  
  // Financial summary
  renderFinancialSummary();
}

function renderRecentTasks() {
  const el = document.getElementById('recentTasks');
  if (!el) return;
  
  const recentTasks = appData.tasks
    .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
    .slice(0, 5);
  
  if (recentTasks.length === 0) {
    el.innerHTML = '<div class="muted-xs">Belum ada tugas</div>';
    return;
  }
  
  el.innerHTML = recentTasks.map(task => `
    <li class="list-item ${task.done ? 'done' : ''}">
      <div style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <div class="muted-xs">${task.due || 'Tidak ada tenggat'}</div>
        </div>
      </div>
    </li>
  `).join('');
}

function renderFinancialSummary() {
  const transactions = appData.finance.transactions;
  const lastIncome = transactions.filter(t => t.type === 'income').pop();
  const lastExpense = transactions.filter(t => t.type === 'expense').pop();
  
  if (document.getElementById('lastIncome')) {
    document.getElementById('lastIncome').textContent = lastIncome 
      ? 'Rp ' + parseInt(lastIncome.amount).toLocaleString('id-ID') 
      : '-';
  }
  
  if (document.getElementById('lastExpense')) {
    document.getElementById('lastExpense').textContent = lastExpense 
      ? 'Rp ' + parseInt(lastExpense.amount).toLocaleString('id-ID') 
      : '-';
  }
}

function renderTasks() {
  const el = document.getElementById('tasksList');
  if (!el) return;
  
  if (appData.tasks.length === 0) {
    el.innerHTML = '<div class="muted-xs">Belum ada tugas. Tambah tugas baru untuk memulai.</div>';
    return;
  }
  
  el.innerHTML = `
    <div style="display:flex;justify-content:between;align-items:center;margin-bottom:12px">
      <h3 style="margin:0">Daftar Tugas</h3>
      <button class="btn small" onclick="addTask()">+ Tambah Tugas</button>
    </div>
    <div>
      ${appData.tasks.map(task => `
        <div class="list-item ${task.done ? 'done' : ''}">
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${task.id}')">
              <div>
                <strong>${escapeHtml(task.title)}</strong>
                <div class="muted-xs">${task.due || 'Tidak ada tenggat'}</div>
              </div>
            </div>
            <button class="btn ghost small" onclick="deleteTask('${task.id}')">Hapus</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTxns() {
  const el = document.getElementById('txnList');
  if (!el) return;
  
  if (appData.finance.transactions.length === 0) {
    el.innerHTML = '<div class="muted-xs">Belum ada transaksi</div>';
    return;
  }
  
  el.innerHTML = appData.finance.transactions.map(tx => `
    <div class="list-item">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="color: ${tx.type === 'income' ? 'var(--success)' : 'var(--error)'}">
            ${tx.type === 'income' ? '+' : '-'}Rp ${parseInt(tx.amount).toLocaleString('id-ID')}
          </strong>
          <div class="muted-xs">${tx.category} • ${tx.date}</div>
        </div>
        <div class="muted-xs">${tx.description || ''}</div>
      </div>
    </div>
  `).join('');
}

function renderSavings() {
  const el = document.getElementById('savingsList');
  if (!el) return;
  
  if (appData.finance.savings.length === 0) {
    el.innerHTML = '<div class="muted-xs">Belum ada tabungan</div>';
    return;
  }
  
  el.innerHTML = appData.finance.savings.map(s => `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(s.name)}</strong>
        <div class="muted-xs">Target: Rp ${parseInt(s.target).toLocaleString('id-ID')}</div>
      </div>
    </div>
  `).join('');
}

function renderMiniCalendar() {
  const el = document.getElementById('miniCalendar');
  if (!el) return;
  
  const now = new Date();
  const month = now.toLocaleString('id-ID', { month: 'long' });
  const year = now.getFullYear();
  
  el.innerHTML = `
    <div style="text-align:center;font-weight:600;margin-bottom:8px">${month} ${year}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
      <div class="muted-xs">M</div><div class="muted-xs">S</div><div class="muted-xs">S</div>
      <div class="muted-xs">R</div><div class="muted-xs">K</div><div class="muted-xs">J</div><div class="muted-xs">S</div>
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div>
    </div>
    <div class="muted-xs" style="text-align:center;margin-top:8px">Hari ini: ${now.getDate()}</div>
  `;
}

function renderTimerHistory() {
  const el = document.getElementById('timerHistory');
  if (!el) return;
  
  if (appData.timerHistory.length === 0) {
    el.innerHTML = '<div class="muted-xs">Belum ada riwayat timer</div>';
    return;
  }
  
  el.innerHTML = `
    <h3 style="margin:0">Riwayat Timer</h3>
    <div style="margin-top:10px">
      ${appData.timerHistory.map(session => `
        <div class="list-item">
          <div>
            <strong>${new Date(session.date).toLocaleString('id-ID')}</strong>
            <div class="muted-xs">Durasi: ${Math.floor(session.duration / 60)} menit</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAnalytics() {
  // Simple analytics rendering
  const el = document.getElementById('prodChart');
  if (!el) return;
  
  // This is a placeholder - in a real implementation you would use Chart.js
  el.innerHTML = '<div class="muted-xs" style="text-align:center;padding:40px">Visualisasi produktivitas akan ditampilkan di sini</div>';
}

// Task management functions
function addTask() {
  const title = prompt('Masukkan judul tugas:');
  if (title) {
    const due = prompt('Tenggat waktu (opsional, format: YYYY-MM-DD):');
    appData.tasks.push({
      id: uid(),
      title: title,
      due: due || '',
      done: false,
      created: new Date().toISOString()
    });
    saveData();
    renderTasks();
    toast('Tugas ditambahkan');
  }
}

function toggleTask(id) {
  const task = appData.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveData();
    renderTasks();
    renderDashboard();
  }
}

function deleteTask(id) {
  if (confirm('Hapus tugas ini?')) {
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    renderDashboard();
    toast('Tugas dihapus');
  }
}

// Financial calculations
function calculateBalance() {
  return appData.finance.transactions.reduce((total, tx) => {
    return tx.type === 'income' ? total + parseInt(tx.amount) : total - parseInt(tx.amount);
  }, 0);
}

// Voice recognition
let recognition = null;

function startVoice() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    toast('SpeechRecognition tidak didukung di browser ini');
    return;
  }
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'id-ID';
  recognition.interimResults = false;
  
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    toast('Didengar: ' + transcript);
    processVoiceCommand(transcript);
  };
  
  recognition.onerror = (e) => {
    toast('Error pengenalan suara: ' + e.error);
  };
  
  recognition.start();
  toast('Mendengarkan...');
}

function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  
  if (lower.includes('tambah tugas') || lower.includes('buat tugas')) {
    addTask();
  } else if (lower.includes('dashboard')) {
    switchPanel('dashboard');
  } else if (lower.includes('tugas')) {
    switchPanel('tasks');
  } else if (lower.includes('keuangan')) {
    switchPanel('finance');
  } else {
    toast('Perintah tidak dikenali: ' + transcript);
  }
}

// Backup & Exports
function exportXlsx() {
  try {
    // This would require the xlsx library to be included
    toast('Fitur ekspor XLSX memerlukan library tambahan');
    console.log('Export data:', appData);
  } catch (e) {
    console.error('XLSX export error:', e);
    toast('Ekspor XLSX gagal');
  }
}

function exportJson() {
  try {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganesa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup JSON berhasil diunduh');
  } catch (e) {
    console.error('JSON export error:', e);
    toast('Ekspor JSON gagal');
  }
}

// Utility functions
function updateDateTime() {
  const el = document.getElementById('dateTime');
  if (el) {
    el.textContent = new Date().toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Initialize application
function init() {
  loadData();
  buildLayout();
  
  // Set theme
  if (appData.settings.theme) {
    document.body.setAttribute('data-theme', appData.settings.theme);
  }
  
  // Check authentication
  if (localStorage.getItem('ganesa_logged_in') === '1' && appData.settings.pinHash) {
    // User is logged in, render app
    renderAll();
  } else {
    // Show login
    showLogin();
  }
  
  // Update date time every minute
  setInterval(updateDateTime, 60000);
  updateDateTime();
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential module use
export { appData, saveData };