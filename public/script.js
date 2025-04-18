/**
 * Main Application Script
 * Handles testing interface, WebSocket communication,
 * and test result tracking
 */

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

// Element cache for better performance
const elemCache = {};

/**
 * Initialize the application
 */
function init() {
    // Cache DOM elements for better performance
    cacheElements();
    
    // Check for stored tester name
    checkStoredTesterName();
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Cache DOM elements for better performance
 */
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
    
    // Check for header-right element and create if needed
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('.header-right a[href="/leaderboard"]')) {
        const leaderboardLink = document.createElement('a');
        leaderboardLink.href = '/leaderboard';
        leaderboardLink.className = 'button';
        leaderboardLink.textContent = 'View Leaderboard';
        leaderboardLink.target = '_blank';
        headerRight.insertBefore(leaderboardLink, headerRight.firstChild);
    }
}

/**
 * Check for stored tester name in localStorage
 */
function checkStoredTesterName() {
    const storedName = localStorage.getItem('testerName');
    
    if (storedName) {
        // User is already logged in
        state.testerName = storedName;
        
        if (elemCache.testerModal) elemCache.testerModal.style.display = 'none';
        if (elemCache.mainContent) elemCache.mainContent.style.display = 'block';
        if (elemCache.welcomeMessage) elemCache.welcomeMessage.textContent = `Welcome, ${state.testerName}!`;
        
        // Connect to WebSocket
        connectWebSocket();
        
        // Fetch tasks
        fetchTasks();
    } else if (elemCache.testerModal) {
        // Show the login modal
        elemCache.testerModal.style.display = 'flex';
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Tester form submission
    if (elemCache.testerForm) {
        elemCache.testerForm.addEventListener('submit', handleTesterFormSubmit);
    }
    
    // Logout button
    if (elemCache.logoutButton) {
        elemCache.logoutButton.addEventListener('click', handleLogout);
    }
    
    // Search input
    if (elemCache.searchQuery) {
        elemCache.searchQuery.addEventListener('input', filterTasks);
    }
    
    // Set up test result observer
    setupTestResultObserver();
    
    // Window visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Handle visibility change event
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        // Reconnect if needed when tab becomes visible
        if (state.socket?.readyState !== WebSocket.OPEN && !state.isReconnecting) {
            console.log('Tab became visible, reconnecting WebSocket...');
            connectWebSocket();
        }
    }
}

/**
 * Handle tester form submission
 * @param {Event} event - The form submit event
 */
