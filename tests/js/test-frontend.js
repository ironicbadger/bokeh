const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('Page Error:', error.message);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    console.log('Request Failed:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('Navigating to http://localhost:3000...');
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('Response status:', response.status());
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for any error messages on the page
    const errorText = await page.textContent('body');
    if (errorText.includes('Error') || errorText.includes('error')) {
      console.log('Error text found on page:', errorText.substring(0, 500));
    }
    
    // Try to get the main content
    const mainContent = await page.textContent('main').catch(() => 'No main element');
    console.log('Main content:', mainContent.substring(0, 200));
    
  } catch (error) {
    console.log('Navigation error:', error.message);
  }
  
  await browser.close();
})();