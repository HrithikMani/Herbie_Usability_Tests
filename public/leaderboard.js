/**
 * Leaderboard Client Script
 * Manages real-time updates for the usability testing leaderboard
 */

// Global variables for WebSocket connection
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
let reconnectTimeout = null;
let isReconnecting = false;

// Timer management
let activeTimers = {};

// DOM elements cache
const elemCache = {};

/**
 * Initialize the application
 */
function init() {
    // Cache DOM elements for better performance
    cacheElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Connect to WebSocket server
    connectWebSocket();
    
    // Set up window event listeners
    setupWindowEvents();
}

/**
 * Cache DOM elements for better performance
 */
function cacheElements() {
    elemCache.activeTesters = document.getElementById('activeTesters');
    elemCache.completedTests = document.getElementById('completedTests');
    elemCache.connectionStatus = document.getElementById('connectionStatus');
    elemCache.resetBtn = document.getElementById('resetBtn');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Reset button
    if (elemCache.resetBtn) {
        elemCache.resetBtn.addEventListener('click', confirmReset);
    }
}

/**
 * Set up window event listeners
 */
function setupWindowEvents() {
    // Handle visibility change to reconnect when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (socket?.readyState !== WebSocket.OPEN && !isReconnecting) {
                console.log('Tab became visible, reconnecting...');
                connectWebSocket();
            }
        }
    });
    
    // Handle page unload to clean up resources
    window.addEventListener('beforeunload', () => {
        clearAllTimers();
        if (socket) {
            socket.close();
        }
    });
}

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
    if (isReconnecting) return;
    
    isReconnecting = true;
    updateConnectionStatus('connecting');
    
    // Calculate reconnection delay with exponential backoff
    const reconnectDelay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    console.log(`Connecting to WebSocket server (attempt ${reconnectAttempts + 1})...`);
    
    // Get the current host and create WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    // Create a new WebSocket connection
    try {
        socket = new WebSocket(wsUrl);
        
        socket.addEventListener('open', handleSocketOpen);
        socket.addEventListener('message', handleSocketMessage);
        socket.addEventListener('close', handleSocketClose);
        socket.addEventListener('error', handleSocketError);
    } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        scheduleReconnect();
    }
}

/**
 * Handle WebSocket open event
 */
function handleSocketOpen() {
    console.log('Connected to WebSocket server');
    updateConnectionStatus('connected');
    reconnectAttempts = 0;
    isReconnecting = false;
    
    // Start heartbeat to keep connection alive
    startHeartbeat();
}

/**
 * Handle WebSocket message event
 * @param {MessageEvent} event - The message event
 */
function handleSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'initialState':
                console.log('Received initial state');
                updateActiveTesters(data.activeTesters);
                updateCompletedTests(data.completedTests);
                break;
                
            case 'stateUpdate':
                console.log('Received state update');
                updateActiveTesters(data.activeTesters);
                updateCompletedTests(data.completedTests);
                break;
                
            case 'heartbeat':
                console.log('Heartbeat received');
                break;
           
            default:
                console.warn('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
    }
}

/**
 * Handle WebSocket close event
 * @param {CloseEvent} event - The close event
 */
function handleSocketClose(event) {
    const reason = event.reason || 'Unknown reason';
    console.log(`WebSocket connection closed: ${reason} (code: ${event.code})`);
    
    updateConnectionStatus('disconnected');
    clearAllTimers();
    scheduleReconnect();
}

/**
 * Handle WebSocket error event
 * @param {Event} event - The error event
 */
function handleSocketError(event) {
    console.error('WebSocket error:', event);
    updateConnectionStatus('disconnected');
    
    // Let the close handler schedule the reconnect
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('Maximum reconnection attempts reached');
        updateConnectionStatus('disconnected', 'Connection failed. Refresh the page to try again.');
        isReconnecting = false;
        return;
    }
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    
    reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        connectWebSocket();
    }, delay);
    
    isReconnecting = true;
}

/**
 * Start heartbeat to keep connection alive
 */
