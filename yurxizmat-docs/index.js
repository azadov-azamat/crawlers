const puppeteer = require('puppeteer');

// Asinxron funktsiya, Puppeteer brauzerini ishga tushirish va sahifalarni boshqarish uchun
(async () => {
    // Brauzerni ishga tushirish uchun kerakli sozlamalar
    const browser = await puppeteer.launch({
        headless: 'new', // Yangi headless rejimini yoqish
        args: [
          "--disable-setuid-sandbox", // Xavfsizlik sozlamalarini o'chirish
          "--no-sandbox", // Sandbox rejimini o'chirish
          "--single-process", // Yagona jarayon rejimi
          "--no-zygote", // Zygote jarayonini o'chirish
        ],
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH // Production muhitida maxsus yo'l
            : puppeteer.executablePath(), // Aks holda puppeteer standart yo'lidan foydalanish
    });
    
    // Yangi sahifa ochish
    const page = await browser.newPage();

    // Sahifaning o'lchamini belgilash
    await page.setViewport({ width: 1280, height: 800 });

    // Navigatsiya uchun yuqori vaqtni belgilash
    page.setDefaultNavigationTimeout(60000); // 60 soniya

    // Asosiy sahifaga o'tish
    console.log('Asosiy sahifaga o\'tish...');
    await page.goto('https://yurxizmat.uz/oz/categories', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.documents-list'); // Hujjatlar ro'yxati paydo bo'lishini kutish

    // Ma'lum bir sahifadan hujjatlarni yuklab olish funktsiyasi
    const downloadDocumentsFromPage = async (pageNumber) => {
        try {
            // Berilgan sahifaga o'tish
            await page.goto(`https://yurxizmat.uz/oz/categories?page=${pageNumber}`, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.documents-list'); // Hujjatlar ro'yxati paydo bo'lishini kutish

            // Hujjatlar ro'yxatidan barcha hujjat havolalarini olish
            const docLinks = await page.$$eval('.documents-list .document-item', items => items.map(item => item.getAttribute('data-key')));

            // Har bir hujjat uchun yuklab olish jarayonini bajarish
            for (const [docIndex, docKey] of docLinks.entries()) {
                const docLink = `https://yurxizmat.uz/oz/document/${docKey}`;
                console.log(`Hujjatga o'tish ${docIndex + 1}/${docLinks.length} sahifada ${pageNumber}: ${docLink}`);
                await page.goto(docLink, { waitUntil: 'networkidle2', timeout: 60000 }); // 120 soniya vaqt

                // Sahifa to'liq yuklanguncha kutish
                await page.waitForFunction(() => {
                    return document.readyState === 'complete' && 
                           document.querySelectorAll('.document-view-wrapper').length > 0;
                }, { timeout: 30000 }); // Vaqtni oshirish

                // Sahifa yuklangandan keyin 3 soniya kutish
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 soniya kutish

                // Kirish maydonlari va tanlovlar bilan ishlash
                const inputs = await page.$$('input, select'); // Kirish va tanlov elementlarini tanlash

                for (const input of inputs) {
                    const tagName = await input.evaluate(el => el.tagName.toLowerCase());
                    const inputId = await input.evaluate(el => el.id);
                    const label = await page.$(`label[for="${inputId}"]`);
                    
                    if (label) {
                        const labelText = await label.evaluate(el => el.innerText);
                        if (tagName === 'input') {
                            await input.type(labelText); // Kirish maydoniga label matnini yozish
                        } else if (tagName === 'select') {
                            const options = await input.evaluate(el => Array.from(el.options).map(option => option.value));
                            if (options.length > 0) {
                                await input.select(options[0]); // Agar mavjud bo'lsa, birinchi variantni tanlash
                                console.log(`Tanlangan variant: ${labelText}`);
                            } else {
                                console.log(`Tanlov uchun variantlar mavjud emas: ${labelText}`);
                            }
                        }
                    }

                    // Yozish yoki tanlashdan keyin qisqa vaqt kutish
                    await new Promise(resolve => setTimeout(resolve, 500)); // 1 soniya kutish
                }

                // Yuklab olish havolasining paydo bo'lishini kutish
                await page.waitForSelector('a.document-download', { timeout: 20000 }); // Yuklab olish havolasini kutish

                // Faqat hujjat fayli bo'lsa, yuklab olish havolasini bosish
                const downloadLink = await page.$('a.document-download');
                if (downloadLink) {
                    const fileFormat = await downloadLink.evaluate(el => el.getAttribute('data-format'));
                    if (fileFormat === 'docx') { // Fayl formatini tekshirish
                        const dataId = await downloadLink.evaluate(el => el.getAttribute('data-id'));
                        console.log(`ID bilan faylni yuklab olish: ${dataId}`);
                        await downloadLink.click();

                        // Yuklash boshlanishini ta'minlash uchun qisqa vaqt kutish
                        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 soniya kutish
                    } else {
                        console.log('Hujjat fayli emas, yuklab olishni o\'tkazib yuborish.');
                    }
                } else {
                    console.log('Yuklab olish havolasi topilmadi.');
                }

                // Hujjatlar ro'yxati sahifasiga qaytish
                await page.goBack();
            }

            // Keyingi sahifa mavjudligini tekshirish va unga o'tish
            const nextPageButton = await page.$('nav.custom-pagination .pagination .next'); // Tanlovni moslashtirish
            if (nextPageButton) {
                console.log('Keyingi sahifaga o\'tish...');
                await page.goto(`https://yurxizmat.uz/oz/categories?page=${pageNumber}`, { waitUntil: 'networkidle2' });
                await page.waitForSelector('.documents-list'); // Hujjatlar ro'yxati paydo bo'lishini kutish
                return true; // Keyingi sahifa mavjudligini ko'rsatish
            }
            return false; // Sahifalar tugadi
        } catch (error) {
            console.error(`Sahifada xato ${pageNumber}:`, error);
            return false; // Xato yuz berganda jarayonni to'xtatish
        }
    };

    // Berilgan sahifadan yuklab olishni boshlash
    const startPage = 10; // Boshlanish sahifasini o'zgartiring
    let hasNextPage = true;
    let currentPage = startPage;

    // Keyingi sahifalar mavjud bo'lsa, yuklab olishni davom ettirish
    while (hasNextPage) {
        hasNextPage = await downloadDocumentsFromPage(currentPage);
        currentPage++;
    }

    console.log('Barcha yuklashlar tugadi. sahifa=', currentPage);
    await browser.close(); // Brauzerni yopish
})();
