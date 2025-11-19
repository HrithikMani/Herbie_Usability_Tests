<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authManager, isAuthenticated, user, isLoading } from '$lib/stores/auth.js';
  import '../app.css';

  // Routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  
  // Check if current route requires authentication
  $: requiresAuth = !publicRoutes.includes($page.route.id);
  
  // Redirect logic
  $: {
    if (typeof window !== 'undefined') {
      // If user is not authenticated and trying to access protected route
      if (requiresAuth && !$isAuthenticated && !$isLoading) {
        goto('/login');
      }
      // If user is authenticated and trying to access login/register
      else if (!requiresAuth && $isAuthenticated && ($page.route.id === '/login' || $page.route.id === '/register')) {
        goto('/');
      }
    }
  }

  onMount(async () => {
    // Initialize authentication on app start
    await authManager.init();
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{#if $isLoading}
  <!-- Show loading screen while checking authentication -->
  <div class="app-loading">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
{:else}
  <!-- Show main content -->
  <main class="app-main">
    <slot />
  </main>
{/if}

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  
  :global(body) {
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }
  
  .app-main {
    min-height: 100vh;
  }

  .app-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .loading-container {
    text-align: center;
    color: white;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-container p {
    font-size: 16px;
    margin: 0;
  }
</style>