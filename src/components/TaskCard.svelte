<script>
    export let task;
    let testInProgress = false;
    let testCompleted = false;
    let startTime, endTime;
    let taskTime = 0;
    let testResult = {};
  
    function startTest() {
      testInProgress = true;
      startTime = Date.now();
      window.open(task.url, "_blank"); // Open task-specific URL in a new tab
    }
  
    function completeTest() {
      testInProgress = false;
      testCompleted = true;
      endTime = Date.now();
      taskTime = Math.floor((endTime - startTime) / 1000);
      retrieveTestResults();
    }
  
    // Retrieve test results from Chrome local storage
    function retrieveTestResults() {
      if (chrome?.storage) {
        chrome.storage.local.get(["usabilityTestResults"], function (data) {
          if (data.usabilityTestResults && data.usabilityTestResults[task.id]) {
            testResult = data.usabilityTestResults[task.id];
          }
        });
      }
    }
  
    // Retrieve results when the page loads
    retrieveTestResults();
  </script>
  
  <div class="task-card">
    <div class="task-header">
      <h2 class="task-title">{task.name}</h2>
      <span class="task-status {testInProgress ? 'in-progress' : testCompleted ? 'completed' : 'not-started'}">
        {testCompleted ? "Completed" : testInProgress ? "In Progress" : "Not Started"}
      </span>
    </div>
  
    <p class="task-description">{task.description}</p>
  
    {#if !testInProgress && !testCompleted}
      <button class="button button-primary mt-4" on:click={startTest}>Start Test</button>
    {:else if testInProgress}
      <p class="test-status">Test in progress... Please complete the task.</p>
      <button class="button button-secondary mt-4" on:click={completeTest}>Complete Test</button>
    {:else}
      <div class="test-results">
        <h3>Usability Test Results</h3>
        
        <p><strong>Task Time:</strong> {testResult.time || taskTime} Seconds</p>
        <p><strong>Clicks/Steps:</strong> {testResult.steps || "Not recorded"}</p>
        <p><strong>Errors/Verbalizations:</strong></p>
        <p class="feedback-text">{testResult.errors || "No errors recorded"}</p>
        
        <p><strong>Overall Rating:</strong> {testResult.rating ? testResult.rating + "/5" : "Not rated"}</p>
      </div>
    {/if}
  </div>
  
  <style>
    .task-card {
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(92, 87, 87, 0.3);
      transition: transform 0.2s ease-in-out;
      position: relative;
    }
  
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  
    .task-title {
      font-size: 18px;
      font-weight: bold;
      color: #363434;
    }
  
    .task-status {
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
  
    .not-started {
      background: #d1d5db;
      color: #363434;
    }
  
    .in-progress {
      background: #fbbf24;
      color: #8a5200;
    }
  
    .completed {
      background: #34d399;
      color: white;
    }
  
    .task-description {
      font-size: 14px;
      color: #5c5757;
      margin-top: 8px;
    }
  
    .test-results {
      margin-top: 10px;
      background: #f9f9f9;
      padding: 10px;
      border-radius: 5px;
      border-left: 5px solid #62929a;
    }
  
    .feedback-text {
      font-style: italic;
      color: #5c5757;
    }
  
    .button {
      padding: 8px 16px;
      border-radius: 5px;
      font-weight: bold;
      transition: background 0.2s;
      border: none;
      cursor: pointer;
    }
  
    .button-primary {
      background: #62929a;
      color: white;
    }
  
    .button-secondary {
      background: #5c5757;
      color: white;
    }
  </style>
  