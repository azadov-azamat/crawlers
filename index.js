const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const inputPDF = "/Volumes/machintosh%20Hdd/repos/convertor/arizalar/img20250116_15325613.pdf";
const outputDir = path.join(__dirname, "converted");
const outputPath = path.join(__dirname, "output.png");

async function convertPDFToImage() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-setuid-sandbox',
           '--no-sandbox',
           '--disable-web-security',
           '--disable-dev-shm-usage',
           '--disable-gpu',
           '--window-size=1920,1080',
           '--no-zygote',
           '--single-process',
        ],
        executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
    });
    console.log("a;sd");
    
    const page = await browser.newPage();
    const pdfUrl = `file://${inputPDF}`;
    await page.goto(pdfUrl, { waitUntil: 'networkidle0' });

    // const fileName = path.basename(inputPDF, ".pdf");
    // const outPath = path.join(outputDir, `${fileName}-page1.png`);
    // await fs.ensureDir(outputDir);
    const frame = await page.waitForFrame(async frame => {
        return frame.name() === 'Test';
    });

    console.log(frame);
    
    // Screenshot visible part of page (which is usually page 1)
    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();
    console.log("✅ Screenshot saved:", outPath);
}

convertPDFToImage().catch(console.error);