function handleTesterFormSubmit(event) {
    event.preventDefault();
    
    if (!elemCache.testerName) return;
    
    state.testerName = elemCache.testerName.value.trim();
    
    if (state.testerName) {
        // Store name in localStorage
        localStorage.setItem('testerName', state.testerName);
        
        // Hide modal and show main content
        if (elemCache.testerModal) elemCache.testerModal.style.display = 'none';
        if (elemCache.mainContent) elemCache.mainContent.style.display = 'block';
        
        // Set welcome message
        if (elemCache.welcomeMessage) {
            elemCache.welcomeMessage.textContent = `Welcome, ${state.testerName}!`;
        }
        
        // Connect to WebSocket
        connectWebSocket();
        
        // Load tasks
        fetchTasks();
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Remove tester name from localStorage
    localStorage.removeItem('testerName');
    
    // Reset tester name variable
    state.testerName = "";
    
    // Show modal and hide main content
    if (elemCache.testerModal) elemCache.testerModal.style.display = 'flex';
    if (elemCache.mainContent) elemCache.mainContent.style.display = 'none';
    
    // Clear form input
    if (elemCache.testerName) elemCache.testerName.value = '';
    
    // Close WebSocket connection if it exists
    closeWebSocket();
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
    if (state.isReconnecting) return;
    
    state.isReconnecting = true;
    
    // Clear any existing reconnect timeout
    if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
    }
    
    // Calculate reconnect delay with exponential backoff
    const reconnectDelay = Math.min(1000 * Math.pow(1.5, state.reconnectAttempts), 30000);
    
    console.log(`Connecting to WebSocket server (attempt ${state.reconnectAttempts + 1})...`);
    
    try {
        // Get the current host and create WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        // Create a new WebSocket connection
        state.socket = new WebSocket(wsUrl);
        
        state.socket.addEventListener('open', handleSocketOpen);
        state.socket.addEventListener('message', handleSocketMessage);
        state.socket.addEventListener('close', handleSocketClose);
        state.socket.addEventListener('error', handleSocketError);
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
    state.reconnectAttempts = 0;
    state.isReconnecting = false;
    
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
        
        // Handle different message types
        switch (data.type) {
            case 'stateUpdate':
            case 'initialState':
                console.log(`Received ${data.type} from server`);
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
    
    scheduleReconnect();
}

/**
 * Handle WebSocket error event
 * @param {Event} event - The error event
 */
function handleSocketError(event) {
    console.error('WebSocket error:', event);
    
    // Let the close handler schedule the reconnect
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
    const maxReconnectAttempts = 10;
    
    if (state.reconnectAttempts >= maxReconnectAttempts) {
        console.log('Maximum reconnection attempts reached');
        state.isReconnecting = false;
        return;
    }
    
    const delay = Math.min(1000 * Math.pow(1.5, state.reconnectAttempts), 30000);
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${state.reconnectAttempts + 1})`);
    
    state.reconnectTimeout = setTimeout(() => {
        state.reconnectAttempts++;
        connectWebSocket();
    }, delay);
    
    state.isReconnecting = true;
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
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
            console.log('Sending heartbeat');
            state.socket.send(JSON.stringify({ type: 'heartbeat' }));
        } else {
            clearInterval(window.heartbeatInterval);
        }
    }, heartbeatInterval);
}

/**
 * Close WebSocket connection
 */
function closeWebSocket() {
    // Clear heartbeat interval
    if (window.heartbeatInterval) {
        clearInterval(window.heartbeatInterval);
        window.heartbeatInterval = null;
    }
    
    // Clear reconnect timeout
    if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        state.reconnectTimeout = null;
    }
    
    // Close the socket if it exists
    if (state.socket) {
        if (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING) {
            state.socket.close();
        }
        state.socket = null;
    }
    
    state.isReconnecting = false;
}

/**
 * Send a message to the WebSocket server
 * @param {Object} message - The message to send
 * @returns {boolean} - Whether the message was sent
 */
function sendWebSocketMessage(message) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        console.warn('Cannot send message, WebSocket is not connected');
        return false;
    }
    
    try {
        const messageString = JSON.stringify(message);
        state.socket.send(messageString);
        return true;
    } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
    }
}

/**
 * Fetch tasks from tasks.xlsx
 */
async function fetchTasks() {
    try {
        // Fetch the Excel file
        const response = await fetch("tasks.xlsx");
        
        if (!response.ok) {
            throw new Error(`Failed to load tasks (${response.status}: ${response.statusText})`);
        }
        
        // Get the ArrayBuffer from the response
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse the Excel file using SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert the worksheet to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Update state
        state.tasks = Array.isArray(data) ? data : [];
        state.filteredTasks = [...state.tasks];
        
        // Render the UI
        renderTasks();
        renderPagination();
    } catch (error) {
        console.error("Error fetching tasks:", error);
        showError("Failed to load Excel tasks file. Please ensure SheetJS is properly loaded and try again.");
    }
}

/**
 * Filter tasks based on search query
 */
function filterTasks() {
    if (!elemCache.searchQuery) return;
    
    const query = elemCache.searchQuery.value.toLowerCase();
    
    state.filteredTasks = state.tasks.filter(task => 
        task.name && task.name.toLowerCase().includes(query)
    );
    
    state.currentPage = 1;
    renderTasks();
    renderPagination();
}

/**
 * Render tasks to the DOM
 */
function renderTasks() {
    if (!elemCache.taskList) return;
    
    elemCache.taskList.innerHTML = "";
    
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedTasks = state.filteredTasks.slice(start, start + state.itemsPerPage);
    
    if (paginatedTasks.length === 0) {
        elemCache.taskList.innerHTML = `
            <div class="empty-message">
                No tasks found${elemCache.searchQuery && elemCache.searchQuery.value ? ' matching your search' : ''}.
            </div>
        `;
        return;
    }
    
    paginatedTasks.forEach(task => {
        if (!task || !task.id) return;
        
        const taskCard = document.createElement("div");
        taskCard.classList.add("task-card");
        taskCard.dataset.taskId = task.id;
        
        const taskName = escapeHtml(task.name || 'Untitled Task');
        const taskDescription = escapeHtml(task.description || 'No description');
        
        taskCard.innerHTML = `
            <div class="task-header">
                <h3>${taskName}</h3>
                <span class="task-status">Not Started</span>
            </div>
            <p>${taskDescription}</p>
            <div class="test-results" id="test-results-${task.id}"></div>
            <button class="button start-test-btn" data-task-id="${task.id}">Start Test</button>
        `;
        
        elemCache.taskList.appendChild(taskCard);
    });
    
    // Add event listeners to start buttons
    document.querySelectorAll('.start-test-btn').forEach(button => {
        button.addEventListener('click', () => {
            const taskId = parseInt(button.dataset.taskId);
            if (!isNaN(taskId)) {
                startTest(taskId);
            }
        });
    });
}

/**
 * Render pagination controls
 */
function renderPagination() {
    if (!elemCache.paginationNumbers || !elemCache.prevBtn || !elemCache.nextBtn) return;
    
    elemCache.paginationNumbers.innerHTML = "";
    
    const totalPages = Math.max(1, Math.ceil(state.filteredTasks.length / state.itemsPerPage));
    
    // Ensure current page is valid
    state.currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    
    // Create page buttons
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.innerText = i;
        button.className = `pagination-button ${i === state.currentPage ? "active" : ""}`;
        button.addEventListener('click', () => setPage(i));
        elemCache.paginationNumbers.appendChild(button);
    }
    
    // Update prev/next buttons
    elemCache.prevBtn.disabled = (state.currentPage === 1);
    elemCache.nextBtn.disabled = (state.currentPage === totalPages || totalPages === 0);
}

/**
 * Set the current page
 * @param {number} page - The page number to set
 */
function setPage(page) {
    const totalPages = Math.ceil(state.filteredTasks.length / state.itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        state.currentPage = page;
        renderTasks();
        renderPagination();
        
        // Scroll to top of task list
        if (elemCache.taskList) {
            elemCache.taskList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

/**
 * Go to previous page
 */
function prevPage() {
    if (state.currentPage > 1) {
        setPage(state.currentPage - 1);
    }
}

/**
 * Go to next page
 */
function nextPage() {
    const totalPages = Math.ceil(state.filteredTasks.length / state.itemsPerPage);
    
    if (state.currentPage < totalPages) {
        setPage(state.currentPage + 1);
    }
}

/**
 * Start a test
 * @param {number} taskId - The ID of the task to start
 */
function startTest(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const taskCard = document.querySelector(`[data-task-id='${task.id}']`);
    if (!taskCard) return;
    
    const statusElement = taskCard.querySelector(".task-status");
    if (statusElement) {
        statusElement.textContent = "In Progress";
        statusElement.classList.remove("completed");
        statusElement.classList.add("in-progress");
    }
    
    // Send start test event to WebSocket server
    sendWebSocketMessage({
        type: 'startTest',
        testerName: state.testerName,
        taskId: task.id,
        taskName: task.name || 'Unknown Task'
    });
    
    // Include herbie_script in the postMessage
    window.postMessage({
        action: "startUsabilityTest",
        taskId: task.id,
        taskName: task.name || 'Unknown Task',
        description: task.description || '',
        testerName: state.testerName,
        testHerbieScript: task.herbie_script || '' // Add the Herbie script
    }, "*");
    
    // Open test URL in new tab
    if (task.url) {
        window.open(task.url, "_blank");
    } else {
        console.warn(`Task #${task.id} does not have a URL`);
    }
}
/**
 * Set up the test result observer
 */
