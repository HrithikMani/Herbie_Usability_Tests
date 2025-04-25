const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Constants
const DATA_DIR = path.join(__dirname, 'data');
const ACTIVE_TESTERS_FILE = path.join(DATA_DIR, 'active-testers.json');
const COMPLETED_TESTS_FILE = path.join(DATA_DIR, 'completed-tests.json');
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory storage
let activeTesters = [];
let completedTests = [];

// Load persisted data
function loadData() {
  try {
    if (!fs.existsSync(ACTIVE_TESTERS_FILE)) fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify([]));
    if (!fs.existsSync(COMPLETED_TESTS_FILE)) fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify([]));
    activeTesters = JSON.parse(fs.readFileSync(ACTIVE_TESTERS_FILE, 'utf8') || '[]');
    completedTests = JSON.parse(fs.readFileSync(COMPLETED_TESTS_FILE, 'utf8') || '[]');
  } catch (err) {
    console.error('Error loading data:', err);
    activeTesters = [];
    completedTests = [];
  }
}

// Save data
function saveData() {
  try {
    fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify(activeTesters, null, 2));
    fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify(completedTests, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

loadData();

// Track clients
const clients = new Set();

// Broadcast update
function broadcastState() {
  const payload = JSON.stringify({ type: 'stateUpdate', activeTesters, completedTests });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// Send to a client
function sendMessage(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// Sanitize
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate startTest
function validateStartTest(data) {
  return (
    data.testerName && typeof data.testerName === 'string' &&
    data.taskId && !isNaN(parseInt(data.taskId)) &&
    data.taskName && typeof data.taskName === 'string'
  );
}

// Validate completeTest (no rating)
function validateCompleteTest(data) {
  if (!validateStartTest(data)) return false;
  if (isNaN(parseFloat(data.time)) || data.time < 0) return false;
  if (isNaN(parseInt(data.steps)) || data.steps < 0) return false;
  if (isNaN(parseInt(data.errors)) || data.errors < 0) return false;
  return true;
}

// Handle startTest
function handleStartTest(data) {
  const entry = {
    testerName: sanitize(data.testerName),
    taskId: parseInt(data.taskId),
    taskName: sanitize(data.taskName),
    startTime: new Date().toISOString()
  };
  
  // Remove any existing active tests for this tester + task combination
  activeTesters = activeTesters.filter(t => !(t.testerName === entry.testerName && t.taskId === entry.taskId));
  
  // Also remove any active test for the same tester (they can only do one at a time)
  activeTesters = activeTesters.filter(t => t.testerName !== entry.testerName);
  
  // Add the new entry
  activeTesters.push(entry);
  saveData();
  broadcastState();
}


// Handle completeTest (without rating)
function handleCompleteTest(data) {
  const entry = {
    testerName: sanitize(data.testerName),
    taskId: parseInt(data.taskId),
    taskName: sanitize(data.taskName),
    time: parseFloat(data.time),
    steps: parseInt(data.steps),
    errors: parseInt(data.errors),
    completedAt: new Date().toISOString()
  };
  
  // Remove this tester from active testers for this task
  activeTesters = activeTesters.filter(t => !(t.testerName === entry.testerName && t.taskId === entry.taskId));
  
  // Check if this task was already completed by this tester
  const existingIndex = completedTests.findIndex(t => 
    t.testerName === entry.testerName && t.taskId === entry.taskId
  );
  
  // If it exists, replace it only if the new time is better
  if (existingIndex >= 0) {
    if (entry.time < completedTests[existingIndex].time) {
      completedTests[existingIndex] = entry;
    }
  } else {
    // Otherwise add it as a new completed test
    completedTests.push(entry);
  }
  
  // Sort by time (fastest first)
  completedTests.sort((a, b) => a.time - b.time);
  
  // Limit to top 100
  if (completedTests.length > 100) {
    completedTests = completedTests.slice(0, 100);
  }
  
  saveData();
  broadcastState();
}
// WebSocket
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`Client connected: ${ip}`);
  clients.add(ws);
  sendMessage(ws, { type: 'initialState', activeTesters, completedTests });
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    console.log(`Received ${msg.type} from ${ip}`);
    if (msg.type === 'startTest' && validateStartTest(msg)) handleStartTest(msg);
    if (msg.type === 'completeTest' && validateCompleteTest(msg)) handleCompleteTest(msg);
    if (msg.type === 'heartbeat') sendMessage(ws, { type: 'heartbeat' });
    // Add handler for getState requests
    if (msg.type === 'getState') sendMessage(ws, { type: 'stateUpdate', activeTesters, completedTests });
  });
  ws.on('close', () => { clients.delete(ws); console.log(`Disconnected: ${ip}`); });
  ws.on('error', () => clients.delete(ws));
});

// API routes
app.get('/api/leaderboard', (req, res) => res.json({ activeTesters, completedTests }));
app.post('/api/reset', (req, res) => { activeTesters = []; completedTests = []; saveData(); broadcastState(); res.json({ success: true }); });
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGINT', () => { saveData(); wss.clients.forEach(c => c.terminate()); server.close(() => process.exit(0)); });