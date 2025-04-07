const fs = require('fs');
const path = require('path');
const { Ai } = require('../general');

const directoryPath = path.join('yurxizmat-docs');

// Array to store summaries, tags, and file URLs
const summariesData = [];

// Function to find and process the first PDF file
function findAndProcessFirstPDF(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                // If it's a directory, recurse into it
                findAndProcessFirstPDF(filePath);
            } else if (path.extname(file) === '.pdf') {
                // If it's a PDF file, process it and stop
                processPDF(filePath);
                break;
            }
        }
    });
}

// Function to process each PDF file
async function processPDF(filePath) {
    const fileData = fs.readFileSync(filePath, { encoding: 'base64' });
    const filename = path.basename(filePath);

    try {
        const response = await Ai(filename, fileData);

        const jsonString = response.output_text.match(/```json\n([\s\S]*?)\n```/)[1];
        const jsonResponse = JSON.parse(jsonString);

        const summary = jsonResponse.summary;
        const tags = jsonResponse.tags;
        
        // Add the summary, tags, and file URL to the array
        summariesData.push({
            filename: filename,
            summary: summary,
            tags: tags,
            url: filePath
        });

    } catch (error) {
        console.error(`Error for ${filename}:`, error);
    }
}

// Function to write summaries data to a JSON file
function writeSummariesToJson() {
    const outputFilePath = path.join(directoryPath, 'summaries.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(summariesData, null, 2));
    console.log(`Summaries written to ${outputFilePath}`);
}

// Start reading files
findAndProcessFirstPDF(directoryPath);

// Write summaries to JSON after processing
process.on('exit', writeSummariesToJson);
