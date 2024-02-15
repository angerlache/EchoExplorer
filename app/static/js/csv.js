import csv from 'csv-parser';

// Assuming you have an input element with type="file" and id="fileInput" in your HTML
const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = () => {
            const csvContent = reader.result;

            // Parse the CSV content
            parseCSV(csvContent);
        };

        reader.readAsText(file);
    }
});

function parseCSV(csvContent) {
    const results = [];

    // Use csv-parser to parse the CSV content
    csv({ headers: true })
        .fromString(csvContent)
        .on('data', (data) => {
            results.push(data);
        })
        .on('end', () => {
            // Process the parsed data
            console.log(results);
        })
        .on('error', (error) => {
            console.error('Error parsing CSV:', error);
        });
}