function startHeartbeat() {
    const heartbeatInterval = 30000; // 30 seconds
    
    // Clear any existing heartbeat interval
    if (window.heartbeatInterval) {
        clearInterval(window.heartbeatInterval);
    }
    
    // Set up new heartbeat interval
    window.heartbeatInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log('Sending heartbeat');
            socket.send(JSON.stringify({ type: 'heartbeat' }));
        } else {
            clearInterval(window.heartbeatInterval);
        }
    }, heartbeatInterval);
}

/**
 * Update the connection status display
 * @param {string} status - The connection status ('connected', 'disconnected', 'connecting')
 * @param {string} [message] - Optional custom message
 */
function updateConnectionStatus(status, message) {
    if (!elemCache.connectionStatus) return;
    
    // Remove all status classes
    elemCache.connectionStatus.classList.remove('connected', 'disconnected', 'connecting');
    
    // Add appropriate class and text
    elemCache.connectionStatus.classList.add(status);
    
    let displayText;
    switch (status) {
        case 'connected':
            displayText = 'Connected';
            elemCache.connectionStatus.classList.remove('pulse');
            break;
        case 'disconnected':
            displayText = message || 'Disconnected';
            elemCache.connectionStatus.classList.add('pulse');
            break;
        case 'connecting':
            displayText = `Connecting${reconnectAttempts > 0 ? ` (Attempt ${reconnectAttempts + 1})` : ''}...`;
            elemCache.connectionStatus.classList.add('pulse');
            break;
        default:
            displayText = status;
    }
    
    elemCache.connectionStatus.textContent = displayText;
}

/**
 * Update the active testers display
 * @param {Array} testers - The active testers data
 */
function updateActiveTesters(testers) {
    if (!elemCache.activeTesters) return;
    
    // Remove timers for testers that are no longer active
    Object.keys(activeTimers).forEach(timerId => {
        const [testerName, taskId] = timerId.split('-task-');
        const stillActive = testers?.some(tester => 
            tester.testerName === testerName && tester.taskId.toString() === taskId
        );
        
        if (!stillActive) {
            clearInterval(activeTimers[timerId]);
            delete activeTimers[timerId];
        }
    });
    
    // Display empty message if no active testers
    if (!testers || testers.length === 0) {
        elemCache.activeTesters.innerHTML = '<div class="empty-message">No active testers</div>';
        return;
    }
    
    // Clear container before updating
    elemCache.activeTesters.innerHTML = '';
    
    // Group testers by name to prevent duplicates
    const testersByName = {};
    
    // Process testers to group by name
    testers.forEach(tester => {
        if (!tester || !tester.testerName || !tester.taskId) return;
        
        const testerName = tester.testerName;
        
        // If this tester isn't in our map yet, add them
        if (!testersByName[testerName]) {
            testersByName[testerName] = [];
        }
        
        // Add this task to the tester's list
        testersByName[testerName].push(tester);
    });
    
    // Create a card for each unique tester
    Object.keys(testersByName).forEach(testerName => {
        const testerTasks = testersByName[testerName];
        
        // Sort tasks by start time (most recent first)
        testerTasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        // Use the most recent task for display
        const mostRecentTask = testerTasks[0];
        
        const timerId = `${mostRecentTask.testerName}-task-${mostRecentTask.taskId}`;
        const startTime = new Date(mostRecentTask.startTime);
        
        const testerCard = document.createElement('div');
        testerCard.className = 'tester-card';
        
        const escapedTesterName = escapeHtml(mostRecentTask.testerName || 'Unknown');
        const taskName = escapeHtml(mostRecentTask.taskName || 'Unknown Task');
        
        testerCard.innerHTML = `
            <div class="tester-info">
                <h3>${escapedTesterName}</h3>
                <p>Task: ${taskName}</p>
            </div>
            <div class="timer" id="timer-${timerId}">00:00</div>
        `;
        
        elemCache.activeTesters.appendChild(testerCard);
        
        // Start or update timer
        if (!activeTimers[timerId]) {
            updateTimer(timerId, startTime);
            activeTimers[timerId] = setInterval(() => updateTimer(timerId, startTime), 1000);
        }
    });
}

/**
 * Update the completed tests display
 * @param {Array} tests - The completed tests data
 */
