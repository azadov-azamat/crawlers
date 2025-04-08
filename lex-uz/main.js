const puppeteer = require('puppeteer');
const { URL } = require('url');

async function crawlLexUz(startUrl) {
  const queue = [startUrl];
  const visited = new Set();
  const collectedDocs = new Set();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/local/bin/chromium', // Homebrew orqali o'rnatilgan Chromium manzili
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
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

    // Skip irrelevant paths such as /en, /search, etc.
    const irrelevantPaths = ['/en', '/uz/search', '/uz/', '/ru', '/agreement', '/search', '/lexuz', '/agreement',
      '/card', '/axborot', '/pulication', '/law_collection', '/pact_collection', '/library', '/catalog', 
      '/symbols', '/dictionary', '/klassifkator', '/login', '/qollanma', '/statistic', '/#'
    ];
    if (irrelevantPaths.some(path => urlObj.pathname.startsWith(path))) {
      continue;
    }

    try {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }); // Increased timeout
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
