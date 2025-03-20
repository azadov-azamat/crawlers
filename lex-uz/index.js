const puppeteer = require('puppeteer');
const fs = require('fs'); // Fayl tizimini import qilish
const path = require('path'); // Yo'lni boshqarish uchun

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
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
    const page = await browser.newPage();

    // Listen for console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.lex.uz/docs/-97664', { waitUntil: 'networkidle2' });

    // Extracting the sections, chapters, and articles
    const jsonData = await page.evaluate(async () => {
        const sections = [];
        let currentSection = null;

        const items = document.querySelectorAll('#dvToc .docNavbar__item');

        for (const item of items) {
            const titleElement = item.querySelector('.docNavbar__item-link-title a');
            const iconElement = item.querySelector('.docNavbar__item-link-icon'); // Get the icon element
            if (titleElement) {
                const titleText = titleElement.innerText;
                const hrefValue = titleElement.getAttribute('href'); // Extracting the href value
                // console.log("hrefValue", String(hrefValue));
                const id = String(hrefValue).replace(/\D+/g, '') || null; // Extracting the ID from href

                // Check if the title contains "BO‘LIM"
                if (titleText.includes("BO‘LIM")) {
                    // If a new section starts, push the current section to sections
                    if (currentSection) {
                        sections.push(currentSection);
                    }
                    // Start a new section
                    currentSection = { section: titleText, chapters: [], id: id };
                } else {
                    // If it's a chapter, add it to the current section
                    if (currentSection) {
                        const chapterTitle = titleText;
                        const articles = []; // To hold articles for this chapter

                        // Check if the iconElement exists before clicking
                        if (iconElement) {
                            iconElement.click(); // Click to expand the chapter
                            // Extract articles under the chapter
                            const articleElements = item.querySelectorAll(`#collapse-${id}`);
                            for (const article of articleElements) {
                                const aElements = article.querySelectorAll('a');
                                for (const aElement of aElements) {
                                    const articleTitle = aElement.innerText;
                                    const articleHref = aElement.getAttribute('href');
                                    const articleId = String(articleHref).replace(/\D+/g, '') || null; // Extracting the ID from href
                                    articles.push({
                                        title: articleTitle,
                                        id: articleId
                                    });
                                }
                            }

                            currentSection.chapters.push({
                                chapter: chapterTitle,
                                articles: articles,
                                id: id // Adding the ID to the chapter
                            });
                        } else {
                            console.warn(`No icon element found for chapter: ${chapterTitle}`);
                        }
                    }
                }
            } else {
                console.warn('No title element found for item:', item);
            }
        }

        // Push the last section if it exists
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    });


    fs.writeFileSync(path.join(__dirname, 'kodeks.json'), JSON.stringify(jsonData, null, 2));

    await browser.close();
})();
