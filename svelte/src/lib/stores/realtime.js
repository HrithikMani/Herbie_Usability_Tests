// src/lib/stores/realtime.js - Real-time updates using Server-Sent Events
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Connection state
export const isConnected = writable(false);
export const activeTesters = writable([]);
export const completedTests = writable([]);

// Application state
export const testerName = writable('');
export const herbieKeywords = writable(null);

// EventSource instance
let eventSource = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

class RealtimeManager {
  constructor() {
    this.isReconnecting = false;
    this.reconnectTimeout = null;
  }

  connect() {
    if (!browser || this.isReconnecting) return;
    
    this.isReconnecting = true;
    isConnected.set(false);
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    
    console.log(`Connecting to SSE endpoint (attempt ${reconnectAttempts + 1})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      
      try {
        // Close existing connection
        if (eventSource) {
          eventSource.close();
        }
        
        // Create new EventSource connection
        eventSource = new EventSource('/api/events');
        
        eventSource.addEventListener('open', this.handleOpen.bind(this));
        eventSource.addEventListener('message', this.handleMessage.bind(this));
        eventSource.addEventListener('error', this.handleError.bind(this));
        
      } catch (error) {
        console.error('Error creating EventSource connection:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  handleOpen() {
    console.log('SSE connected');
    isConnected.set(true);
    reconnectAttempts = 0;
    this.isReconnecting = false;
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'initialState':
        case 'stateUpdate':
          activeTesters.set(data.activeTesters || []);
          completedTests.set(data.completedTests || []);
          console.log('Received state update:', {
            activeTesters: data.activeTesters?.length || 0,
            completedTests: data.completedTests?.length || 0
          });
          break;
        default:
          console.warn('Unknown SSE message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }

  handleError(error) {
    console.error('SSE error:', error);
    isConnected.set(false);
    
    if (reconnectAttempts < maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.log('Maximum reconnection attempts reached');
      this.isReconnecting = false;
    }
  }

  scheduleReconnect() {
    if (this.isReconnecting) return;
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`Scheduling SSE reconnect in ${delay}ms`);
    
    this.isReconnecting = false;
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    this.isReconnecting = false;
    isConnected.set(false);
  }
}

export const realtimeManager = new RealtimeManager();

// API helper functions
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Helper functions for actions
export async function startTest(testerNameValue, taskId, taskName, taskDescription, herbieScript, herbieKeywordsValue) {
  console.log(`Starting test: ${testerNameValue} - ${taskName}`);
  
  try {
    const result = await apiRequest('/api/start-test', {
      method: 'POST',
      body: JSON.stringify({
        testerName: testerNameValue,
        taskId: taskId,
        taskName: taskName
      })
    });

    if (result.success && browser) {
      // Post message for Herbie integration
      try {
        window.postMessage({
          action: 'startUsabilityTest',
          testerName: testerNameValue,
          taskId: taskId,
          taskName: taskName,
          description: taskDescription || '',
          testHerbieScript: herbieScript || '',
          herbieKeywords: herbieKeywordsValue || null
        }, '*');
      } catch (error) {
        console.error('Error posting message for Herbie:', error);
      }
    }

    return result.success;
  } catch (error) {
    console.error('Error starting test:', error);
    return false;
  }
}

export async function completeTest(testerNameValue, taskId, taskName, time, steps, errors) {
  console.log(`Completing test: ${testerNameValue} - ${taskName} - ${time}s`);
  
  try {
    const result = await apiRequest('/api/complete-test', {
      method: 'POST',
      body: JSON.stringify({
        testerName: testerNameValue,
        taskId: taskId,
        taskName: taskName,
        time: time,
        steps: steps,
        errors: errors
      })
    });

    return result.success;
  } catch (error) {
    console.error('Error completing test:', error);
    return false;
  }
}

export async function resetLeaderboard() {
  try {
    const result = await apiRequest('/api/reset', {
      method: 'POST'
    });

    return result.success;
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return false;
  }
}

export async function getLeaderboardData() {
  try {
    const data = await apiRequest('/api/leaderboard');
    activeTesters.set(data.activeTesters || []);
    completedTests.set(data.completedTests || []);
    return data;
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    return { activeTesters: [], completedTests: [] };
  }
}

export async function getHealthStatus() {
  try {
    return await apiRequest('/api/health');
  } catch (error) {
    console.error('Error getting health status:', error);
    return { status: 'error', error: error.message };
  }
}

// src/lib/stores/tasks.js - Updated to remove WebSocket dependencies
import { writable, derived } from 'svelte/store';
import * as XLSX from 'xlsx';
import { herbieKeywords } from './realtime.js';

// Base stores
export const tasks = writable([]);
export const searchQuery = writable('');
export const currentPage = writable(1);
export const itemsPerPage = writable(2);
export const isLoadingTasks = writable(false);
export const taskLoadError = writable(null);

// Derived store for filtered tasks
export const filteredTasks = derived(
  [tasks, searchQuery],
  ([$tasks, $searchQuery]) => {
    if (!$searchQuery || $searchQuery.trim() === '') {
      return $tasks;
    }
    
    const query = $searchQuery.toLowerCase().trim();
    return $tasks.filter(task => 
      (task.name && task.name.toLowerCase().includes(query)) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.id && task.id.toString().includes(query))
    );
  }
);

// Derived store for paginated tasks
export const paginatedTasks = derived(
  [filteredTasks, currentPage, itemsPerPage],
  ([$filteredTasks, $currentPage, $itemsPerPage]) => {
    const start = ($currentPage - 1) * $itemsPerPage;
    return $filteredTasks.slice(start, start + $itemsPerPage);
  }
);

// Derived store for total pages
export const totalPages = derived(
  [filteredTasks, itemsPerPage],
  ([$filteredTasks, $itemsPerPage]) => {
    return Math.ceil($filteredTasks.length / $itemsPerPage);
  }
);

// Load tasks from Excel file in static folder
export async function loadTasks() {
  isLoadingTasks.set(true);
  taskLoadError.set(null);
  
  try {
    console.log('Loading tasks from static/tasks.xlsx...');
    
    const response = await fetch('/tasks.xlsx');
    
    if (!response.ok) {
      throw new Error(`Failed to load tasks.xlsx: ${response.status} ${response.statusText}`);
    }
    
    console.log('Excel file fetched successfully, parsing...');
    
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: true,
      cellFormulas: false,
      cellStyles: false 
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`Processing worksheet: "${sheetName}"`);
    
    const tasksData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });
    
    if (tasksData.length === 0) {
      throw new Error('No data found in Excel file');
    }
    
    const headers = tasksData[0];
    const dataRows = tasksData.slice(1);
    
    console.log('Excel headers:', headers);
    console.log('Data rows:', dataRows.length);
    
    const processedTasks = dataRows
      .filter(row => row.some(cell => cell !== ''))
      .map((row, index) => {
        const task = {};
        
        headers.forEach((header, colIndex) => {
          if (header) {
            const key = header.toString().toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '_');
            
            task[key] = row[colIndex] !== undefined ? row[colIndex] : '';
          }
        });
        
        if (!task.id) {
          task.id = index + 1;
        }
        
        task.id = parseInt(task.id) || (index + 1);
        
        if (!task.name) {
          task.name = `Task ${task.id}`;
        }
        
        return task;
      });
    
    console.log(`Successfully loaded ${processedTasks.length} tasks:`, processedTasks);
    
    const validTasks = processedTasks.filter(task => task.id && task.name);
    
    if (validTasks.length === 0) {
      throw new Error('No valid tasks found. Each task must have at least an ID and name.');
    }
    
    if (validTasks.length !== processedTasks.length) {
      console.warn(`Filtered out ${processedTasks.length - validTasks.length} invalid tasks`);
    }
    
    tasks.set(validTasks);
    currentPage.set(1);
    
    console.log('Tasks loaded successfully into store');
    return validTasks;
    
  } catch (error) {
    console.error('Error loading tasks:', error);
    taskLoadError.set(error.message);
    tasks.set([]);
    throw error;
  } finally {
    isLoadingTasks.set(false);
  }
}

// Load herbie keywords
export async function loadHerbieKeywords() {
  try {
    console.log('Loading herbie keywords from static/herbie-keywords.json...');
    const response = await fetch('/herbie-keywords.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const keywords = await response.json();
    console.log('Herbie keywords loaded successfully:', keywords);
    
    herbieKeywords.set(keywords);
    return keywords;
  } catch (error) {
    console.error('Error loading herbie keywords:', error);
    const fallback = { globalKeywords: [], localKeywords: {} };
    herbieKeywords.set(fallback);
    throw error;
  }
}

// Reset pagination when search changes
searchQuery.subscribe(() => {
  currentPage.set(1);
});

// Utility functions for pagination
export function setPage(page) {
  currentPage.set(page);
}

export function nextPage() {
  currentPage.update(page => {
    const maxPages = derived([totalPages], ([$totalPages]) => $totalPages);
    let maxValue;
    maxPages.subscribe(value => maxValue = value)();
    return page < maxValue ? page + 1 : page;
  });
}

export function prevPage() {
  currentPage.update(page => page > 1 ? page - 1 : page);
}