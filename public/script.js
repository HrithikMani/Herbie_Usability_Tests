// script.js — Complete, with proper verify_statements rendering

// Application state
const state = {
    tasks: [],
    filteredTasks: [],
    currentPage: 1,
    itemsPerPage: 2,
    testerName: "",
    socket: null,
    reconnectAttempts: 0,
    reconnectTimeout: null,
    isReconnecting: false,
    observer: null
  };
  
  // Cached elements
  const elemCache = {};
  
  /** Initialize the application */
  function init() {
    cacheElements();
    checkStoredTesterName();
    setupEventListeners();
    setupTestResultObserver();
  }
  
  /** Cache DOM elements for performance */
  function cacheElements() {
    elemCache.testerModal = document.getElementById('testerModal');
    elemCache.testerForm = document.getElementById('testerForm');
    elemCache.testerName = document.getElementById('testerName');
    elemCache.mainContent = document.getElementById('mainContent');
    elemCache.welcomeMessage = document.getElementById('welcomeMessage');
    elemCache.searchQuery = document.getElementById('searchQuery');
    elemCache.logoutButton = document.getElementById('logoutButton');
    elemCache.taskList = document.getElementById('taskList');
    elemCache.paginationNumbers = document.getElementById('paginationNumbers');
    elemCache.prevBtn = document.getElementById('prevBtn');
    elemCache.nextBtn = document.getElementById('nextBtn');
    elemCache.usabilityTestResults = document.getElementById('usabilityTestResults');
  
    // Add leaderboard link if missing
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('.header-right a[href="/leaderboard"]')) {
      const link = document.createElement('a');
      link.href = '/leaderboard';
      link.className = 'button';
      link.textContent = 'View Leaderboard';
      link.target = '_blank';
      headerRight.insertBefore(link, headerRight.firstChild);
    }
  }
  
  /** Show login modal or load tasks */
  function checkStoredTesterName() {
    const stored = localStorage.getItem('testerName');
    if (stored) {
      state.testerName = stored;
      elemCache.testerModal.style.display = 'none';
      elemCache.mainContent.style.display = 'block';
      elemCache.welcomeMessage.textContent = `Welcome, ${state.testerName}!`;
      connectWebSocket();
      fetchTasks();
    } else {
      elemCache.testerModal.style.display = 'flex';
    }
  }
  
  /** Set up button, form, and visibility event listeners */
  function setupEventListeners() {
    elemCache.testerForm.addEventListener('submit', handleTesterFormSubmit);
    elemCache.logoutButton.addEventListener('click', handleLogout);
    elemCache.searchQuery.addEventListener('input', filterTasks);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && state.socket?.readyState !== WebSocket.OPEN && !state.isReconnecting) {
      connectWebSocket();
    }
  }
  
  /** Login form handler */
  function handleTesterFormSubmit(e) {
    e.preventDefault();
    const name = elemCache.testerName.value.trim();
    if (!name) return;
    state.testerName = name;
    localStorage.setItem('testerName', name);
    elemCache.testerModal.style.display = 'none';
    elemCache.mainContent.style.display = 'block';
    elemCache.welcomeMessage.textContent = `Welcome, ${name}!`;
    connectWebSocket();
    fetchTasks();
  }
  
  /** Logout handler */
  function handleLogout() {
    localStorage.removeItem('testerName');
    state.testerName = '';
    elemCache.testerModal.style.display = 'flex';
    elemCache.mainContent.style.display = 'none';
    closeWebSocket();
  }
  
  /** WebSocket connect with exponential backoff */
  function connectWebSocket() {
    if (state.isReconnecting) return;
    state.isReconnecting = true;
    if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, state.reconnectAttempts), 30000);
    console.log(`WS reconnect in ${delay}ms`);
    state.reconnectTimeout = setTimeout(() => {
      state.reconnectAttempts++;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      state.socket = new WebSocket(`${proto}//${location.host}`);
      state.socket.addEventListener('open', handleSocketOpen);
      state.socket.addEventListener('message', handleSocketMessage);
      state.socket.addEventListener('close', handleSocketClose);
      state.socket.addEventListener('error', handleSocketError);
    }, delay);
  }
  
  function handleSocketOpen() {
    console.log('WS open');
    state.reconnectAttempts = 0;
    state.isReconnecting = false;
    startHeartbeat();
  }
  
  function handleSocketMessage(event) {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'initialState':
      case 'stateUpdate':
        updateActiveTesters(data.activeTesters);
        updateCompletedTests(data.completedTests);
        break;
      default:
        console.warn('Unknown WS', data.type);
    }
  }
  
  function handleSocketClose(e) {
    console.log('WS closed', e.code);
    scheduleReconnect();
  }
  
  function handleSocketError() {
    console.error('WS error');
  }
  
  function scheduleReconnect() {
    if (state.reconnectAttempts < 10) {
      state.isReconnecting = false;
      connectWebSocket();
    }
  }
  
  /** Heartbeat pings */
  function startHeartbeat() {
    if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
    window.heartbeatInterval = setInterval(() => {
      if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
  }
  
  /** Close WS and clear timers */
  function closeWebSocket() {
    clearInterval(window.heartbeatInterval);
    clearTimeout(state.reconnectTimeout);
    if (state.socket) state.socket.close();
    state.isReconnecting = false;
  }
  
  /** Send JSON message */
  function sendWebSocketMessage(msg) {
    if (state.socket?.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }
  
  /** Fetch tasks.xlsx, parse to JSON, then render */
  async function fetchTasks() {
    try {
      const res = await fetch('tasks.xlsx');
      if (!res.ok) throw new Error(res.statusText);
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      state.tasks = XLSX.utils.sheet_to_json(ws) || [];
      state.filteredTasks = [...state.tasks];
      renderTasks();
      renderPagination();
    } catch (err) {
      console.error('Fetch tasks error', err);
      showError('Failed to load tasks file');
    }
  }
  
  /** Filter tasks by search */
  function filterTasks() {
    const q = elemCache.searchQuery.value.toLowerCase();
    state.filteredTasks = state.tasks.filter(t => t.name.toLowerCase().includes(q));
    state.currentPage = 1;
    renderTasks(); renderPagination();
  }
  
  /** Render task cards */
  function renderTasks() {
    elemCache.taskList.innerHTML = '';
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const slice = state.filteredTasks.slice(start, start + state.itemsPerPage);
    if (!slice.length) {
      elemCache.taskList.innerHTML = `<div class="empty-message">No tasks${elemCache.searchQuery.value?' matching search':''}</div>`;
      return;
    }
    slice.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.dataset.taskId = task.id;
      card.innerHTML = `
        <div class="task-header">
          <h3>${escapeHtml(task.name)}</n3>
          <span class="task-status">Not Started</span>
        </div>
        <p>${escapeHtml(task.description)}</p>
        <div class="test-results" id="test-results-${task.id}"></div>
        <button class="button start-test-btn" data-task-id="${task.id}">Start Test</button>
      `;
      elemCache.taskList.appendChild(card);
    });
    document.querySelectorAll('.start-test-btn').forEach(btn => {
      btn.addEventListener('click', () => startTest(+btn.dataset.taskId));
    });
  }
  
  /** Render pagination buttons */
  function renderPagination() {
    const total = Math.ceil(state.filteredTasks.length / state.itemsPerPage);
    elemCache.paginationNumbers.innerHTML = '';
    for (let i=1; i<=total; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `pagination-button ${i===state.currentPage?'active':''}`;
      btn.addEventListener('click', ()=> setPage(i));
      elemCache.paginationNumbers.appendChild(btn);
    }
    elemCache.prevBtn.disabled = state.currentPage===1;
    elemCache.nextBtn.disabled = state.currentPage===total;
  }
  
  function setPage(p) { state.currentPage = p; renderTasks(); renderPagination(); elemCache.taskList.scrollIntoView({behavior:'smooth'}); }
  function prevPage() { if(state.currentPage>1) setPage(state.currentPage-1); }
  function nextPage() { const total = Math.ceil(state.filteredTasks.length/state.itemsPerPage); if(state.currentPage<total) setPage(state.currentPage+1); }
  
  /** Start a usability test */
  function startTest(id) {
    const task = state.tasks.find(t=>t.id===id);
    if (!task) return;
    const card = document.querySelector(`[data-task-id='${id}']`);
    card.querySelector('.task-status').textContent='In Progress';
  
    // Notify server
    sendWebSocketMessage({ type:'startTest', testerName: state.testerName, taskId: id, taskName: task.name });
  
    // Post message to Herbie iframe/script
    window.postMessage({ action:'startUsabilityTest', testerName: state.testerName, taskId: id, taskName: task.name, description: task.description||'', testHerbieScript: task.herbie_script||''}, '*');
  
    if (task.url) window.open(task.url, '_blank');
  }
  
  /** Observe for incoming test-results JSON */
  function setupTestResultObserver() {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type==='attributes' && m.attributeName==='data-test-results') {
          handleTestResults(m.target.getAttribute('data-test-results'));
        }
      });
    });
    state.observer.observe(elemCache.usabilityTestResults, { attributes:true });
  }
  
  /** Render and send completeTest, including verify_statements */
  function handleTestResults(resultsData) {
    let newResults;
    try {
      newResults = JSON.parse(resultsData);
    } catch {
      console.error('Invalid JSON in data-test-results');
      return;
    }
  
    // Update status
    const card = document.querySelector(`[data-task-id='${newResults.taskId}']`);
    const statusEl = card.querySelector('.task-status');
    statusEl.textContent = 'Completed';
    statusEl.classList.replace('in-progress','completed');
  
    // Render results
    const resultsDiv = document.getElementById(`test-results-${newResults.taskId}`);
    let html = '<h3>Test Results</h3>';
    Object.entries(newResults).forEach(([key,val])=>{
      if (key==='verify_statements') return;
      html += `<p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(val.toString())}</p>`;
    });
  
    // Verifications
    try {
      const verifs = JSON.parse(newResults.verify_statements);
      html += '<div class="verifications"><h4>Verifications</h4>';
      Object.entries(verifs).forEach(([assertion, result])=>{
        const cls = result.success?'verification success':'verification failure';
        html += `<div class="${cls}"><div class="assertion">${escapeHtml(assertion)}</div><div class="message">${escapeHtml(result.message)}</div></div>`;
      });
      html += '</div>';
    } catch {
      html += '<p>Error parsing verifications.</p>';
    }
  
    resultsDiv.innerHTML = html;
  
    // Convert time and notify leaderboard
    const [mins, secs] = (newResults.time||'0:00').split(':');
    const timeSec = (parseInt(mins,10)||0)*60 + (parseFloat(secs)||0);
    sendWebSocketMessage({ type:'completeTest', testerName:state.testerName, taskId:newResults.taskId, taskName:newResults.taskName, time:timeSec, steps:parseInt(newResults.steps,10)||0, errors:parseInt(newResults.errors,10)||0, rating:2.5 });
  }
  
  /** HTML-escape a string */
  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  
  /** Show an error banner */
  function showError(msg) {
    const el = document.createElement('div');
    el.className = 'error-message';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),5000);
  }
  
  // Kick off after DOM load
  document.addEventListener('DOMContentLoaded', init);
  window.prevPage = prevPage;
  window.nextPage = nextPage;
  window.setPage = setPage;