function updateCompletedTests(tests) {
    if (!elemCache.completedTests) return;
    
    // Display empty message if no completed tests
    if (!tests || tests.length === 0) {
        elemCache.completedTests.innerHTML = '<div class="empty-message">No completed tests</div>';
        return;
    }
    
    // Clear container before updating
    elemCache.completedTests.innerHTML = '';
    
    // Group completed tests by tester name and task ID to avoid duplicates
    const uniqueTests = {};
    
    tests.forEach(test => {
        if (!test || !test.testerName || !test.taskId) return;
        
        const key = `${test.testerName}-${test.taskId}`;
        
        // Keep only the most recent completion (or the fastest one if multiple exist)
        if (!uniqueTests[key] || test.time < uniqueTests[key].time) {
            uniqueTests[key] = test;
        }
    });
    
    // Convert back to array and sort by time (fastest first)
    const uniqueTestsArray = Object.values(uniqueTests);
    uniqueTestsArray.sort((a, b) => a.time - b.time);
    
    // Add each unique completed test
    uniqueTestsArray.forEach((test, index) => {
        // Determine rank class (gold, silver, bronze)
        let rankClass = '';
        if (index === 0) rankClass = 'first';
        else if (index === 1) rankClass = 'second';
        else if (index === 2) rankClass = 'third';
        
        const entryElement = document.createElement('div');
        entryElement.className = 'leaderboard-entry';
        
        const testerName = escapeHtml(test.testerName || 'Unknown');
        const taskName = escapeHtml(test.taskName || 'Unknown Task');
        const time = test.time;
     
        entryElement.innerHTML = `
            <div class="rank ${rankClass}">${index + 1}</div>
            <div class="result-info">
                <h3>${testerName}</h3>
                <p>Task: ${taskName}</p>
            </div>
            <div>
                <div class="time">${time}s</div>
                <div class="stats">
                    Steps: ${test.steps} | Errors: ${test.errors} 
                </div>
            </div>
        `;
        
        elemCache.completedTests.appendChild(entryElement);
    });
}

/**
 * Update a timer display
 * @param {string} timerId - The timer ID
 * @param {Date} startTime - The start time
 */
function updateTimer(timerId, startTime) {
    const timerElement = document.getElementById(`timer-${timerId}`);
    if (!timerElement) {
        // Element no longer exists, clear the timer
        if (activeTimers[timerId]) {
            clearInterval(activeTimers[timerId]);
            delete activeTimers[timerId];
        }
        return;
    }
    
    try {
        // Calculate elapsed time
        const now = new Date();
        const elapsed = Math.max(0, Math.floor((now - new Date(startTime)) / 1000));
        
        // Format as MM:SS
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        
        // Update the display
        timerElement.textContent = `${minutes}:${seconds}`;
        
        // Add visual indication for long-running tests (more than 5 minutes)
        if (elapsed > 300) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    } catch (error) {
        console.error('Error updating timer:', error);
    }
}

/**
 * Clear all active timers
 */
function clearAllTimers() {
    Object.keys(activeTimers).forEach(timerId => {
        clearInterval(activeTimers[timerId]);
    });
    activeTimers = {};
}

/**
 * Confirm leaderboard reset
 */
function confirmReset() {
    if (confirm('Are you sure you want to reset the leaderboard? This will clear all active testers and completed tests.')) {
        resetLeaderboard();
    }
}

/**
 * Reset the leaderboard via API
 */
async function resetLeaderboard() {
    try {
        updateUI('resetting');
        
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Leaderboard reset successfully');
        } else {
            console.error('Failed to reset leaderboard:', data.message);
            alert('Failed to reset leaderboard');
        }
    } catch (error) {
        console.error('Error resetting leaderboard:', error);
        alert(`Error resetting leaderboard: ${error.message}`);
    } finally {
        updateUI('normal');
    }
}

/**
 * Update UI state during operations
 * @param {string} state - The UI state ('normal', 'resetting')
 */
function updateUI(state) {
    if (!elemCache.resetBtn) return;
    
    switch (state) {
        case 'resetting':
            elemCache.resetBtn.disabled = true;
            elemCache.resetBtn.textContent = 'Resetting...';
            break;
        case 'normal':
        default:
            elemCache.resetBtn.disabled = false;
            elemCache.resetBtn.textContent = 'Reset Leaderboard';
            break;
    }
}

/**
 * Helper function to escape HTML
 * @param {string} unsafe - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);