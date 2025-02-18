<script>
    import TaskCard from "./TaskCard.svelte";
    export let tasks;
  </script>
  
  <div class="task-list">
    {#each tasks as task}
      <TaskCard {task} />
    {/each}
  </div>
  
  <style>
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  </style>
  