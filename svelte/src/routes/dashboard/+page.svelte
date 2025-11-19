<!-- src/routes/dashboard/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    authStore, 
    logout, 
    getCurrentUser,
    requireAuth 
  } from '$lib/stores/auth.js';
  import { 
    loadTasks, 
    loadHerbieKeywords,
    searchQuery,
    paginatedTasks,
    currentPage,
    totalPages,
    isLoadingTasks,
    taskLoadError
  } from '$lib/stores/tasks.js';
  import { 
    realtimeManager,
    activeTesters,
    completedTests,
    startTest,
    completeTest,
    herbieKeywords
  } from '$lib/stores/realtime.js';
  import TaskCard from '$lib/components/TaskCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';

  let searchInput = '';
  let testResultsObserver;
  let errorMessage = '';
  let initializationComplete = false;
  let currentUser = null;

  // Reactive declarations
  $: searchQuery.set(searchInput);
  $: currentUser = getCurrentUser();

  // Auth guard - redirect to login if not authenticated
  onMount(async () => {
    if (!requireAuth()) {
      goto('/auth/login');
      return;
    }

    console.log('Dashboard mounted, initializing...');
    
    await initializeApplication();

    // Connect to real-time updates
    realtimeManager.connect();

    // Set up test results observer
    setupTestResultObserver();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && requireAuth()) {
        console.log('Page became visible, ensuring real-time connection');
        realtimeManager.connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  onDestroy(() => {
    if (testResultsObserver) {
      testResultsObserver.disconnect();
    }
    realtimeManager.disconnect();
  });

  async function initializeApplication() {
    try {
      console.log('🚀 Initializing dashboard...');
      
      // Load tasks from Excel
      console.log('📊 Loading tasks from Excel...');
      await loadTasks();
      
      // Load herbie keywords
      console.log('🔧 Loading herbie keywords...');
      try {
        await loadHerbieKeywords();
      } catch (error) {
        // Non-critical error, continue without herbie keywords
        console.warn('Herbie keywords loading failed (non-critical):', error);
      }
      
      console.log('✅ Dashboard initialization complete');
      initializationComplete = true;
      
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      showError(`Failed to initialize dashboard: ${error.message}`);
    }
  }

  function handleLogout() {
    console.log('User logging out');
    logout();
    goto('/auth/login');
  }

  function handleStartTest(event) {
    const { task } = event.detail;
    console.log('Starting test for task:', task);
    
    if (!currentUser) {
      showError('User session expired. Please log in again.');
      handleLogout();
      return;
    }

    const success = startTest(
      currentUser.firstName + ' ' + currentUser.lastName,
      task.id,
      task.name,
      task.description,
      task.herbie_script,
      $herbieKeywords
    );

    if (success) {
      // Open task URL if available
      if (task.url) {
        try {
          window.open(task.url, '_blank');
        } catch (error) {
          console.error('Error opening task URL:', error);
        }
      }
    } else {
      showError('Failed to start test. Please check your connection.');
    }
  }

  function setupTestResultObserver() {
    // Create hidden results div if it doesn't exist
    let resultsDiv = document.getElementById('usabilityTestResults');
    if (!resultsDiv) {
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'usabilityTestResults';
      resultsDiv.style.display = 'none';
      document.body.appendChild(resultsDiv);
    }

    testResultsObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-test-results') {
          const resultsData = mutation.target.getAttribute('data-test-results');
          if (resultsData) {
            handleTestResults(resultsData);
          }
        }
      });
    });

    testResultsObserver.observe(resultsDiv, { attributes: true });
  }

  function handleTestResults(resultsData) {
    try {
      const results = JSON.parse(resultsData);
      console.log('Received test results:', results);
      
      // Update the task card's results display
      updateTaskResultsDisplay(results);
      
      // Parse verification statements to count steps and errors
      let steps = 0;
      let errors = 0;
      
      try {
        const verifications = JSON.parse(results.verify_statements || '{}');
        Object.values(verifications).forEach(result => {
          steps++;
          if (!result.success) errors++;
        });
      } catch (e) {
        console.error('Error parsing verifications:', e);
      }

      // Convert time to seconds
      const [mins, secs] = (results.time || '0:00').split(':');
      const timeSec = (parseInt(mins, 10) || 0) * 60 + (parseFloat(secs) || 0);

      if (!currentUser) {
        showError('User session expired. Please log in again.');
        handleLogout();
        return;
      }

      // Send completion data
      const success = completeTest(
        currentUser.firstName + ' ' + currentUser.lastName,
        results.taskId,
        results.taskName,
        timeSec,
        steps,
        errors
      );

      if (!success) {
        showError('Failed to submit test results. Please check your connection.');
      }

    } catch (error) {
      console.error('Error handling test results:', error);
      showError('Error processing test results.');
    }
  }

  function updateTaskResultsDisplay(results) {
    const resultsDiv = document.getElementById(`test-results-${results.taskId}`);
    if (!resultsDiv) {
      console.warn('Results div not found for task:', results.taskId);
      return;
    }
    
    let html = '<h3>Test Results</h3>';
    
    // Display basic results
    Object.entries(results).forEach(([key, val]) => {
      if (key === 'verify_statements') return;
      
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<p><strong>${escapeHtml(formattedKey)}</strong>: ${escapeHtml(val.toString())}</p>`;
    });

    // Parse and render verifications
    try {
      const verifications = JSON.parse(results.verify_statements || '{}');
      if (Object.keys(verifications).length > 0) {
        html += '<div class="verifications"><h4>Verifications</h4>';
        Object.entries(verifications).forEach(([assertion, result]) => {
          const className = result.success ? 'verification success' : 'verification failure';
          html += `
            <div class="${className}">
              <div class="assertion">${escapeHtml(assertion)}</div>
              <div class="message">${escapeHtml(result.message)}</div>
            </div>`;
        });
        html += '</div>';
      }
    } catch (error) {
      console.error('Error parsing verifications:', error);
      html += '<p><em>Error parsing test verifications.</em></p>';
    }

    resultsDiv.innerHTML = html;
  }

  function getTaskStatus(task) {
    if (!currentUser) return 'not-started';
    
    const userFullName = currentUser.firstName + ' ' + currentUser.lastName;
    
    // Check completed first (higher priority)
    const isCompleted = $completedTests.some(t => 
      t.testerName === userFullName && t.taskId === task.id
    );
    
    if (isCompleted) return 'completed';
    
    // Then check active
    const isActive = $activeTesters.some(t => 
      t.testerName === userFullName && t.taskId === task.id
    );
    
    if (isActive) return 'in-progress';
    
    return 'not-started';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showError(message) {
    errorMessage = message;
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      errorMessage = '';
    }, 5000);
  }

  function clearError() {
    errorMessage = '';
  }

  async function retryLoadTasks() {
    try {
      await initializeApplication();
      clearError();
    } catch (error) {
      showError(`Retry failed: ${error.message}`);
    }
  }
</script>

<svelte:head>
  <title>Dashboard - Usability Olympics</title>
  <meta name="description" content="Usability testing dashboard with task management and real-time leaderboard" />
</svelte:head>

{#if errorMessage}
  <div class="error-message" on:click={clearError} role="alert">
    {errorMessage}
    <button class="error-close" on:click={clearError} aria-label="Close error message">×</button>
  </div>
{/if}

<div class="dashboard-container">
  <header class="dashboard-header">
    <div class="header-left">
      <h1>Usability Olympics</h1>
      {#if currentUser}
        <p class="welcome-message">Welcome back, {currentUser.firstName}!</p>
      {/if}
    </div>
    <div class="header-right">
      <input 
        type="text" 
        bind:value={searchInput}
        placeholder="Search tasks..." 
        class="search-box"
        disabled={$isLoadingTasks}
      />
      <a href="/leaderboard" class="button" target="_blank" rel="noopener noreferrer">
        View Leaderboard
      </a>
      <div class="user-menu">
        <button class="user-button" title="User menu">
          <span class="user-avatar">
            {currentUser ? currentUser.firstName.charAt(0).toUpperCase() : '?'}
          </span>
          <span class="user-name">
            {currentUser ? currentUser.firstName : 'User'}
          </span>
        </button>
        <div class="user-dropdown">
          <a href="/profile" class="dropdown-item">Profile</a>
          <a href="/settings" class="dropdown-item">Settings</a>
          <hr class="dropdown-divider">
          <button on:click={handleLogout} class="dropdown-item logout-item">
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="dashboard-main">
    {#if $isLoadingTasks}
      <div class="loading-message">
        <div class="loading-spinner"></div>
        <p>Loading tasks from Excel file...</p>
      </div>
    {:else if $taskLoadError}
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Failed to Load Tasks</h3>
        <p>{$taskLoadError}</p>
        <div class="error-actions">
          <button class="button" on:click={retryLoadTasks}>
            Retry Loading
          </button>
        </div>
      </div>
    {:else if !initializationComplete}
      <div class="loading-message">
        <p>Initializing dashboard...</p>
      </div>
    {:else}
      <div class="task-list">
        {#each $paginatedTasks as task (task.id)}
          <TaskCard 
            {task} 
            status={getTaskStatus(task)}
            on:startTest={handleStartTest}
          />
        {:else}
          <div class="empty-message">
            {#if searchInput}
              No tasks matching "{searchInput}"
            {:else}
              No tasks available
            {/if}
          </div>
        {/each}
      </div>

      <Pagination />
    {/if}

    <!-- Hidden element for test results observation -->
    <div id="usabilityTestResults" style="display: none;" aria-hidden="true"></div>
  </main>

  <ConnectionStatus />
</div>

<style>
  .dashboard-container {
    min-height: 100vh;
    background-color: #f8f9fa;
  }

  .dashboard-header {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-left h1 {
    margin: 0;
    color: #333;
    font-size: 1.5rem;
  }

  .welcome-message {
    margin: 5px 0 0 0;
    font-weight: 500;
    color: #62929a;
    font-size: 0.9rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .search-box {
    padding: 10px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    width: 300px;
    font-size: 14px;
    transition: all 0.2s ease;
    outline: none;
  }

  .search-box:focus {
    border-color: #62929a;
    box-shadow: 0 0 0 3px rgba(98, 146, 154, 0.1);
  }

  .button {
    padding: 10px 18px;
    border-radius: 6px;
    background: #62929a;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
  }

  .button:hover {
    background: #4f7b85;
    transform: translateY(-1px);
  }

  .user-menu {
    position: relative;
  }

  .user-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .user-button:hover {
    background-color: #f3f4f6;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }

  .user-name {
    font-weight: 500;
    color: #374151;
  }

  .user-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    padding: 8px;
    min-width: 160px;
    display: none;
    z-index: 1000;
  }

  .user-menu:hover .user-dropdown {
    display: block;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-decoration: none;
    color: #374151;
    border: none;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    text-align: left;
    transition: background-color 0.2s ease;
  }

  .dropdown-item:hover {
    background-color: #f3f4f6;
  }

  .logout-item {
    color: #dc2626;
  }

  .logout-item:hover {
    background-color: #fef2f2;
  }

  .dropdown-divider {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 4px 0;
  }

  .dashboard-main {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }

  .loading-message {
    text-align: center;
    padding: 60px 20px;
    color: #666;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #62929a;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-container {
    text-align: center;
    padding: 40px 20px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    margin: 20px 0;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 15px;
  }

  .error-container h3 {
    color: #856404;
    margin-bottom: 10px;
  }

  .error-container p {
    color: #856404;
    margin-bottom: 20px;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .empty-message {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 8px;
    color: #666;
    font-style: italic;
    border: 1px dashed #ccc;
  }

  .error-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #dc2626;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 350px;
  }

  .error-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    margin-left: auto;
  }

  .error-close:hover {
    opacity: 0.8;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      align-items: stretch;
      gap: 15px;
      padding: 15px;
    }

    .header-right {
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .search-box {
      width: 100%;
      max-width: 300px;
    }

    .dashboard-main {
      padding: 15px;
    }

    .error-message {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }

  @media (max-width: 480px) {
    .header-right {
      flex-direction: column;
      align-items: stretch;
    }

    .search-box {
      max-width: none;
    }
  }
</style>