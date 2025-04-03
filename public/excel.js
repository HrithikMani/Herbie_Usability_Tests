// Node.js script to generate tasks.xlsx file with Herbie scripts
// First, install the package with: npm install xlsx

// Import the xlsx library properly for Node.js
const XLSX = require('xlsx');

// Your tasks data with Herbie script
const tasks = [
    { 
        "id": 1, 
        "name": "Register Patient", 
        "description": "Register a new patient with personal details.", 
        "url": "https://hrithik.webchartnow.com/webchart.cgi?f=chart",
        "herbie_script": "" // No Herbie script for this task
    },
    { 
        "id": 2, 
        "name": "Prescribe Medication", 
        "description": "Write Amoxicillin 500mg capsule 2 caps daily for 7 days. For Prescriber: Anna Bates. Total quantity: 14 and no refills. Allow substitutions Send the script to \"MIE Test Pharmacy\"", 
        "url": "https://hrithik.webchartnow.com/webchart.cgi?f=chart&s=pat&pat_id=18",
        "herbie_script": `click on 'sidemenu'
click on 'E-Chart' 'sidemenu tab'
type "Hart" into 'Search textbox'
click on "Search"
click on "HOSPITAL-495653" 'link'
click on "Allergies" 'Manage Information'
click on "Prescribe" 'link'
type "amoxicillin" into 'Medication' 'Prescription Details'
type "capsule 500mg - Tier 1" into 'Form' 'Prescription Details'
type "7d" into 'Duration' 'Prescription Details'
type "0" into 'Refills' 'Prescription Details'
type "14" into 'Total Quantity' 'Prescription Details'
select 'C48480' into 'Quantity Type'
type "Allergy not correct" into 'Reason' 'Prescription Details'
type "2 caps daily" into 'Practitioner Sign'
type "2 caps daily" into 'Patient Signature'
click on "Prescribe"`
    }
];

// Create a worksheet from the JSON data
const worksheet = XLSX.utils.json_to_sheet(tasks);

// Create a workbook and add the worksheet
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

// Generate the Excel file
XLSX.writeFile(workbook, "tasks.xlsx");

// Output success message
console.log("tasks.xlsx has been created successfully with Herbie script data!");