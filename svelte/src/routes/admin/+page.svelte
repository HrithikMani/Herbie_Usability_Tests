<!-- src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, logout, apiRequest } from '$lib/stores/auth.js';

  let users = [];
  let testResults = [];
  let systemStats = {};
  let isLoading = true;
  let error = '';
  let selectedTab = 'users';

  // Get current user data at top level to avoid scoping issues
  $: currentUser = $user;
  $: currentUserId = currentUser?.id;

  // Redirect if not admin
  $: if (currentUser && currentUser.role !== 'admin') {
    goto('/');
  }

  onMount(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      goto('/');
      return;
    }

    await loadAdminData();
  });

  async function loadAdminData() {
    isLoading = true;
    error = '';

    try {
      // Load users, test results, and system stats
      await Promise.all([
        loadUsers(),
        loadTestResults(),
        loadSystemStats()
      ]);
    } catch (err) {
      console.error('Error loading admin data:', err);
      error = 'Failed to load admin data';
    } finally {
      isLoading = false;
    }
  }

  async function loadUsers() {
    try {
      const data = await apiRequest('/api/admin/users');
      users = data.users || [];
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }

  async function loadTestResults() {
    try {
      const data = await apiRequest('/api/admin/test-results');
      testResults = data.testResults || [];
    } catch (err) {
      console.error('Error loading test results:', err);
    }
  }

  async function loadSystemStats() {
    try {
      const data = await apiRequest('/api/admin/stats');
      systemStats = data || {};
    } catch (err) {
      console.error('Error loading system stats:', err);
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    try {
      await apiRequest(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST'
      });
      
      // Update local state
      users = users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      );
    } catch (err) {
      console.error('Error toggling user status:', err);
      error = 'Failed to update user status';
    }
  }

  async function deleteUser(userId) {
    const confirmed = confirm('Are you sure you want to delete this user? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      // Remove from local state
      users = users.filter(user => user.id !== userId);
    } catch (err) {
      console.error('Error deleting user:', err);
      error = 'Failed to delete user';
    }
  }

  async function deleteTestResult(resultId) {
    const confirmed = confirm('Are you sure you want to delete this test result?');
    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/test-results/${resultId}`, {
        method: 'DELETE'
      });
      
      // Remove from local state
      testResults = testResults.filter(result => result.id !== resultId);
    } catch (err) {
      console.error('Error deleting test result:', err);
      error = 'Failed to delete test result';
    }
  }

  async function resetAllData() {
    const confirmed = confirm('Are you sure you want to reset ALL test data? This will delete all test results but keep user accounts.');
    if (!confirmed) return;

    try {
      await apiRequest('/api/reset', { method: 'POST' });
      await loadTestResults();
      alert('All test data has been reset');
    } catch (err) {
      console.error('Error resetting data:', err);
      error = 'Failed to reset data';
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleLogout() {
    await logout();
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Usability Testing</title>
  <meta name="description" content="Administrative dashboard for managing users and test data" />
</svelte:head>

<div class="admin-container">
  <!-- Header -->
  <header class="admin-header">
    <div class="header-left">
      <h1>🛠️ Admin Dashboard</h1>
      <p>System management and user administration</p>
    </div>
    <div class="header-right">
      <span class="admin-info">👤 {currentUser?.fullName} (Admin)</span>
      <a href="/" class="nav-button">Dashboard</a>
      <a href="/leaderboard" class="nav-button">Leaderboard</a>
      <button on:click={handleLogout} class="logout-button">Logout</button>
    </div>
  </header>

  {#if error}
    <div class="error-banner" role="alert">
      <span>⚠️ {error}</span>
      <button on:click={() => error = ''}>✕</button>
    </div>
  {/if}

  <!-- Tab Navigation -->
  <nav class="tab-nav">
    <button 
      class="tab-button" 
      class:active={selectedTab === 'stats'}
      on:click={() => selectedTab = 'stats'}
    >
      📊 Statistics
    </button>
    <button 
      class="tab-button" 
      class:active={selectedTab === 'users'}
      on:click={() => selectedTab = 'users'}
    >
      👥 Users ({users.length})
    </button>
    <button 
      class="tab-button" 
      class:active={selectedTab === 'tests'}
      on:click={() => selectedTab = 'tests'}
    >
      📋 Test Results ({testResults.length})
    </button>
    <button 
      class="tab-button danger" 
      class:active={selectedTab === 'danger'}
      on:click={() => selectedTab = 'danger'}
    >
      ⚠️ Danger Zone
    </button>
  </nav>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading admin data...</p>
      </div>
    {:else if selectedTab === 'stats'}
      <!-- System Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <h3>Total Users</h3>
            <p class="stat-value">{systemStats.totalUsers || 0}</p>
            <small>{systemStats.activeUsers || 0} active</small>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <h3>Total Tests</h3>
            <p class="stat-value">{systemStats.totalTests || 0}</p>
            <small>{systemStats.activeTests || 0} in progress</small>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <h3>Completed Tests</h3>
            <p class="stat-value">{systemStats.completedTests || 0}</p>
            <small>All time</small>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <h3>Avg. Completion Time</h3>
            <p class="stat-value">{formatTime(systemStats.avgCompletionTime)}</p>
            <small>Per test</small>
          </div>
        </div>
      </div>

    {:else if selectedTab === 'users'}
      <!-- Users Management -->
      <div class="section-header">
        <h2>User Management</h2>
        <button class="refresh-button" on:click={loadUsers}>🔄 Refresh</button>
      </div>

      <div class="users-table">
        <div class="table-header">
          <div class="col">User</div>
          <div class="col">Email</div>
          <div class="col">Role</div>
          <div class="col">Status</div>
          <div class="col">Joined</div>
          <div class="col">Last Login</div>
          <div class="col">Actions</div>
        </div>
        
        {#each users as user}
          <div class="table-row" class:inactive={!user.is_active}>
            <div class="col">
              <div class="user-info">
                <strong>{user.full_name}</strong>
                <small>@{user.username}</small>
              </div>
            </div>
            <div class="col">{user.email}</div>
            <div class="col">
              <span class="role-badge {user.role}">{user.role}</span>
            </div>
            <div class="col">
              <span class="status-badge {user.is_active ? 'active' : 'inactive'}">
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div class="col">{formatDate(user.created_at)}</div>
            <div class="col">{formatDate(user.last_login)}</div>
            <div class="col">
              <div class="action-buttons">
                <button 
                  class="action-btn toggle" 
                  on:click={() => toggleUserStatus(user.id, user.is_active)}
                  title="{user.is_active ? 'Deactivate' : 'Activate'} user"
                >
                  {user.is_active ? '🚫' : '✅'}
                </button>
                {#if user.id !== currentUserId}
                  <button 
                    class="action-btn delete" 
                    on:click={() => deleteUser(user.id)}
                    title="Delete user"
                  >
                    🗑️
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}

        {#if users.length === 0}
          <div class="empty-state">
            <p>No users found</p>
          </div>
        {/if}
      </div>

    {:else if selectedTab === 'tests'}
      <!-- Test Results Management -->
      <div class="section-header">
        <h2>Test Results</h2>
        <button class="refresh-button" on:click={loadTestResults}>🔄 Refresh</button>
      </div>

      <div class="tests-table">
        <div class="table-header">
          <div class="col">User</div>
          <div class="col">Task</div>
          <div class="col">Status</div>
          <div class="col">Time</div>
          <div class="col">Steps/Errors</div>
          <div class="col">Started</div>
          <div class="col">Completed</div>
          <div class="col">Actions</div>
        </div>
        
        {#each testResults as result}
          <div class="table-row">
            <div class="col">{result.username}</div>
            <div class="col">
              <div class="task-info">
                <strong>#{result.task_id}</strong>
                <small>{result.task_name}</small>
              </div>
            </div>
            <div class="col">
              <span class="status-badge {result.status}">{result.status}</span>
            </div>
            <div class="col">{formatTime(result.completion_time)}</div>
            <div class="col">
              <div class="stats">
                <span>📊 {result.steps}</span>
                <span class="errors {result.errors > 0 ? 'has-errors' : ''}">❌ {result.errors}</span>
              </div>
            </div>
            <div class="col">{formatDate(result.started_at)}</div>
            <div class="col">{formatDate(result.completed_at)}</div>
            <div class="col">
              <button 
                class="action-btn delete" 
                on:click={() => deleteTestResult(result.id)}
                title="Delete test result"
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}

        {#if testResults.length === 0}
          <div class="empty-state">
            <p>No test results found</p>
          </div>
        {/if}
      </div>

    {:else if selectedTab === 'danger'}
      <!-- Danger Zone -->
      <div class="danger-zone">
        <h2>⚠️ Danger Zone</h2>
        <p>These actions are irreversible. Please proceed with caution.</p>
        
        <div class="danger-actions">
          <div class="danger-action">
            <div class="action-info">
              <h3>Reset All Test Data</h3>
              <p>This will delete all test results but keep user accounts.</p>
            </div>
            <button class="danger-button" on:click={resetAllData}>
              Reset Test Data
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .admin-container {
    min-height: 100vh;
    background: #f8fafc;
    padding: 20px;
  }

  .admin-header {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .header-left h1 {
    margin: 0 0 8px 0;
    color: #1a202c;
    font-size: 1.8rem;
    font-weight: 700;
  }

  .header-left p {
    margin: 0;
    color: #718096;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .admin-info {
    padding: 8px 12px;
    background: #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #2d3748;
  }

  .nav-button, .logout-button {
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

  .tab-nav {
    background: white;
    border-radius: 12px;
    padding: 8px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 4px;
  }

  .tab-button {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #718096;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-button:hover {
    background: #f7fafc;
    color: #2d3748;
  }

  .tab-button.active {
    background: #4299e1;
    color: white;
  }

  .tab-button.danger {
    color: #e53e3e;
  }

  .tab-button.danger.active {
    background: #e53e3e;
    color: white;
  }

  .tab-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .loading-state {
    text-align: center;
    padding: 40px;
    color: #718096;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #4299e1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .stat-card {
    background: #f7fafc;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    font-size: 2rem;
    width: 60px;
    height: 60px;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info h3 {
    margin: 0 0 8px 0;
    color: #4a5568;
    font-size: 14px;
    font-weight: 600;
  }

  .stat-value {
    margin: 0 0 4px 0;
    color: #1a202c;
    font-size: 24px;
    font-weight: 700;
  }

  .stat-info small {
    color: #718096;
    font-size: 12px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-header h2 {
    margin: 0;
    color: #1a202c;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .refresh-button {
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .refresh-button:hover {
    background: #3182ce;
  }

  .users-table, .tests-table {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .table-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #f7fafc;
    padding: 16px;
    font-weight: 600;
    color: #4a5568;
    font-size: 14px;
    border-bottom: 1px solid #e2e8f0;
  }

  .tests-table .table-header {
    grid-template-columns: repeat(8, 1fr);
  }

  .table-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 16px;
    border-bottom: 1px solid #f7fafc;
    transition: background-color 0.2s ease;
    align-items: center;
  }

  .tests-table .table-row {
    grid-template-columns: repeat(8, 1fr);
  }

  .table-row:hover {
    background: #f7fafc;
  }

  .table-row.inactive {
    opacity: 0.6;
  }

  .col {
    font-size: 14px;
    color: #2d3748;
  }

  .user-info strong {
    display: block;
    font-weight: 600;
  }

  .user-info small {
    color: #718096;
    font-size: 12px;
  }

  .task-info strong {
    display: block;
    font-weight: 600;
  }

  .task-info small {
    color: #718096;
    font-size: 12px;
  }

  .role-badge, .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .role-badge.admin {
    background: #fed7d7;
    color: #c53030;
  }

  .role-badge.tester {
    background: #c6f6d5;
    color: #2f855a;
  }

  .status-badge.active, .status-badge.completed {
    background: #c6f6d5;
    color: #2f855a;
  }

  .status-badge.inactive {
    background: #e2e8f0;
    color: #4a5568;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
  }

  .errors.has-errors {
    color: #e53e3e;
    font-weight: 600;
  }

  .action-buttons {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: #e2e8f0;
  }

  .action-btn.delete:hover {
    background: #fed7d7;
    border-color: #fc8181;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #718096;
  }

  .danger-zone {
    border: 2px dashed #e53e3e;
    border-radius: 12px;
    padding: 24px;
    background: #fed7d7;
  }

  .danger-zone h2 {
    margin: 0 0 8px 0;
    color: #c53030;
  }

  .danger-zone p {
    margin: 0 0 24px 0;
    color: #c53030;
  }

  .danger-actions {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .danger-action {
    background: white;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .action-info h3 {
    margin: 0 0 4px 0;
    color: #1a202c;
  }

  .action-info p {
    margin: 0;
    color: #718096;
    font-size: 14px;
  }

  .danger-button {
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 20px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .danger-button:hover {
    background: #c53030;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .admin-container {
      padding: 10px;
    }

    .admin-header {
      flex-direction: column;
      align-items: stretch;
    }

    .tab-nav {
      overflow-x: auto;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .table-header, .table-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .danger-action {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }
  }
</style>