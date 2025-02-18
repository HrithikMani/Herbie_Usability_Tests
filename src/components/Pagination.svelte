<script>
    export let currentPage;
    export let totalPages;
    export let setPage;
    export let prevPage;
    export let nextPage;
    export let generatePagination;
  </script>
  
  <div class="pagination">
    <button on:click={prevPage} disabled={currentPage === 1} class="pagination-button">Previous</button>
  
    {#each generatePagination() as page}
      {#if page === "..."}
        <span class="pagination-number">{page}</span>
      {:else}
        <button on:click={() => setPage(page)} class="pagination-number {page === currentPage ? 'active' : ''}">
          {page}
        </button>
      {/if}
    {/each}
  
    <button on:click={nextPage} disabled={currentPage === totalPages} class="pagination-button">Next</button>
  </div>
  
  <style>
    .pagination {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      gap: 10px;
    }
  
    .pagination-button {
      background: #363434;
      color: white;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
    }
  
    .pagination-button:hover {
      background: #5c5757;
    }
  
    .pagination-number {
      padding: 8px 12px;
      border-radius: 5px;
      cursor: pointer;
      background: #f0f0f0;
    }
  
    .pagination-number.active {
      background: #62929a;
      color: white;
    }
  </style>
  