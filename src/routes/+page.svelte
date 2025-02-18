<script>
    import { onMount } from "svelte";
    import Header from "../components/Header.svelte";
    import SearchBar from "../components/SearchBar.svelte";
    import TaskList from "../components/TaskList.svelte";
    import Pagination from "../components/Pagination.svelte";
  
    let tasks = [
      { 
        id: 1, 
        name: "Task 1: Register Patient", 
        description: "Register a new patient with personal details.", 
        url: "https://hrithik.webchartnow.com/webchart.cgi?f=chart&s=pat&t=Summary&v=dashboard&pat_id=18"
      },
      { 
        id: 2, 
        name: "Task 2 A1-CPOE/A4: Prescribe Rx and Dismiss DUR Warning (66 Seconds)", 
        description: "Locate Sergio Acardi's chart (MIE-10027). Click Allergies/Medications tab, and prescribe Amoxicillin Form: capsule 500mg. Dismiss the drug allergy warning, using the reason 'Allergy not correct' and click Dismiss.", 
        url: "https://hrithik.webchartnow.com/webchart.cgi?f=chart&s=pat&pat_id=46"
      }
    ];
  
    let searchQuery = "";
    let currentPage = 1;
    const itemsPerPage = 5;
    let paginatedTasks = [];
    let totalPages = Math.ceil(tasks.length / itemsPerPage);
  
    function paginateTasks() {
      let filtered = tasks.filter(task => task.name.toLowerCase().includes(searchQuery.toLowerCase()));
      totalPages = Math.ceil(filtered.length / itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage;
      paginatedTasks = filtered.slice(start, start + itemsPerPage);
    }
  
    function setPage(page) {
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        paginateTasks();
      }
    }
  
    function nextPage() {
      if (currentPage < totalPages) {
        currentPage++;
        paginateTasks();
      }
    }
  
    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        paginateTasks();
      }
    }
  
    function generatePagination() {
      let pages = [];
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
  
    onMount(() => {
      paginateTasks();
    });
  </script>
  
  <main class="container">
    <Header bind:searchQuery {paginateTasks}/>
    <TaskList tasks={paginatedTasks} />
    <Pagination {currentPage} {totalPages} {setPage} {prevPage} {nextPage} {generatePagination} />
  </main>
  
  <style>
    .container {
      max-width: 900px;
      margin: 20px auto;
      padding: 20px;
    }
  </style>
  