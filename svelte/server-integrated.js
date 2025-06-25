// server-integrated.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Constants
const DATA_DIR = path.join(__dirname, 'data');
const ACTIVE_TESTERS_FILE = path.join(DATA_DIR, 'active-testers.json');
const COMPLETED_TESTS_FILE = path.join(DATA_DIR, 'completed-tests.json');
const PORT = process.env.PORT || 80;
const SVELTE_PORT = process.env.SVELTE_PORT || 5173;

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', `http://localhost:${SVELTE_PORT}`);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files (tasks.xlsx, herbie-keywords.json, etc.)
app.use('/tasks.xlsx', express.static(path.join(__dirname, 'static/tasks.xlsx')));
app.use('/herbie-keywords.json', express.static(path.join(__dirname, 'static/herbie-keywords.json')));

// In development, proxy SvelteKit requests
if (process.env.NODE_ENV !== 'production') {
  console.log('Development mode: Proxying non-API requests to SvelteKit');
}

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
    console.log(`Loaded ${activeTesters.length} active testers and ${completedTests.length} completed tests`);
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
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        clients.delete(ws);
      }
    }
  }
}

// Send to a client
function sendMessage(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (error) {
      console.error('Error sending message to client:', error);
      clients.delete(ws);
    }
  }
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

// Validate completeTest
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
  
  console.log(`Starting test: ${entry.testerName} - ${entry.taskName}`);
  
  // Remove any existing active tests for this tester + task combination
  activeTesters = activeTesters.filter(t => !(t.testerName === entry.testerName && t.taskId === entry.taskId));
  
  // Also remove any active test for the same tester (they can only do one at a time)
  activeTesters = activeTesters.filter(t => t.testerName !== entry.testerName);
  
  // Add the new entry
  activeTesters.push(entry);
  saveData();
  broadcastState();
}

// Handle completeTest
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
  
  console.log(`Completing test: ${entry.testerName} - ${entry.taskName} - ${entry.time}s`);
  
  // Remove this tester from active testers for this task
  activeTesters = activeTesters.filter(t => !(t.testerName === entry.testerName && t.taskId === entry.taskId));
  
  // Check if this task was already completed by this tester
  const existingIndex = completedTests.findIndex(t => 
    t.testerName === entry.testerName && t.taskId === entry.taskId
  );
  
  // If it exists, replace it only if the new time is better
  if (existingIndex >= 0) {
    if (entry.time < completedTests[existingIndex].time) {
      console.log(`Updating better time for ${entry.testerName} - ${entry.taskName}`);
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

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`WebSocket client connected: ${ip}`);
  clients.add(ws);
  
  // Send initial state
  sendMessage(ws, { type: 'initialState', activeTesters, completedTests });
  
  ws.on('message', raw => {
    let msg;
    try { 
      msg = JSON.parse(raw); 
    } catch (error) { 
      console.error('Invalid JSON received:', raw);
      return; 
    }
    
    console.log(`Received ${msg.type} from ${ip}`);
    
    if (msg.type === 'startTest' && validateStartTest(msg)) {
      handleStartTest(msg);
    } else if (msg.type === 'completeTest' && validateCompleteTest(msg)) {
      handleCompleteTest(msg);
    } else if (msg.type === 'heartbeat') {
      sendMessage(ws, { type: 'heartbeat' });
    } else if (msg.type === 'getState') {
      sendMessage(ws, { type: 'stateUpdate', activeTesters, completedTests });
    }
  });
  
  ws.on('close', () => { 
    clients.delete(ws); 
    console.log(`WebSocket client disconnected: ${ip}`); 
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error from ${ip}:`, error);
    clients.delete(ws);
  });
});

// API routes
app.get('/api/leaderboard', (req, res) => {
  res.json({ activeTesters, completedTests });
});

app.post('/api/reset', (req, res) => { 
  console.log('Resetting leaderboard data');
  activeTesters = []; 
  completedTests = []; 
  saveData(); 
  broadcastState(); 
  res.json({ success: true }); 
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeTesters: activeTesters.length, 
    completedTests: completedTests.length,
    connectedClients: clients.size
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Express server with WebSocket running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/leaderboard`);
  console.log(`  POST /api/reset`);
  console.log(`  GET  /api/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\nFor development:`);
    console.log(`1. Start this server: npm run dev:server`);
    console.log(`2. Start SvelteKit: npm run dev`);
    console.log(`3. Or run both: npm start`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => { 
  console.log('\nShutting down gracefully...');
  saveData(); 
  wss.clients.forEach(c => c.terminate()); 
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  }); 
});