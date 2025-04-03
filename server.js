/**
 * Usability Testing Leaderboard Server
 * Express server with WebSocket integration for real-time leaderboard updates
 */

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

// In-memory data storage with persistence
let activeTesters = [];
let completedTests = [];

/**
 * Load data from persistent storage
 */
/**
 * Load data from persistent storage
 */
function loadData() {
    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`Created data directory at ${DATA_DIR}`);
        }
        
        // Load active testers
        if (fs.existsSync(ACTIVE_TESTERS_FILE)) {
            const content = fs.readFileSync(ACTIVE_TESTERS_FILE, 'utf8');
            if (content && content.trim()) {
                activeTesters = JSON.parse(content);
                console.log(`Loaded ${activeTesters.length} active testers from storage`);
            } else {
                // File exists but is empty, initialize with empty array
                activeTesters = [];
                console.log('Active testers file exists but is empty, initializing with empty array');
            }
        } else {
            // File doesn't exist, create it with empty array
            activeTesters = [];
            fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify(activeTesters, null, 2));
            console.log(`Created empty active testers file at ${ACTIVE_TESTERS_FILE}`);
        }
        
        // Load completed tests
        if (fs.existsSync(COMPLETED_TESTS_FILE)) {
            const content = fs.readFileSync(COMPLETED_TESTS_FILE, 'utf8');
            if (content && content.trim()) {
                completedTests = JSON.parse(content);
                console.log(`Loaded ${completedTests.length} completed tests from storage`);
            } else {
                // File exists but is empty, initialize with empty array
                completedTests = [];
                console.log('Completed tests file exists but is empty, initializing with empty array');
            }
        } else {
            // File doesn't exist, create it with empty array
            completedTests = [];
            fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify(completedTests, null, 2));
            console.log(`Created empty completed tests file at ${COMPLETED_TESTS_FILE}`);
        }
    } catch (error) {
        console.error('Error loading data from storage:', error);
        // Initialize with empty arrays to prevent further errors
        activeTesters = [];
        completedTests = [];
        
        // Create default files to prevent future errors
        try {
            fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify([], null, 2));
            fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify([], null, 2));
            console.log('Created default empty data files after error');
        } catch (writeError) {
            console.error('Error creating default data files:', writeError);
        }
    }
}

/**
 * Save data to persistent storage
 */
function saveData() {
    try {
        fs.writeFileSync(ACTIVE_TESTERS_FILE, JSON.stringify(activeTesters, null, 2));
        fs.writeFileSync(COMPLETED_TESTS_FILE, JSON.stringify(completedTests, null, 2));
    } catch (error) {
        console.error('Error saving data to storage:', error);
    }
}

// Load saved data on startup
loadData();

// Track connected clients for broadcasting
const clients = new Set();

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`Client connected: ${clientIp}`);
    clients.add(ws);
    
    // Send initial state to newly connected client
    sendMessage(ws, {
        type: 'initialState',
        activeTesters,
        completedTests
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            if (!data.type) {
                console.warn('Received message without type:', data);
                return;
            }
            
            console.log(`Received ${data.type} from ${clientIp}`);
            
            switch(data.type) {
                case 'startTest':
                    if (validateStartTest(data)) {
                        handleStartTest(data);
                    }
                    break;
                    
                case 'completeTest':
                    if (validateCompleteTest(data)) {
                        handleCompleteTest(data);
                    }
                    break;
                    
                case 'heartbeat':
                    // Keep connection alive
                    sendMessage(ws, { type: 'heartbeat' });
                    break;
                    
                default:
                    console.warn(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientIp}`);
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientIp}:`, error);
        clients.delete(ws);
    });
});

/**
 * Validate startTest message data
 * @param {Object} data - The message data
 * @returns {boolean} - Whether the data is valid
 */
function validateStartTest(data) {
    if (!data.testerName || typeof data.testerName !== 'string') {
        console.warn('Invalid testerName in startTest message');
        return false;
    }
    
    if (!data.taskId || isNaN(parseInt(data.taskId))) {
        console.warn('Invalid taskId in startTest message');
        return false;
    }
    
    if (!data.taskName || typeof data.taskName !== 'string') {
        console.warn('Invalid taskName in startTest message');
        return false;
    }
    
    return true;
}

