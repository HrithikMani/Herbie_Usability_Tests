// src/lib/stores/tasks.js
import { writable, derived } from 'svelte/store';
import * as XLSX from 'xlsx';
import { herbieKeywords } from './websocket.js';

// Base stores
export const tasks = writable([]);
export const searchQuery = writable('');
export const currentPage = writable(1);
export const itemsPerPage = writable(2);

// Derived store for filtered tasks
export const filteredTasks = derived(
  [tasks, searchQuery],
  ([$tasks, $searchQuery]) => {
    if (!$searchQuery || $searchQuery.trim() === '') {
      return $tasks;
    }
    
    const query = $searchQuery.toLowerCase().trim();
    return $tasks.filter(task => 
      (task.name && task.name.toLowerCase().includes(query)) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  }
);

// Derived store for paginated tasks
export const paginatedTasks = derived(
  [filteredTasks, currentPage, itemsPerPage],
  ([$filteredTasks, $currentPage, $itemsPerPage]) => {
    const start = ($currentPage - 1) * $itemsPerPage;
    return $filteredTasks.slice(start, start + $itemsPerPage);
  }
);

// Derived store for total pages
export const totalPages = derived(
  [filteredTasks, itemsPerPage],
  ([$filteredTasks, $itemsPerPage]) => {
    return Math.ceil($filteredTasks.length / $itemsPerPage);
  }
);

// Load tasks from Excel file
export async function loadTasks() {
  try {
    console.log('Loading tasks from Excel file...');
    const response = await fetch('/tasks.xlsx');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const tasksData = XLSX.utils.sheet_to_json(worksheet) || [];
    
    console.log(`Loaded ${tasksData.length} tasks:`, tasksData);
    
    tasks.set(tasksData);
    currentPage.set(1); // Reset to first page when tasks change
    
    return tasksData;
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
}

// Load herbie keywords
export async function loadHerbieKeywords() {
  try {
    console.log('Loading herbie keywords...');
    const response = await fetch('/herbie-keywords.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const keywords = await response.json();
    console.log('Herbie keywords loaded successfully:', keywords);
    
    herbieKeywords.set(keywords);
    return keywords;
  } catch (error) {
    console.error('Error loading herbie keywords:', error);
    // Set empty keywords object as fallback
    const fallback = { globalKeywords: [], localKeywords: {} };
    herbieKeywords.set(fallback);
    throw error;
  }
}

// Reset pagination when search changes
searchQuery.subscribe(() => {
  currentPage.set(1);
});

// Utility functions for pagination
export function setPage(page) {
  currentPage.set(page);
}

export function nextPage() {
  currentPage.update(page => {
    const maxPages = derived([totalPages], ([$totalPages]) => $totalPages);
    let maxValue;
    maxPages.subscribe(value => maxValue = value)();
    return page < maxValue ? page + 1 : page;
  });
}

export function prevPage() {
  currentPage.update(page => page > 1 ? page - 1 : page);
}