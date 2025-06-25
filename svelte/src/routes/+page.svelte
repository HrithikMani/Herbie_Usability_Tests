<!-- src/routes/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { 
    testerName, 
    wsManager, 
    activeTesters, 
    completedTests,
    startTest,
    completeTest,
    herbieKeywords
  } from '$lib/stores/websocket.js';
  import { 
    loadTasks, 
    loadHerbieKeywords,
    searchQuery,
    paginatedTasks,
    currentPage,
    totalPages
  } from '$lib/stores/tasks.js';
  import TesterModal from '$lib/components/TesterModal.svelte';
  import TaskCard from '$lib/components/TaskCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';

  let showModal = true;
  let searchInput = '';
  let testResultsObserver;
  let loadingTasks = false;
  let errorMessage = '';

  // Reactive declarations
  $: showModal = !$testerName;
  $: searchQuery.set(searchInput);

  onMount(async () => {
    console.log('Page mounted, initializing...');
    
    // Load tasks and herbie keywords
    try {
      loadingTasks = true;
      await loadTasks();
      await loadHerbieKeywords();
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load application data. Please refresh the page.');
    } finally {
      loadingTasks = false;
    }

    // Connect WebSocket if user is logged in
    if ($testerName) {
      wsManager.connect();
    }

    // Set up test results observer
    setupTestResultObserver();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && $testerName) {
        console.log('Page became visible, ensuring WebSocket connection');
        wsManager.connect();
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
    wsManager.disconnect();
  });

  function handleTesterLogin(event) {
    const name = event.detail.name;
    console.log('User logged in:', name);
    
    testerName.set(name);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('testerName', name);
    }
    wsManager.connect();
  }

  function handleLogout() {
    console.log('User logged out');
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('testerName');
    }
    testerName.set('');
    wsManager.disconnect();
  }

  function handleStartTest(event) {
    const { task } = event.detail;
    console.log('Starting test for task:', task);
    
    const success = startTest(
      $testerName,
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

      // Send completion data
      const success = completeTest(
        $testerName,
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
    // Check completed first (higher priority)
    const isCompleted = $completedTests.some(t => 
      t.testerName === $testerName && t.taskId === task.id
    );
    
    if (isCompleted) return 'completed';
    
    // Then check active
    const isActive = $activeTesters.some(t => 
      t.testerName === $testerName && t.taskId === task.id
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
</script>

<svelte:head>
  <title>Usability Testing - Home</title>
  <meta name="description" content="Usability testing platform with real-time leaderboard and task management" />
</svelte:head>

{#if errorMessage}
  <div class="error-message" on:click={clearError} role="alert">
    {errorMessage}
    <button class="error-close" on:click={clearError} aria-label="Close error message">×</button>
  </div>
{/if}

{#if showModal}
  <TesterModal on:login={handleTesterLogin} />
{:else}
  <div class="main-content">
    <header class="header">
      <div class="header-left">
        <h1>Usability Olympics</h1>
        <p class="welcome-message">Welcome, {$testerName}!</p>
      </div>
      <div class="header-right">
        <input 
          type="text" 
          bind:value={searchInput}
          placeholder="Search tasks..." 
          class="search-box"
          disabled={loadingTasks}
        />
        <a href="/leaderboard" class="button" target="_blank" rel="noopener noreferrer">
          View Leaderboard
        </a>
        <button on:click={handleLogout} class="logout-button">
          Logout
        </button>
      </div>
    </header>

    {#if loadingTasks}
      <div class="loading-message">
        <p>Loading tasks...</p>
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
  </div>

  <ConnectionStatus />
{/if}

<style>
  .main-content {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .loading-message {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    font-style: italic;
  }

  .error-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #d9534f;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 300px;
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

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .error-message {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
</style>