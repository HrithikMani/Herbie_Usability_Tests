<script>
    export let searchQuery;
    export let paginateTasks;
  </script>
  
  <input 
    type="text" 
    placeholder="Search tasks..." 
    bind:value={searchQuery} 
    on:input={paginateTasks}
    class="search-box"
  />
  
  <style>
    .search-box {
      padding: 8px;
      border: 1px solid #5c5757;
      border-radius: 5px;
      width: 250px;
      background: white;
      color: #363434;
    }
  </style>
  