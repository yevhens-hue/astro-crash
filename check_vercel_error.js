const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Capture page errors (unhandled exceptions)
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  
  // Capture failed requests
  page.on('requestfailed', request => {
    console.error(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('Navigating to production URL...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded successfully or crashed.');
  } catch (err) {
    console.error('Error navigating:', err);
  } finally {
    await browser.close();
  }
})();
