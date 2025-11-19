<!-- src/routes/leaderboard/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, logout, apiRequest } from '$lib/stores/auth.js';

  let activeTests = [];
  let completedTests = [];
  let isLoading = true;
  let error = '';
  let refreshInterval;
  let lastUpdated = null;
  let autoRefresh = true;

  // Get current user data at top level to avoid scoping issues
  $: currentUser = $user;

  onMount(async () => {
    await loadLeaderboardData();
    
    // Set up auto-refresh every 3 seconds
    if (autoRefresh) {
      refreshInterval = setInterval(loadLeaderboardData, 3000);
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function loadLeaderboardData() {
    try {
      // Note: leaderboard endpoint is public, no auth required
      const response = await fetch('http://localhost:3001/api/leaderboard');
      const data = await response.json();
      
      activeTests = data.activeTesters || [];
      completedTests = data.completedTests || [];
      lastUpdated = new Date();
      error = '';
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      error = 'Failed to load leaderboard data';
    } finally {
      isLoading = false;
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    
    if (autoRefresh) {
      refreshInterval = setInterval(loadLeaderboardData, 3000);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function getTimeAgo(dateString) {
    if (!dateString) return '';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function getRankIcon(index) {
    switch(index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  }

  async function resetLeaderboard() {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Only administrators can reset the leaderboard');
      return;
    }

    const confirmed = confirm('Are you sure you want to reset the leaderboard? This will clear all test data.');
    if (!confirmed) return;

    try {
      await apiRequest('/api/reset', { method: 'POST' });
      await loadLeaderboardData();
      alert('Leaderboard reset successfully');
    } catch (err) {
      console.error('Error resetting leaderboard:', err);
      alert('Failed to reset leaderboard');
    }
  }

  async function handleLogout() {
    await logout();
  }
</script>

<svelte:head>
  <title>Leaderboard - Usability Testing</title>
  <meta name="description" content="Real-time leaderboard for usability testing results" />
</svelte:head>

<div class="leaderboard-container">
  <!-- Header -->
  <header class="leaderboard-header">
    <div class="header-left">
      <h1>🏆 Usability Olympics Leaderboard</h1>
      <p class="subtitle">Real-time testing results and active sessions</p>
    </div>
    
    <div class="header-controls">
      <div class="status-indicator">
        <span class="status-dot {autoRefresh ? 'active' : 'inactive'}"></span>
        <span class="status-text">
          {autoRefresh ? 'Live' : 'Paused'}
          {#if lastUpdated}
            • Updated {getTimeAgo(lastUpdated)}
          {/if}
        </span>
      </div>
      
      <button 
        class="refresh-toggle" 
        on:click={toggleAutoRefresh}
        title="{autoRefresh ? 'Pause' : 'Resume'} auto-refresh"
      >
        {autoRefresh ? '⏸️' : '▶️'}
      </button>
      
      <button class="refresh-button" on:click={loadLeaderboardData} disabled={isLoading}>
        🔄
      </button>

      {#if currentUser}
        <div class="user-menu">
          <span class="user-info">👤 {currentUser.fullName || currentUser.username}</span>
          <a href="/" class="nav-button">Dashboard</a>
          {#if currentUser.role === 'admin'}
            <button class="admin-button" on:click={resetLeaderboard}>
              Reset Board
            </button>
          {/if}
          <button class="logout-button" on:click={handleLogout}>
            Logout
          </button>
        </div>
      {:else}
        <div class="auth-buttons">
          <a href="/login" class="nav-button">Login</a>
          <a href="/register" class="nav-button">Register</a>
        </div>
      {/if}
    </div>
  </header>

  {#if error}
    <div class="error-banner" role="alert">
      <span>⚠️ {error}</span>
      <button on:click={() => error = ''}>✕</button>
    </div>
  {/if}

  <div class="leaderboard-content">
    <!-- Active Tests Section -->
    <section class="active-tests-section">
      <h2>🔄 Active Tests ({activeTests.length})</h2>
      
      {#if activeTests.length === 0}
        <div class="empty-state">
          <div class="empty-icon">💤</div>
          <p>No active tests at the moment</p>
          <small>Tests will appear here when users start them</small>
        </div>
      {:else}
        <div class="active-tests-grid">
          {#each activeTests as test}
            <div class="active-test-card">
              <div class="test-header">
                <span class="tester-name">👤 {test.tester_name}</span>
                <span class="test-duration">{getTimeAgo(test.start_time)}</span>
              </div>
              <div class="test-details">
                <h4>Task #{test.task_id}: {test.task_name}</h4>
                <p class="start-time">Started: {formatDateTime(test.start_time)}</p>
              </div>
              <div class="activity-indicator">
                <div class="pulse-dot"></div>
                <span>In Progress</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Completed Tests Section -->
    <section class="completed-tests-section">
      <h2>🏁 Completed Tests ({completedTests.length})</h2>
      
      {#if completedTests.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <p>No completed tests yet</p>
          <small>Completed tests will appear here sorted by completion time</small>
        </div>
      {:else}
        <div class="completed-tests-table">
          <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-tester">Tester</div>
            <div class="col-task">Task</div>
            <div class="col-time">Time</div>
            <div class="col-stats">Steps/Errors</div>
            <div class="col-completed">Completed</div>
          </div>
          
          <div class="table-body">
            {#each completedTests as test, index}
              <div class="test-row" class:top-three={index < 3}>
                <div class="col-rank">
                  <span class="rank-badge {index < 3 ? 'medal' : ''}">
                    {getRankIcon(index)}
                  </span>
                </div>
                <div class="col-tester">
                  <span class="tester-name">👤 {test.tester_name}</span>
                </div>
                <div class="col-task">
                  <span class="task-info">
                    <strong>#{test.task_id}</strong>
                    <span class="task-name">{test.task_name}</span>
                  </span>
                </div>
                <div class="col-time">
                  <span class="completion-time">{formatTime(test.time)}</span>
                </div>
                <div class="col-stats">
                  <span class="stats">
                    <span class="steps">📊 {test.steps}</span>
                    <span class="errors {test.errors > 0 ? 'has-errors' : ''}">
                      ❌ {test.errors}
                    </span>
                  </span>
                </div>
                <div class="col-completed">
                  <span class="completed-time">{getTimeAgo(test.completed_at)}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .leaderboard-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 20px;
  }

  .leaderboard-header {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .header-left h1 {
    margin: 0 0 8px 0;
    color: #2d3748;
    font-size: 2rem;
    font-weight: 700;
  }

  .subtitle {
    margin: 0;
    color: #718096;
    font-size: 1rem;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f7fafc;
    border-radius: 8px;
    font-size: 14px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .status-dot.active {
    background: #48bb78;
    animation: pulse 2s infinite;
  }

  .status-dot.inactive {
    background: #a0aec0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .refresh-toggle, .refresh-button {
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
  }

  .refresh-toggle:hover, .refresh-button:hover {
    background: #3182ce;
    transform: translateY(-1px);
  }

  .refresh-button:disabled {
    background: #a0aec0;
    cursor: not-allowed;
    transform: none;
  }

  .user-menu, .auth-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-info {
    padding: 8px 12px;
    background: #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #2d3748;
  }

  .nav-button, .admin-button, .logout-button {
    padding: 8px 16px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-button {
    background: #4299e1;
    color: white;
  }

  .nav-button:hover {
    background: #3182ce;
    transform: translateY(-1px);
  }

  .admin-button {
    background: #ed8936;
    color: white;
  }

  .admin-button:hover {
    background: #dd6b20;
  }

  .logout-button {
    background: #e53e3e;
    color: white;
  }

  .logout-button:hover {
    background: #c53030;
  }

  .error-banner {
    background: #fed7d7;
    color: #c53030;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #c53030;
    cursor: pointer;
    font-size: 16px;
  }

  .leaderboard-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .active-tests-section, .completed-tests-section {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .active-tests-section h2, .completed-tests-section h2 {
    margin: 0 0 20px 0;
    color: #2d3748;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #718096;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }

  .empty-state p {
    font-size: 1.1rem;
    margin: 0 0 8px 0;
  }

  .empty-state small {
    font-size: 0.9rem;
  }

  .active-tests-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .active-test-card {
    background: #f7fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .active-test-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .tester-name {
    font-weight: 600;
    color: #2d3748;
  }

  .test-duration {
    font-size: 12px;
    color: #718096;
    background: #e2e8f0;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .test-details h4 {
    margin: 0 0 8px 0;
    color: #4a5568;
    font-size: 14px;
  }

  .start-time {
    margin: 0;
    font-size: 12px;
    color: #718096;
  }

  .activity-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #48bb78;
    font-weight: 600;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #48bb78;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .completed-tests-table {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .table-header {
    display: grid;
    grid-template-columns: 80px 1fr 1fr 100px 140px 120px;
    background: #f7fafc;
    padding: 16px;
    font-weight: 600;
    color: #4a5568;
    font-size: 14px;
    border-bottom: 1px solid #e2e8f0;
  }

  .table-body {
    max-height: 600px;
    overflow-y: auto;
  }

  .test-row {
    display: grid;
    grid-template-columns: 80px 1fr 1fr 100px 140px 120px;
    padding: 16px;
    border-bottom: 1px solid #f7fafc;
    transition: background-color 0.2s ease;
    align-items: center;
  }

  .test-row:hover {
    background: #f7fafc;
  }

  .test-row.top-three {
    background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
  }

  .rank-badge {
    font-weight: 700;
    font-size: 16px;
  }

  .rank-badge.medal {
    font-size: 20px;
  }

  .task-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .task-name {
    font-size: 12px;
    color: #718096;
  }

  .completion-time {
    font-weight: 700;
    color: #2d3748;
    font-size: 16px;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .errors.has-errors {
    color: #e53e3e;
    font-weight: 600;
  }

  .completed-time {
    font-size: 12px;
    color: #718096;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .leaderboard-container {
      padding: 10px;
    }

    .leaderboard-header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-controls {
      justify-content: space-between;
    }

    .user-menu, .auth-buttons {
      flex-wrap: wrap;
    }

    .active-tests-grid {
      grid-template-columns: 1fr;
    }

    .table-header, .test-row {
      grid-template-columns: 60px 1fr 80px 100px;
      font-size: 12px;
    }

    .col-task, .col-stats {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .header-left h1 {
      font-size: 1.5rem;
    }

    .table-header, .test-row {
      grid-template-columns: 50px 1fr 80px;
      padding: 12px 8px;
    }

    .col-completed {
      display: none;
    }
  }
</style>