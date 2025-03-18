let tasks = [];
let filteredTasks = [];
let currentPage = 1;
const itemsPerPage = 2;

// Fetch tasks from tasks.json
async function fetchTasks() {
    try {
        const response = await fetch("tasks.json");
        if (!response.ok) {
            throw new Error("Failed to load tasks.");
        }
        tasks = await response.json();
        filteredTasks = [...tasks];
        renderTasks();
        renderPagination();
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

// Filter Tasks Based on Search Query
function filterTasks() {
    const query = document.getElementById("searchQuery").value.toLowerCase();
    filteredTasks = tasks.filter(task => task.name.toLowerCase().includes(query));
    currentPage = 1;
    renderTasks();
    renderPagination();
}

// Render Tasks
function renderTasks() {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedTasks = filteredTasks.slice(start, start + itemsPerPage);

    paginatedTasks.forEach(task => {
        const taskCard = document.createElement("div");
        taskCard.classList.add("task-card");
        taskCard.dataset.taskId = task.id;

        taskCard.innerHTML = `
            <div class="task-header">
                <h3>${task.name}</h3>
                <span class="task-status">Not Started</span>
            </div>
            <p>${task.description}</p>
            <div class="test-results" id="test-results-${task.id}"></div>
            <button class="button" onclick="startTest(${task.id})">Start Test</button>
        `;

        taskList.appendChild(taskCard);
    });
}

// Render Pagination
function renderPagination() {
    const paginationNumbers = document.getElementById("paginationNumbers");
    paginationNumbers.innerHTML = "";
    let totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        let button = document.createElement("button");
        button.innerText = i;
        button.className = `pagination-button ${i === currentPage ? "active" : ""}`;
        button.onclick = () => setPage(i);
        paginationNumbers.appendChild(button);
    }

    document.getElementById("prevBtn").disabled = (currentPage === 1);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages);
}

// Pagination Controls
function setPage(page) {
    let totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTasks();
        renderPagination();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTasks();
        renderPagination();
    }
}

function nextPage() {
    let totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTasks();
        renderPagination();
    }
}

// Start Test and Update UI
function startTest(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskCard = document.querySelector(`[data-task-id='${task.id}']`);
    taskCard.querySelector(".task-status").textContent = "In Progress";
    taskCard.querySelector(".task-status").classList.add("in-progress");

    window.postMessage({ action: "startUsabilityTest", taskId: task.id, taskName: task.name, description: task.description }, "*");
    window.open(task.url, "_blank");
}

// Observe Attribute Changes for Test Results
function observeAttributeChanges() {
    let resultDiv = document.getElementById("usabilityTestResults");
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "data-test-results") {
                const newResults = JSON.parse(mutation.target.getAttribute("data-test-results"));
                const taskCard = document.querySelector(`[data-task-id='${newResults.taskId}']`);
                if (taskCard) {
                    taskCard.querySelector(".task-status").textContent = "Completed";
                    taskCard.querySelector(".task-status").classList.add("completed");
                    let resultsDiv = document.getElementById(`test-results-${newResults.taskId}`);
                    resultsDiv.innerHTML = `<h3>Test Results</h3>
                        <p><strong>Time:</strong> ${newResults.time} seconds</p>
                        <p><strong>Steps:</strong> ${newResults.steps}</p>
                        <p><strong>Errors:</strong> ${newResults.errors}</p>
                        <p><strong>Rating:</strong> ${newResults.rating}/5</p>`;
                }
            }
        }
    });
    observer.observe(resultDiv, { attributes: true });
}

// Initialize Page
fetchTasks();
observeAttributeChanges();
