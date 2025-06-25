// src/lib/stores/websocket.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// WebSocket connection state
export const wsConnected = writable(false);
export const activeTesters = writable([]);
export const completedTests = writable([]);

// Application state
export const testerName = writable('');
export const herbieKeywords = writable(null);

// WebSocket instance
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

class WebSocketManager {
  constructor() {
    this.isReconnecting = false;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
  }

  connect() {
    if (!browser || this.isReconnecting) return;
    
    this.isReconnecting = true;
    wsConnected.set(false);
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    
    console.log(`Connecting to WebSocket server (attempt ${reconnectAttempts + 1})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host.includes('5173') ? 'localhost:80' : window.location.host;
      
      try {
        socket = new WebSocket(`${protocol}//${host}`);
        
        socket.addEventListener('open', this.handleOpen.bind(this));
        socket.addEventListener('message', this.handleMessage.bind(this));
        socket.addEventListener('close', this.handleClose.bind(this));
        socket.addEventListener('error', this.handleError.bind(this));
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  handleOpen() {
    console.log('WebSocket connected');
    wsConnected.set(true);
    reconnectAttempts = 0;
    this.isReconnecting = false;
    this.startHeartbeat();
    this.sendMessage({ type: 'getState' });
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'initialState':
        case 'stateUpdate':
          activeTesters.set(data.activeTesters || []);
          completedTests.set(data.completedTests || []);
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

  handleClose(event) {
    console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    wsConnected.set(false);
    this.clearHeartbeat();
    
    if (reconnectAttempts < maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.log('Maximum reconnection attempts reached');
      this.isReconnecting = false;
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    wsConnected.set(false);
  }

  scheduleReconnect() {
    if (this.isReconnecting) return;
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`Scheduling reconnect in ${delay}ms`);
    
    this.isReconnecting = false;
    setTimeout(() => this.connect(), delay);
  }

  sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    }
    console.warn('Cannot send message: WebSocket not connected');
    return false;
  }

  startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (!this.sendMessage({ type: 'heartbeat' })) {
        this.clearHeartbeat();
      }
    }, 30000);
  }

  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.clearHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
    this.isReconnecting = false;
    wsConnected.set(false);
  }
}

export const wsManager = new WebSocketManager();

// Helper functions for actions
export function startTest(testerNameValue, taskId, taskName, taskDescription, herbieScript, herbieKeywordsValue) {
  console.log(`Starting test: ${testerNameValue} - ${taskName}`);
  
  const success = wsManager.sendMessage({
    type: 'startTest',
    testerName: testerNameValue,
    taskId: taskId,
    taskName: taskName
  });

  if (success && browser) {
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

  return success;
}

export function completeTest(testerNameValue, taskId, taskName, time, steps, errors) {
  console.log(`Completing test: ${testerNameValue} - ${taskName} - ${time}s`);
  
  return wsManager.sendMessage({
    type: 'completeTest',
    testerName: testerNameValue,
    taskId: taskId,
    taskName: taskName,
    time: time,
    steps: steps,
    errors: errors
  });
}