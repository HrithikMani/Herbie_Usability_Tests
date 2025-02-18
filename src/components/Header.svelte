<script>
    export let title = "Usability Testing";
    export let searchQuery;
    export let paginateTasks;
  </script>
  
  <header class="header">
    <h1 class="title">{title}</h1>
    <input 
      type="text" 
      placeholder="Search tasks..." 
      bind:value={searchQuery} 
      on:input={paginateTasks}
      class="search-box"
    />
  </header>
  
  <style>
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      width: 100%;
    }
  
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #363434;
    }
  
    .search-box {
      padding: 8px;
      border: 1px solid #5c5757;
      border-radius: 5px;
      width: 250px;
      background: white;
      color: #363434;
    }
  </style>
  