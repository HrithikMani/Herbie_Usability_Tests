<!-- src/lib/components/ConnectionStatus.svelte -->
<script>
  import { wsConnected } from '$lib/stores/websocket.js';
  
  $: statusClass = $wsConnected ? 'connected' : 'disconnected';
  $: statusText = $wsConnected ? 'Connected' : 'Disconnected';
  $: statusIcon = $wsConnected ? '🟢' : '🔴';
</script>

<div 
  class="connection-status {statusClass}" 
  title="WebSocket connection status: {statusText}"
  role="status"
  aria-live="polite"
  aria-label="Connection status: {statusText}"
>
  <span class="status-icon" aria-hidden="true">{statusIcon}</span>
  <span class="status-text">{statusText}</span>
</div>

<style>
  .connection-status {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    z-index: 100;
    transition: all 0.3s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }

  .connected {
    background-color: rgba(92, 184, 92, 0.9);
    border: 1px solid #5cb85c;
  }

  .disconnected {
    background-color: rgba(217, 83, 79, 0.9);
    border: 1px solid #d9534f;
    animation: pulse 1.5s infinite;
  }

  .status-icon {
    font-size: 10px;
    animation: none;
  }

  .status-text {
    font-size: 11px;
  }

  .connected .status-icon {
    animation: connectedPulse 3s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }
  }

  @keyframes connectedPulse {
    0%, 90%, 100% {
      opacity: 1;
    }
    95% {
      opacity: 0.7;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .connection-status {
      bottom: 15px;
      right: 15px;
      padding: 6px 12px;
      font-size: 11px;
    }
    
    .status-icon {
      font-size: 9px;
    }
    
    .status-text {
      font-size: 10px;
    }
  }

  @media (max-width: 480px) {
    .connection-status {
      bottom: 10px;
      right: 10px;
      padding: 5px 10px;
      border-radius: 15px;
    }
    
    .status-text {
      display: none; /* Show only icon on very small screens */
    }
  }

  /* Hide when printing */
  @media print {
    .connection-status {
      display: none;
    }
  }
</style>