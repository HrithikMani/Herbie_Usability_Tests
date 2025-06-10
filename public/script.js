// script.js — Enhanced with Herbie Keywords functionality

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
  observer: null,
  herbieKeywords: null  // Added for herbie keywords
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
    fetchHerbieKeywords(); // Load herbie keywords
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
  fetchHerbieKeywords(); // Load herbie keywords
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
  // Request initial state
  sendWebSocketMessage({ type: 'getState' });
}

function handleSocketMessage(event) {
  try {
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
  } catch (err) {
    console.error('Error parsing WebSocket message:', err);
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

/** Fetch herbie keywords JSON file */
async function fetchHerbieKeywords() {
  try {
    console.log('Loading herbie keywords...');
    const response = await fetch('herbie-keywords.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    state.herbieKeywords = await response.json();
    console.log('Herbie keywords loaded successfully:', state.herbieKeywords);
    
  } catch (error) {
    console.error('Error loading herbie keywords:', error);
    showError('Failed to load herbie keywords');
    // Set empty keywords object as fallback
    state.herbieKeywords = { globalKeywords: [], localKeywords: {} };
  }
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
  renderTasks();
  renderPagination();
}

/** Render task cards with proper status classes and multiline descriptions */
function renderTasks() {
  elemCache.taskList.innerHTML = '';
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const slice = state.filteredTasks.slice(start, start + state.itemsPerPage);
  
  if (!slice.length) {
    elemCache.taskList.innerHTML = `<div class="empty-message">No tasks${elemCache.searchQuery.value ? ' matching search' : ''}</div>`;
    return;
  }
  
  // Check active and completed tasks
  const activeTesters = window.activeTesters || [];
  const completedTests = window.completedTests || [];
  
  slice.forEach(task => {
    // Determine task status
    let statusText = 'Not Started';
    let statusClass = 'not-started';
    
    // Check if task is completed
    const isCompleted = completedTests && completedTests.some(t => 
      t.testerName === state.testerName && t.taskId === task.id
    );
    
    // Check if task is in progress
    const isActive = activeTesters && activeTesters.some(t => 
      t.testerName === state.testerName && t.taskId === task.id
    );
    
    if (isCompleted) {
      statusText = 'Completed';
      statusClass = 'completed';
    } else if (isActive) {
      statusText = 'In Progress';
      statusClass = 'in-progress';
    }
    
    // Process description to preserve line breaks
    const description = task.description || '';
    const formattedDescription = description
      .split('\n')
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join('');
    
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.taskId = task.id;
    card.innerHTML = `
      <div class="task-header">
        <h3>${escapeHtml(task.name)}</h3>
        <span class="task-status ${statusClass}">${statusText}</span>
      </div>
      <div class="task-description">
        ${formattedDescription}
      </div>
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
  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `pagination-button ${i === state.currentPage ? 'active' : ''}`;
    btn.addEventListener('click', () => setPage(i));
    elemCache.paginationNumbers.appendChild(btn);
  }
  elemCache.prevBtn.disabled = state.currentPage === 1;
  elemCache.nextBtn.disabled = state.currentPage === total || total === 0;
}

function setPage(p) {
  state.currentPage = p;
  renderTasks();
  renderPagination();
  elemCache.taskList.scrollIntoView({ behavior: 'smooth' });
}

function prevPage() {
  if (state.currentPage > 1) setPage(state.currentPage - 1);
}

function nextPage() {
  const total = Math.ceil(state.filteredTasks.length / state.itemsPerPage);
  if (state.currentPage < total) setPage(state.currentPage + 1);
}

/** Enhanced startTest function with herbie keywords */
function startTest(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  
  // Update UI immediately
  const card = document.querySelector(`[data-task-id='${id}']`);
  const statusEl = card.querySelector('.task-status');
  statusEl.textContent = 'In Progress';
  statusEl.className = 'task-status in-progress';

  // Notify server
  sendWebSocketMessage({ 
    type: 'startTest', 
    testerName: state.testerName, 
    taskId: id, 
    taskName: task.name 
  });
console.log(state.herbieKeywords)
  // Post message to Herbie iframe/script with herbie keywords included
  window.postMessage({ 
    action: 'startUsabilityTest', 
    testerName: state.testerName, 
    taskId: id, 
    taskName: task.name, 
    description: task.description || '', 
    testHerbieScript: task.herbie_script || '',
    herbieKeywords: state.herbieKeywords || null
  }, '*');

  // If herbie keywords aren't loaded yet, try to fetch them
  if (!state.herbieKeywords) {
    console.warn('Herbie keywords not loaded - will retry loading');
    fetchHerbieKeywords();
  }

  if (task.url) window.open(task.url, '_blank');
}

/** Observe for incoming test-results JSON */
function setupTestResultObserver() {
  if (state.observer) state.observer.disconnect();
  state.observer = new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'data-test-results') {
        handleTestResults(m.target.getAttribute('data-test-results'));
      }
    });
  });
  state.observer.observe(elemCache.usabilityTestResults, { attributes: true });
}

/** Fixed handleTestResults function to properly update status */
function handleTestResults(resultsData) {
  let newResults;
  try {
    newResults = JSON.parse(resultsData);
  } catch (error) {
    console.error('Invalid JSON in data-test-results:', error);
    return;
  }

  // Update status
  const card = document.querySelector(`[data-task-id='${newResults.taskId}']`);
  if (card) {
    const statusEl = card.querySelector('.task-status');
    if (statusEl) {
      statusEl.textContent = 'Completed';
      statusEl.className = 'task-status completed'; // Use className instead of classList.replace
    }
  } else {
    console.warn('Task card not found:', newResults.taskId);
    return;
  }

  // Render basic results
  const resultsDiv = document.getElementById(`test-results-${newResults.taskId}`);
  if (!resultsDiv) {
    console.warn('Results div not found:', newResults.taskId);
    return;
  }
  
  let html = '<h3>Test Results</h3>';
  Object.entries(newResults).forEach(([key, val]) => {
    if (key === 'verify_statements') return;
    html += `<p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(val.toString())}</p>`;
  });

  // Parse and render verifications, while tallying stats
  let steps = 0, errors = 0;
  try {
    const verifs = JSON.parse(newResults.verify_statements);
    html += '<div class="verifications"><h4>Verifications</h4>';
    Object.entries(verifs).forEach(([assertion, result]) => {
      steps++;
      if (!result.success) errors++;

      const cls = result.success ? 'verification success' : 'verification failure';
      html += `
        <div class="${cls}">
          <div class="assertion">${escapeHtml(assertion)}</div>
          <div class="message">${escapeHtml(result.message)}</div>
        </div>`;
    });
    html += '</div>';
  } catch (error) {
    console.error('Error parsing verifications:', error);
    html += '<p>Error parsing verifications.</p>';
  }

  resultsDiv.innerHTML = html;

  // Compute numeric time
  const [mins, secs] = (newResults.time || '0:00').split(':');
  const timeSec = (parseInt(mins, 10) || 0) * 60 + (parseFloat(secs) || 0);

  // Send real stats to the leaderboard
  sendWebSocketMessage({
    type: 'completeTest',
    testerName: state.testerName,
    taskId: newResults.taskId,
    taskName: newResults.taskName,
    time: timeSec,
    steps: steps,
    errors: errors,
  });
}

/** Function to update active testers state with proper class handling */
function updateActiveTesters(testers) {
  if (testers && Array.isArray(testers)) {
    // Store active testers for reference
    window.activeTesters = testers;
    
    // Update tasks display based on current state
    updateTaskStatuses();
  }
}

/** Function to update completed tests state with proper class handling */
function updateCompletedTests(tests) {
  if (tests && Array.isArray(tests)) {
    // Store completed tests for reference
    window.completedTests = tests;
    
    // Update tasks display based on current state
    updateTaskStatuses();
  }
}

/** New function to update task statuses with correct priority */
function updateTaskStatuses() {
  const activeTesters = window.activeTesters || [];
  const completedTests = window.completedTests || [];
  
  document.querySelectorAll('.task-card').forEach(card => {
    const taskId = parseInt(card.dataset.taskId);
    const statusEl = card.querySelector('.task-status');
    if (!statusEl) return;
    
    // Check completion status first (higher priority)
    const isCompleted = completedTests.some(t => 
      t.testerName === state.testerName && t.taskId === taskId
    );
    
    // Then check active status
    const isActive = activeTesters.some(t => 
      t.testerName === state.testerName && t.taskId === taskId
    );
    
    // Update based on priority: Completed > In Progress > Not Started
    if (isCompleted) {
      statusEl.textContent = 'Completed';
      statusEl.className = 'task-status completed';
    } else if (isActive) {
      statusEl.textContent = 'In Progress';
      statusEl.className = 'task-status in-progress';
    } else {
      statusEl.textContent = 'Not Started';
      statusEl.className = 'task-status not-started';
    }
  });
}

/** HTML-escape a string */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Show an error banner */
function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-message';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// Kick off after DOM load
document.addEventListener('DOMContentLoaded', init);
window.prevPage = prevPage;
window.nextPage = nextPage;
window.setPage = setPage;

// Expose herbie keywords function globally for external access
window.fetchHerbieKeywords = fetchHerbieKeywords;