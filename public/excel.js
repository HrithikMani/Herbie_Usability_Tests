// Node.js script to read tasks.xlsx file
// First, install the package with: npm install xlsx

// Import the xlsx library
const XLSX = require('xlsx');

// Read the Excel file
function readTasksExcel() {
  try {
    // Load the workbook
    const workbook = XLSX.readFile('tasks.xlsx');
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to JSON
    const tasks = XLSX.utils.sheet_to_json(worksheet);
    
    // Display the tasks
    console.log('Tasks loaded successfully:');
    console.log(JSON.stringify(tasks, null, 2));
    
    // Return the tasks for further processing if needed
    return tasks;
  } catch (error) {
    console.error('Error reading tasks.xlsx:', error.message);
    return [];
  }
}

// Execute the function
const tasks = readTasksExcel();

// You can now use the tasks array for your application
// For example, you might want to save it to a JSON file:
const fs = require('fs');
fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
console.log('Tasks have been saved to tasks.json');