function setupTestResultObserver() {
    if (!elemCache.usabilityTestResults) return;
    
    // Disconnect any existing observer
    if (state.observer) {
        state.observer.disconnect();
    }
    
    // Create a new observer
    state.observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "data-test-results") {
                try {
                    const resultsData = mutation.target.getAttribute("data-test-results");
                    handleTestResults(resultsData);
                } catch (error) {
                    console.error('Error handling test results:', error);
                }
            }
        }
    });
    
    // Start observing
    state.observer.observe(elemCache.usabilityTestResults, { attributes: true });
}

/**
 * Handle test results
 * @param {string} resultsData - The test results data as a JSON string
 */
function handleTestResults(resultsData) {
    if (!resultsData) return;
    
    try {
        const newResults = JSON.parse(resultsData);
        
        // Validate results data
        if (!newResults || !newResults.taskId) {
            console.warn('Invalid test results data:', newResults);
            return;
        }
        
        const taskCard = document.querySelector(`[data-task-id='${newResults.taskId}']`);
        if (!taskCard) {
            console.warn(`Task card for task #${newResults.taskId} not found`);
            return;
        }
        
        // Update task status
        const statusElement = taskCard.querySelector(".task-status");
        if (statusElement) {
            statusElement.textContent = "Completed";
            statusElement.classList.remove("in-progress");
            statusElement.classList.add("completed");
        }
        
        // Update results display
        const resultsDiv = document.getElementById(`test-results-${newResults.taskId}`);
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <h3>Test Results</h3>
                <p><strong>Tester:</strong> ${escapeHtml(state.testerName)}</p>
                <p><strong>Time:</strong> ${newResults.time} seconds</p>
                <p><strong>Steps:</strong> ${newResults.steps}</p>
                <p><strong>Errors:</strong> ${newResults.errors}</p>
                <p><strong>Rating:</strong> ${newResults.rating}/5</p>
            `;
        }
        
        // Send test completion to WebSocket server
        sendWebSocketMessage({
            type: 'completeTest',
            testerName: state.testerName,
            taskId: newResults.taskId,
            taskName: state.tasks.find(t => t.id === newResults.taskId)?.name || 'Unknown Task',
            time: parseFloat(newResults.time) || 0,
            steps: parseInt(newResults.steps) || 0,
            errors: parseInt(newResults.errors) || 0,
            rating: parseInt(newResults.rating) || 0
        });
        
    } catch (error) {
        console.error('Error parsing test results:', error);
    }
}

/**
 * Show an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        errorElement.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(errorElement);
        }, 300);
    }, 5000);
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

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', init);

// Expose pagination functions globally
window.prevPage = prevPage;
window.nextPage = nextPage;
window.setPage = setPage;