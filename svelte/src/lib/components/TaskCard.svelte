<!-- src/lib/components/TaskCard.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let task;
  export let status = 'not-started';
  
  const dispatch = createEventDispatcher();
  
  function handleStartTest() {
    dispatch('startTest', { task });
  }
  
  function getStatusText(status) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      default: return 'Not Started';
    }
  }
  
  // Process description to preserve line breaks
  function formatDescription(description) {
    if (!description) return [];
    return description.split('\n').filter(line => line.trim());
  }
  
  $: formattedDescription = formatDescription(task.description);
  $: statusText = getStatusText(status);
  $: isCompleted = status === 'completed';
  $: isInProgress = status === 'in-progress';
</script>

<div class="task-card" data-task-id={task.id}>
  <div class="task-header">
    <h3>{task.name}</h3>
    <span class="task-status {status}" title="Task Status: {statusText}">
      {statusText}
    </span>
  </div>
  
  <div class="task-description">
    {#each formattedDescription as line}
      <p>{line}</p>
    {/each}
  </div>
  
  <!-- Test results will be populated by JavaScript when tests complete -->
  <div class="test-results" id="test-results-{task.id}"></div>
  
  <button 
    class="button start-test-btn" 
    on:click={handleStartTest}
    disabled={isInProgress}
    title={isInProgress ? 'Test is currently in progress' : 'Click to start this test'}
  >
    {#if isInProgress}
      Test Running...
    {:else if isCompleted}
      Restart Test
    {:else}
      Start Test
    {/if}
  </button>
</div>

<style>
  .task-card {
    background: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease, transform 0.2s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-left: 6px solid #62929a;
  }

  .task-card:hover {
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .task-header h3 {
    margin: 0;
    flex: 1;
    color: #333;
    font-size: 1.1rem;
  }

  .task-status {
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 15px;
    display: inline-block;
    text-align: center;
    min-width: 100px;
    font-size: 12px;
    transition: all 0.3s ease;
  }

  .task-status.not-started {
    background-color: #f0f0f0;
    color: #555;
  }

  .task-status.in-progress {
    background-color: #f0ad4e;
    color: white;
    animation: pulse 2s infinite;
  }

  .task-status.completed {
    background-color: #5cb85c;
    color: white;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .task-description {
    margin-bottom: 15px;
    line-height: 1.5;
  }

  .task-description p {
    margin: 0 0 8px 0;
    color: #666;
  }

  .task-description p:last-child {
    margin-bottom: 0;
  }

  .test-results {
    margin-top: 15px;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    border-left: 5px solid #62929a;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.05);
    display: none;
  }

  .test-results:not(:empty) {
    display: block;
  }

  .test-results :global(h3) {
    margin-top: 0;
    color: #333;
    font-size: 16px;
    border-bottom: 1px solid #e1e4e8;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .test-results :global(.verifications) {
    margin-top: 1em;
    padding-top: 1em;
    border-top: 1px solid #ddd;
  }

  .test-results :global(.verification) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .test-results :global(.verification.success) {
    background-color: #e6ffed;
    border-left: 4px solid #28a745;
  }

  .test-results :global(.verification.failure) {
    background-color: #ffe6e6;
    border-left: 4px solid #dc3545;
  }

  .test-results :global(.assertion) {
    font-weight: 600;
    color: #333;
  }

  .test-results :global(.message) {
    font-size: 0.9rem;
    color: #555;
    margin-left: 4px;
  }

  .button {
    padding: 10px 18px;
    border-radius: 5px;
    background: #62929a;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease-in-out;
    align-self: flex-end;
    margin-top: 10px;
    min-width: 120px;
  }

  .button:hover:not(:disabled) {
    background: #4f7b85;
    transform: translateY(-1px);
  }

  .button:disabled {
    background: #a0a0a0;
    cursor: not-allowed;
    transform: none;
  }

  .button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .task-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .task-status {
      align-self: flex-end;
      margin-top: -30px;
    }
    
    .button {
      align-self: stretch;
      margin-top: 15px;
    }
  }
</style>