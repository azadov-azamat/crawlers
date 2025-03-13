const puppeteer = require('puppeteer');
const fs = require('fs'); // Fayl tizimini import qilish
const path = require('path'); // Yo'lni boshqarish uchun

(async () => {
    const startIndex = 5; // Bu yerda boshlash indeksini o'zgartiring
    const browser = await puppeteer.launch({
        headless: 'new',
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
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://yurxizmat.uz/oz/categories', { waitUntil: 'networkidle2' });

    // Kategoriyalarni olish
    await page.waitForSelector('.metismenu'); // Kategoriyalar ro'yxati yuklanguncha kuting
    const categories = await page.$$eval('.metismenu > li > a', links => {
        return links.map(link => ({
            name: link.innerText.trim(), // Kategoriya nomini olish
            url: link.href,
            hasArrow: link.classList.contains('has-arrow') // has-arrow klassini tekshirish
        }));
    });

    // console.log('categories', categories);

    const processSubCategories = async (page, subCategories, categoryFolder) => {
        console.log('subCategories', subCategories);
        for (const subCategory of subCategories) {
            console.log(`O'tish: Sub-kategoriya - ${subCategory.name}`); // Sub-kategoriya haqida log
            await page.goto(subCategory.url, { waitUntil: 'networkidle2' }); // Sub-kategoriya sahifasiga o'tish
            await page.waitForSelector('.documents-list'); // Fayllar ro'yxati yuklanguncha kuting

            // Sub-kategoriya uchun papka yaratish
            const subCategoryFolder = path.join(categoryFolder, subCategory.name);
            if (!fs.existsSync(subCategoryFolder)) {
                fs.mkdirSync(subCategoryFolder, { recursive: true });
            }

            // Har bir sub-kategoriyaning fayllarini yuklab olish
            let hasNextPage = true;
            let currentPage = 1;

            while (hasNextPage) {
                console.log(`Yuklab olish: Sahifa - ${currentPage}, Sub-kategoriya - ${subCategory.name}`); // Yuklab olish jarayoni haqida log
                hasNextPage = await downloadDocumentsFromPage(browser, page, currentPage, subCategory.url, subCategoryFolder); // subCategoryFolder ni uzatish
                currentPage++;
            }

            // Sub-sub-kategoriyalarni olish faqat hasArrow bo'lganlar uchun
            if (subCategory.hasArrow) {
                console.log('subCategory', subCategory);
                // const subSubCategories = await page.$$eval('.collapse.in li a.has-arrow', links => {
                //     return links.map(link => ({
                //         name: link.innerText.trim(), // Sub-sub-kategoriya nomini olish
                //         url: link.href
                //     }));
                // });

                // // Agar sub-sub-kategoriyalar mavjud bo'lsa, ularni qayta ishlang
                // if (subSubCategories.length > 0) {
                //     console.log(`Sub-kategoriya - ${subCategory.name} ichida sub-sub-kategoriyalar mavjud:`, subSubCategories.map(sc => sc.name).join(', '));
                //     await processSubCategories(page, subSubCategories, subCategoryFolder);
                // }
            } else {
                // Agar hasArrow false bo'lsa, fayllarni yuklab olish
                console.log(`Fayllarni yuklab olish: Sub-kategoriya - ${subCategory.name}`); // Yuklab olish jarayoni haqida log
                let hasNextPage = true;
                let currentPage = 1;

                while (hasNextPage) {
                    hasNextPage = await downloadDocumentsFromPage(browser, page, currentPage, subCategory.url, subCategoryFolder); // noArrowSubCategoryFolder ni uzatish
                    currentPage++;
                }
            }
        }
    };

    // Kategoriyalardan boshlash
    for (let i = startIndex; i < categories.length; i++) {
        const category = categories[i];
        console.log(`O'tish: Kategoriya - ${category.name}`); // Kategoriya haqida log
        await page.goto(category.url, { waitUntil: 'networkidle2' }); // Kategoriya sahifasiga o'tish
        await page.waitForSelector('.collapse.in'); // Sub-kategoriyalar yuklanguncha kuting

        // Kategoriyalarni olish
        const subCategories = await page.$$eval('.collapse.in > li > a', links => {
            return links.map(link => ({
                name: link.innerText.trim(), // Kategoriya nomini olish
                url: link.href,
                hasArrow: link.classList.contains('has-arrow') // has-arrow klassini tekshirish
            }));
        });

        // Kategoriya uchun papka yaratish
        const categoryFolder = path.join(__dirname, category.name);
        if (!fs.existsSync(categoryFolder)) {
            fs.mkdirSync(categoryFolder, { recursive: true });
        }

        // Faqat has-arrow bo'lgan sub-kategoriyalarni qayta ishlash
        // await processSubCategories(page, subCategories.filter(sc => sc.hasArrow), categoryFolder);

        // Has-arrow bo'lmagan sub-kategoriyalarni yuklab olish
        const noArrowSubCategories = subCategories.filter(sc => !sc.hasArrow);
        for (const noArrowSubCategory of noArrowSubCategories) {
            const noArrowSubCategoryFolder = path.join(categoryFolder, noArrowSubCategory.name);
            if (!fs.existsSync(noArrowSubCategoryFolder)) {
                fs.mkdirSync(noArrowSubCategoryFolder, { recursive: true });
            }

            // O'ziga fayllarni yuklab olish
            console.log(`Yuklab olish: Sub-kategoriya - ${noArrowSubCategory.name}`); // Yuklab olish jarayoni haqida log
            let hasNextPage = true;
            let currentPage = 1;

            while (hasNextPage) {
                hasNextPage = await downloadDocumentsFromPage(browser, page, currentPage, noArrowSubCategory.url, noArrowSubCategoryFolder); // noArrowSubCategoryFolder ni uzatish
                if (hasNextPage) {
                    currentPage++;
                }
            }
        }
    }

    await browser.close();
})();

const downloadDocumentsFromPage = async (browser, page, pageNumber, subCategoryUrl, subCategoryFolder) => {
    try {
        console.log(`O'tish: Sahifa - ${pageNumber}, URL - ${subCategoryUrl}`); // Sahifa haqida log
        await page.goto(`${subCategoryUrl}?page=${pageNumber}`, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('.documents-list');

        const docLinks = await page.$$eval('.documents-list .document-item', items => items.map(item => item.getAttribute('data-key')));

        // Agar documents-list ichida 1 ta yoki undan ko'p element bo'lsa
        if (docLinks.length < 1) {
            console.log('Documents-list ichida fayl mavjud emas, fayllarni yuklab olish to\'xtatilmoqda.');
            return false; // Fayllar mavjud emas
        }

        for (const docKey of docLinks) {
            const docLink = `https://yurxizmat.uz/oz/document/${docKey}`;
            console.log(`Hujjatga o'tish: ${docLink}`); // Hujjat haqida log
            
            // URL'ni tekshirish
            try {
                const response = await page.goto(docLink, { waitUntil: 'networkidle2' });
                if (response.status() !== 200) {
                    console.log(`Fayl mavjud emas: ${docLink}`); // Fayl mavjud emasligi haqida log
                    await page.goBack(); // Orqaga qaytish
                    continue; // Keyingi faylga o'tish
                }
            } catch (error) {
                console.error(`Hujjatga o'tishda xato: ${error.message}`);
                await page.goBack(); // Orqaga qaytish
                continue; // Keyingi faylga o'tish
            }

            const documentViewWrapper = await page.$('.document-view-wrapper');
            if (documentViewWrapper) {
                const htmlContent = await documentViewWrapper.evaluate(el => el.innerHTML);
                const titleElement = await page.$('.document-title h3');
                const documentTitle = await titleElement.evaluate(el => el.innerText.trim().replace(/[^a-zA-Z0-9]/g, '_'));

                const newPage = await browser.newPage();
                await newPage.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

                const pdfPath = path.join(subCategoryFolder, `${documentTitle}.pdf`);
                await newPage.pdf({
                    path: pdfPath,
                    format: 'A4',
                    printBackground: true,
                });

                await newPage.close();
            } else {
                console.log('document-view-wrapper topilmadi.');
            }

            await page.goBack();
        }

        // Paginationni tekshirish
        const nextPageDisabled = await page.$eval('.pagination .next', el => el.classList.contains('disabled'));
        return !nextPageDisabled; // Keyingi sahifa mavjudligini qaytarish
    } catch (error) {
        console.error(`Sahifada xato ${pageNumber}:`, error);
        return false; // Xato yuz berganda jarayonni to'xtatish
    }
};