/**
 * Validate completeTest message data
 * @param {Object} data - The message data
 * @returns {boolean} - Whether the data is valid
 */
function validateCompleteTest(data) {
    if (!validateStartTest(data)) {
        return false;
    }
    
    if (isNaN(parseFloat(data.time)) || data.time < 0) {
        console.warn('Invalid time in completeTest message');
        return false;
    }
    
    if (isNaN(parseInt(data.steps)) || data.steps < 0) {
        console.warn('Invalid steps in completeTest message');
        return false;
    }
    
    if (isNaN(parseInt(data.errors)) || data.errors < 0) {
        console.warn('Invalid errors in completeTest message');
        return false;
    }
    
    if (isNaN(parseInt(data.rating)) || data.rating < 1 || data.rating > 5) {
        console.warn('Invalid rating in completeTest message');
        return false;
    }
    
    return true;
}

/**
 * Handle startTest event
 * @param {Object} data - The startTest data
 */
function handleStartTest(data) {
    // Sanitize inputs to prevent XSS
    const sanitizedData = {
        testerName: sanitize(data.testerName),
        taskId: parseInt(data.taskId),
        taskName: sanitize(data.taskName),
        startTime: new Date().toISOString()
    };
    
    // Remove existing entry for this tester if exists
    activeTesters = activeTesters.filter(t => t.testerName !== sanitizedData.testerName);
    
    // Add new entry
    activeTesters.push(sanitizedData);
    
    // Save to persistent storage
    saveData();
    
    // Broadcast updated state
    broadcastState();
}

/**
 * Handle completeTest event
 * @param {Object} data - The completeTest data
 */
function handleCompleteTest(data) {
    // Sanitize inputs to prevent XSS
    const sanitizedData = {
        testerName: sanitize(data.testerName),
        taskId: parseInt(data.taskId),
        taskName: sanitize(data.taskName),
        time: parseFloat(data.time),
        steps: parseInt(data.steps),
        errors: parseInt(data.errors),
        rating: parseInt(data.rating),
        completedAt: new Date().toISOString()
    };
    
    // Remove from active testers
    activeTesters = activeTesters.filter(t => 
        !(t.testerName === sanitizedData.testerName && t.taskId === sanitizedData.taskId)
    );
    
    // Add to completed tests
    completedTests.push(sanitizedData);
    
    // Sort by time (fastest first)
    completedTests.sort((a, b) => a.time - b.time);
    
    // Keep only the top 100 results to prevent unlimited growth
    if (completedTests.length > 100) {
        completedTests = completedTests.slice(0, 100);
    }
    
    // Save to persistent storage
    saveData();
    
    // Broadcast updated state
    broadcastState();
}

/**
 * Send a message to a WebSocket client
 * @param {WebSocket} ws - The WebSocket client
 * @param {Object} message - The message to send
 */
function sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

/**
 * Broadcast state to all connected clients
 */
function broadcastState() {
    const state = {
        type: 'stateUpdate',
        activeTesters,
        completedTests
    };
    
    const stateJson = JSON.stringify(state);
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(stateJson);
        }
    });
}

/**
 * Sanitize a string to prevent XSS
 * @param {string} input - The input string
 * @returns {string} - The sanitized string
 */
function sanitize(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// API Routes

/**
 * GET /api/leaderboard - Get the current leaderboard state
 */
app.get('/api/leaderboard', (req, res) => {
    res.json({
        activeTesters,
        completedTests
    });
});

/**
 * POST /api/reset - Reset the leaderboard
 */
app.post('/api/reset', (req, res) => {
    activeTesters = [];
    completedTests = [];
    
    // Save to persistent storage
    saveData();
    
    // Broadcast updated state
    broadcastState();
    
    res.json({ success: true, message: 'Leaderboard reset successfully' });
});

/**
 * GET /leaderboard - Serve the leaderboard page
 */
app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

/**
 * Catch-all route for SPA
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`- Main application: http://localhost:${PORT}`);
    console.log(`- Leaderboard: http://localhost:${PORT}/leaderboard`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server gracefully...');
    
    // Save data before exit
    saveData();
    
    // Close all WebSocket connections
    wss.clients.forEach(client => {
        client.terminate();
    });
    
    // Close HTTP server
    server.close(() => {
        console.log('Server shut down successfully');
        process.exit(0);
    });
});