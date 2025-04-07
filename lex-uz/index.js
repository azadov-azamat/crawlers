const puppeteer = require('puppeteer');
const fs = require('fs'); // Fayl tizimini import qilish
const path = require('path'); // Yo'lni boshqarish uchun
const { URL } = require('url');

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
    await page.goto('https://www.lex.uz/docs/-6445145', { waitUntil: 'networkidle2' }); // konstitutsiya
    // await page.goto('https://www.lex.uz/docs/-6600413', { waitUntil: 'networkidle2' }); // 30 yillik strategiya
    // await page.goto('https://www.lex.uz/docs/-97664', { waitUntil: 'networkidle2' }); // kodeks

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

        // Function to set descriptions
    const setDescriptions = async () => {
        const descriptions = await page.evaluate(() => {
            const elements = document.querySelectorAll('.CLAUSE_DEFAULT.lx_elem, .ACT_TEXT.lx_elem, .COMMENT, .CHANGES_ORIGINS');
            const result = {};
          
            let currentModdaId = null;
            let currentModdaTitle = null;
            
            elements.forEach(el => {
                if (el.classList.contains('CLAUSE_DEFAULT')) {
                    // Modda ID'sini olish
                    const idElement = el.querySelector('a[id]');
                    if (idElement) {
                        currentModdaId = idElement.getAttribute('id').replace('-', '').trim();
                        
                        // Modda sarlavhasini olish
                        currentModdaTitle = el.innerText.trim();

                        // Modda uchun bo'sh obyekt yaratish
                        result[currentModdaId] = {
                            title: currentModdaTitle,
                            description: [],
                            change_origins: [],
                            previous_links: []
                        };
                    }
                } else if (el.classList.contains('ACT_TEXT') && currentModdaId) {
                    // ACT_TEXT ichidagi ID'ni olish
                    const mousemoveAttr = el.getAttribute('onmousemove');
                    const idMatch = mousemoveAttr.match(/,\s*-?(\d+)\)/);
                    const textId = idMatch ? idMatch[1] : null;

                    if (textId) {
                        // Matnni olish
                        const text = el.innerText.trim();

                        // Har bir ACT_TEXT matnini moddaning "description" massiviga qo'shish
                        result[currentModdaId].description.push({
                            id: textId,
                            text: text
                        });
                    }
                } else if (el.classList.contains('COMMENT') && currentModdaId) {
                    const text = el?.innerText?.trim();
                    const isText = text?.includes('Oldingi');
                    
                    if (isText) {
                        const anchors = el.querySelectorAll('a');
  
                        const id = anchors[0]?.getAttribute('id') || null;
                        const link = anchors[1]?.getAttribute('href') || null;
    
                        result[currentModdaId].previous_links.push({
                            id, link: "www.lex.uz" + link
                        })
                    } else {

                    }

                } else if (el.classList.contains('CHANGES_ORIGINS') && currentModdaId) {
                    const text = el.innerText.trim();
                    const anchors = el.querySelectorAll('a');
  
                    const id = anchors[0]?.getAttribute('id') || null;
                    const link = anchors[1]?.getAttribute('href') || null;

                    result[currentModdaId].change_origins.push({
                        id,
                        text,
                        link: "www.lex.uz" + link,
                    });
                }
            });

            console.log(result);
         return result;
        });
        // console.log("descriptions", descriptions);
        return descriptions;
    };

    // console.log("jsonData", jsonData);
    const data = await setDescriptions();
    jsonData.map(item => {
        item.chapters.forEach(chapter => {
            chapter.articles.forEach(article => {
                if (data[article.id]) {
                    article.description = data[article.id].description;
                    
                    if (data[article.id].change_origins.length) {
                        article.change_origins = data[article.id].change_origins
                    }
                    
                    if (data[article.id].previous_links.length) {
                        article.previous_links = data[article.id].previous_links
                    }
                }
            });
        });
    });
    // Save the JSON data to a file
    fs.writeFileSync(path.join(__dirname, 'strategiya.json'), JSON.stringify(jsonData, null, 2));
    fs.writeFileSync(path.join(__dirname, 's-result.json'), JSON.stringify(data, null, 2));

    await browser.close();
})();
