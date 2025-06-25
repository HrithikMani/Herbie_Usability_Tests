<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { testerName } from '$lib/stores/websocket.js';
  import '../app.css';

  // Check for stored tester name on mount
  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('testerName');
      if (stored) {
        testerName.set(stored);
      }
    }
  });
</script>

<main>
  <slot />
</main>

<style>
  /* Global layout styles if needed */
  :global(html) {
    scroll-behavior: smooth;
  }
  
  :global(body) {
    min-height: 100vh;
  }
  
  main {
    min-height: calc(100vh - 40px);
  }
</style>