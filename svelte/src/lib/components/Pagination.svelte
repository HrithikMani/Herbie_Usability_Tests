<!-- src/lib/components/Pagination.svelte -->
<script>
  import { currentPage, totalPages, setPage } from '$lib/stores/tasks.js';
  
  function handlePrevPage() {
    if ($currentPage > 1) {
      setPage($currentPage - 1);
      scrollToTaskList();
    }
  }
  
  function handleNextPage() {
    if ($currentPage < $totalPages) {
      setPage($currentPage + 1);
      scrollToTaskList();
    }
  }
  
  function handlePageClick(pageNum) {
    setPage(pageNum);
    scrollToTaskList();
  }
  
  function scrollToTaskList() {
    // Smooth scroll to task list after page change
    setTimeout(() => {
      const taskList = document.querySelector('.task-list');
      if (taskList) {
        taskList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
  
  // Generate page numbers array with smart truncation
  $: pageNumbers = (() => {
    const pages = [];
    const current = $currentPage;
    const total = $totalPages;
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Smart truncation for more than 7 pages
      pages.push(1);
      
      if (current <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        // Near the end
        pages.push('...');
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  })();
</script>

{#if $totalPages > 1}
  <div class="pagination" role="navigation" aria-label="Pagination">
    <button 
      class="pagination-button" 
      disabled={$currentPage === 1}
      on:click={handlePrevPage}
      aria-label="Go to previous page"
    >
      Previous
    </button>
    
    <div class="pagination-numbers">
      {#each pageNumbers as pageNum}
        {#if pageNum === '...'}
          <span class="pagination-ellipsis" aria-hidden="true">...</span>
        {:else}
          <button 
            class="pagination-button {pageNum === $currentPage ? 'active' : ''}"
            on:click={() => handlePageClick(pageNum)}
            aria-label="Go to page {pageNum}"
            aria-current={pageNum === $currentPage ? 'page' : undefined}
          >
            {pageNum}
          </button>
        {/if}
      {/each}
    </div>
    
    <button 
      class="pagination-button" 
      disabled={$currentPage === $totalPages}
      on:click={handleNextPage}
      aria-label="Go to next page"
    >
      Next
    </button>
  </div>
  
  <div class="pagination-info" aria-live="polite">
    Page {$currentPage} of {$totalPages}
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pagination-numbers {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-wrap: wrap;
  }

  .pagination-button {
    background: #363434;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    border: none;
    font-size: 14px;
    transition: all 0.2s ease;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pagination-button.active {
    background: #62929a;
    font-weight: bold;
    transform: scale(1.05);
  }

  .pagination-button:disabled {
    background: #a0a0a0;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .pagination-button:not(:disabled):hover {
    background: #4f7b85;
    transform: translateY(-1px);
  }

  .pagination-button.active:hover {
    background: #62929a;
    transform: scale(1.05);
  }

  .pagination-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .pagination-ellipsis {
    padding: 10px 5px;
    color: #666;
    font-weight: bold;
    user-select: none;
  }

  .pagination-info {
    text-align: center;
    margin-top: 10px;
    color: #666;
    font-size: 14px;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .pagination {
      gap: 5px;
    }
    
    .pagination-numbers {
      gap: 3px;
    }
    
    .pagination-button {
      padding: 8px 12px;
      font-size: 12px;
      min-width: 35px;
    }
    
    .pagination-ellipsis {
      padding: 8px 3px;
    }
  }

  @media (max-width: 400px) {
    .pagination {
      flex-direction: column;
      gap: 10px;
    }
    
    .pagination-numbers {
      order: -1;
    }
  }
</style>