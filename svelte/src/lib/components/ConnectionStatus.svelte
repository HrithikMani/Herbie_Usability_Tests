<!-- src/lib/components/ConnectionStatus.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { user } from '$lib/stores/auth.js';

  // Connection state
  const connectionStatus = writable('checking');
  const lastCheck = writable(null);
  const apiLatency = writable(null);

  let statusInterval;
  let isVisible = true;

  // Get current user data at top level to avoid scoping issues
  $: currentUser = $user;

  // Connection status checks
  async function checkConnectionStatus() {
    if (!currentUser) {
      connectionStatus.set('disconnected');
      return;
    }

    try {
      const startTime = Date.now();
      
      // Check auth server health
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        connectionStatus.set('connected');
        apiLatency.set(latency);
      } else {
        connectionStatus.set('degraded');
        apiLatency.set(null);
      }

      lastCheck.set(new Date());

    } catch (error) {
      console.error('Connection check failed:', error);
      connectionStatus.set('disconnected');
      apiLatency.set(null);
      lastCheck.set(new Date());
    }
  }

  onMount(() => {
    // Initial check
    checkConnectionStatus();
    
    // Set up periodic checks every 30 seconds
    statusInterval = setInterval(checkConnectionStatus, 30000);

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isVisible) {
        checkConnectionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  onDestroy(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
  });

  // Reactive declarations for UI
  $: statusClass = $connectionStatus;
  $: statusText = getStatusText($connectionStatus);
  $: statusIcon = getStatusIcon($connectionStatus);
  $: showLatency = $apiLatency !== null && $connectionStatus === 'connected';

  function getStatusText(status) {
    switch (status) {
      case 'connected': return 'Connected';
      case 'degraded': return 'Degraded';
      case 'disconnected': return 'Disconnected';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'connected': return '🟢';
      case 'degraded': return '🟡';
      case 'disconnected': return '🔴';
      case 'checking': return '🔄';
      default: return '❓';
    }
  }

  function getLastCheckText() {
    if (!$lastCheck) return '';
    
    const now = new Date();
    const diff = Math.floor((now - $lastCheck) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  function toggleVisibility() {
    isVisible = !isVisible;
  }

  function forceCheck() {
    connectionStatus.set('checking');
    checkConnectionStatus();
  }
</script>

<!-- Only show if user is authenticated -->
{#if currentUser}
  <div 
    class="connection-status {statusClass}" 
    class:minimized={!isVisible}
    title="API connection status: {statusText}"
    role="status"
    aria-live="polite"
    aria-label="Connection status: {statusText}"
  >
    {#if isVisible}
      <div class="status-content">
        <div class="status-main">
          <span class="status-icon" aria-hidden="true">{statusIcon}</span>
          <span class="status-text">{statusText}</span>
        </div>
        
        {#if showLatency}
          <div class="status-details">
            <span class="latency">⚡ {$apiLatency}ms</span>
          </div>
        {/if}
        
        {#if $lastCheck}
          <div class="status-details">
            <span class="last-check">🕐 {getLastCheckText()}</span>
          </div>
        {/if}
        
        <div class="status-actions">
          <button 
            class="refresh-btn" 
            on:click={forceCheck}
            disabled={$connectionStatus === 'checking'}
            title="Check connection now"
          >
            🔄
          </button>
          <button 
            class="minimize-btn" 
            on:click={toggleVisibility}
            title="Minimize status"
          >
            ➖
          </button>
        </div>
      </div>
    {:else}
      <button 
        class="restore-btn" 
        on:click={toggleVisibility}
        title="Show connection status"
      >
        {statusIcon}
      </button>
    {/if}
  </div>
{/if}

<style>
  .connection-status {
    position: fixed;
    bottom: 20px;
    right: 20px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    z-index: 100;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    user-select: none;
    min-width: 200px;
  }

  .connection-status.minimized {
    min-width: auto;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .status-main {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
  }

  .status-details {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    opacity: 0.9;
  }

  .status-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }

  .refresh-btn, .minimize-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 6px;
    padding: 4px 6px;
    cursor: pointer;
    font-size: 10px;
    color: white;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover, .minimize-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    animation: spin 1s linear infinite;
  }

  .restore-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    padding: 8px;
    border-radius: 50%;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .restore-btn:hover {
    transform: scale(1.1);
  }

  /* Status-specific styles */
  .connected {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%);
    border: 1px solid rgba(34, 197, 94, 0.5);
  }

  .degraded {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.9) 100%);
    border: 1px solid rgba(245, 158, 11, 0.5);
    animation: pulse 2s infinite;
  }

  .disconnected {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%);
    border: 1px solid rgba(239, 68, 68, 0.5);
    animation: pulse 1.5s infinite;
  }

  .checking {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%);
    border: 1px solid rgba(99, 102, 241, 0.5);
  }

  .checking .status-icon {
    animation: spin 1s linear infinite;
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .connection-status {
      bottom: 15px;
      right: 15px;
      min-width: 180px;
    }
    
    .status-content {
      padding: 10px 12px;
    }
    
    .status-main {
      font-size: 13px;
    }
    
    .status-details {
      font-size: 9px;
    }
  }

  @media (max-width: 480px) {
    .connection-status {
      bottom: 10px;
      right: 10px;
      min-width: 160px;
    }
    
    .connection-status.minimized {
      width: 40px;
      height: 40px;
    }

    .status-content {
      padding: 8px 10px;
    }
  }

  /* Hide when printing */
  @media print {
    .connection-status {
      display: none;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .connection-status,
    .refresh-btn,
    .minimize-btn,
    .restore-btn {
      animation: none;
      transition: none;
    }
    
    .refresh-btn:disabled {
      animation: none;
    }
    
    .checking .status-icon {
      animation: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .connection-status {
      border-width: 2px;
    }
    
    .refresh-btn, .minimize-btn {
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
  }
</style>