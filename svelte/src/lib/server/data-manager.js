// src/lib/server/data-manager.js - Server-side data management
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVE_TESTERS_FILE = path.join(DATA_DIR, 'active-testers.json');
const COMPLETED_TESTS_FILE = path.join(DATA_DIR, 'completed-tests.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory storage
let activeTesters = [];
let completedTests = [];
let sseClients = new Set();

// Load persisted data
function loadData() {
  try {
    if (!fs.existsSync(ACTIVE_TESTERS_FILE)) {
      fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify([]));
    }
    if (!fs.existsSync(COMPLETED_TESTS_FILE)) {
      fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify([]));
    }
    
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

// Initialize data
loadData();

// Sanitize input
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Broadcast updates to all SSE clients
function broadcastUpdate() {
  const data = JSON.stringify({
    type: 'stateUpdate',
    activeTesters,
    completedTests,
    timestamp: new Date().toISOString()
  });
  
  // Send to all connected SSE clients
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
      sseClients.delete(client);
    }
  }
}

// API functions
export const dataManager = {
  // Get current state
  getState() {
    return {
      activeTesters: [...activeTesters],
      completedTests: [...completedTests]
    };
  },

  // Add SSE client
  addSSEClient(response) {
    sseClients.add(response);
    console.log(`SSE client connected. Total clients: ${sseClients.size}`);
    
    // Send initial state
    const initialData = JSON.stringify({
      type: 'initialState',
      activeTesters,
      completedTests,
      timestamp: new Date().toISOString()
    });
    
    try {
      response.write(`data: ${initialData}\n\n`);
    } catch (error) {
      console.error('Error sending initial SSE data:', error);
      sseClients.delete(response);
    }

    // Handle client disconnect
    response.on('close', () => {
      sseClients.delete(response);
      console.log(`SSE client disconnected. Total clients: ${sseClients.size}`);
    });
  },

  // Start test
  startTest(data) {
    try {
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
      broadcastUpdate();

      return { success: true };
    } catch (error) {
      console.error('Error starting test:', error);
      return { success: false, error: error.message };
    }
  },

  // Complete test
  completeTest(data) {
    try {
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
      broadcastUpdate();

      return { success: true };
    } catch (error) {
      console.error('Error completing test:', error);
      return { success: false, error: error.message };
    }
  },

  // Reset all data
  reset() {
    try {
      console.log('Resetting leaderboard data');
      activeTesters = [];
      completedTests = [];
      saveData();
      broadcastUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error resetting data:', error);
      return { success: false, error: error.message };
    }
  },

  // Get stats
  getStats() {
    return {
      activeTesters: activeTesters.length,
      completedTests: completedTests.length,
      connectedClients: sseClients.size
    };
  }
};

// src/routes/api/leaderboard/+server.js
import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  try {
    const state = dataManager.getState();
    return json(state);
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    return json({ error: 'Failed to get leaderboard data' }, { status: 500 });
  }
}

// src/routes/api/start-test/+server.js
import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate input
    if (!data.testerName || !data.taskId || !data.taskName) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = dataManager.startTest(data);
    
    if (result.success) {
      return json(result);
    } else {
      return json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error starting test:', error);
    return json({ error: 'Failed to start test' }, { status: 500 });
  }
}

// src/routes/api/complete-test/+server.js
import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate input
    if (!data.testerName || !data.taskId || !data.taskName || 
        data.time === undefined || data.steps === undefined || data.errors === undefined) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = dataManager.completeTest(data);
    
    if (result.success) {
      return json(result);
    } else {
      return json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error completing test:', error);
    return json({ error: 'Failed to complete test' }, { status: 500 });
  }
}

// src/routes/api/reset/+server.js
import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function POST() {
  try {
    const result = dataManager.reset();
    
    if (result.success) {
      return json(result);
    } else {
      return json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return json({ error: 'Failed to reset leaderboard' }, { status: 500 });
  }
}

// src/routes/api/health/+server.js
import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  try {
    const stats = dataManager.getStats();
    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting health status:', error);
    return json({ error: 'Health check failed' }, { status: 500 });
  }
}

// src/routes/api/events/+server.js - Server-Sent Events endpoint
import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE headers
      const response = {
        write: (data) => {
          controller.enqueue(new TextEncoder().encode(data));
        },
        on: (event, handler) => {
          // Mock event handling for client disconnect
          if (event === 'close') {
            // Store the handler to call when stream closes
            response._closeHandler = handler;
          }
        }
      };

      // Add client to data manager
      dataManager.addSSEClient(response);

      // Handle stream close
      return () => {
        if (response._closeHandler) {
          response._closeHandler();
        }
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}