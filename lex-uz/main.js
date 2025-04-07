// const puppeteer = require('puppeteer');
// const { URL } = require('url');

// async function crawlBFS(startUrl, maxPages = 100) {
//   const visited = new Set();
//   const queue = [startUrl];
//   const domain = new URL(startUrl).origin;
//   const allLinks = new Set();

//   const browser = await puppeteer.launch({
//     headless: false,
//     args: [
//         '--disable-setuid-sandbox',
//         '--no-sandbox',
//         '--disable-web-security',
//         '--disable-dev-shm-usage',
//         '--disable-gpu',
//         '--window-size=1920,1080',
//         '--no-zygote',
//         '--single-process',
//     ],
//     executablePath:
//         process.env.NODE_ENV === "production"
//             ? process.env.PUPPETEER_EXECUTABLE_PATH
//             : puppeteer.executablePath(),
// });
//   const page = await browser.newPage();

//   while (queue.length > 0 && visited.size < maxPages) {
//     const currentUrl = queue.shift();
//     if (visited.has(currentUrl)) continue;

//     try {
//       await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//       visited.add(currentUrl);

//       const links = await page.$$eval('a', as =>
//         as.map(a => a.href).filter(href => href && typeof href === 'string')
//       );

//       for (const link of links) {
//         try {
//           const urlObj = new URL(link, domain);

//           // Stay within the same domain
//           if (urlObj.origin === domain && !visited.has(urlObj.href) && !queue.includes(urlObj.href)) {
//             queue.push(urlObj.href);
//           }

//           allLinks.add(urlObj.href);
//         } catch (e) {
//           // Skip invalid URLs
//         }
//       }
//     } catch (err) {
//       console.warn(`Failed to load ${currentUrl}:`, err.message);
//     }
//   }

//   await browser.close();

//   return Array.from(allLinks);
// }

// // Example usage:
// (async () => {
//   const startUrl = 'https://www.lex.uz/docs/-97664';
//   const links = await crawlBFS(startUrl);
//   console.log('Discovered links:', links);
// })();

const puppeteer = require('puppeteer');
const { URL } = require('url');

async function crawlLexUz(startUrl) {
  const queue = [startUrl];
  const visited = new Set();
  const collectedDocs = new Set();

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  while (queue.length > 0) {
    const currentUrl = queue.shift();
    if (visited.has(currentUrl)) continue;

    const urlObj = new URL(currentUrl);
    const isDocsPage = urlObj.pathname.startsWith('/docs');

    // Agar bu sahifa o'zi /docs bo'lsa, uni SKIP qilamiz
    if (isDocsPage) {
      visited.add(currentUrl);
      continue;
    }

    try {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      visited.add(currentUrl);

      const links = await page.$$eval('a', as =>
        as.map(a => a.href).filter(href => href && typeof href === 'string')
      );

      for (const link of links) {
        try {
          const linkObj = new URL(link, currentUrl);
          const isSameDomain = linkObj.hostname === 'www.lex.uz';

          if (!isSameDomain) continue;

          const linkHref = linkObj.href;
          const isDocs = linkObj.pathname.startsWith('/docs');

          if (isDocs) {
            collectedDocs.add(linkHref);
          } else if (!visited.has(linkHref) && !queue.includes(linkHref)) {
            queue.push(linkHref);
          }

        } catch (e) {
          // invalid link
        }
      }
    } catch (err) {
      console.warn(`Failed to load ${currentUrl}:`, err.message);
    }
  }

  await browser.close();
  return Array.from(collectedDocs);
}

// Usage
(async () => {
  const docsLinks = await crawlLexUz('https://www.lex.uz');
  console.log('Found /docs links:', docsLinks);
})();
