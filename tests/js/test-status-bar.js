const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Look for the status bar
  console.log('\nLooking for status bar...');
  const statusBar = await page.locator('.fixed.bottom-0');
  
  if (await statusBar.count() > 0) {
    console.log('✓ Status bar found');
    const statusBarHTML = await statusBar.innerHTML();
    console.log('Status bar content:', statusBarHTML.substring(0, 500));
    
    // Check for any text containing "job"
    const jobText = await page.locator('*:has-text("job")').all();
    console.log(`\nFound ${jobText.length} elements with "job" text`);
    
    for (let el of jobText) {
      const text = await el.textContent();
      const tagName = await el.evaluate(e => e.tagName);
      console.log(`- ${tagName}: ${text}`);
    }
    
    // Look specifically in the status bar for clickable elements
    const statusBarButtons = await statusBar.locator('button').all();
    console.log(`\nFound ${statusBarButtons.length} buttons in status bar`);
    
    for (let btn of statusBarButtons) {
      const text = await btn.textContent();
      console.log(`- Button: ${text}`);
    }
    
    // Check for the active_jobs value from the API
    console.log('\nChecking API response...');
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/system/stats');
      return await response.json();
    });
    console.log('API stats:', apiResponse);
    
    // Check if React is rendering the component correctly
    console.log('\nChecking React DevTools...');
    const reactFiber = await page.evaluate(() => {
      const rootElement = document.querySelector('#__next');
      if (rootElement && rootElement._reactRootContainer) {
        return 'React root found';
      }
      return 'React root not found';
    });
    console.log(reactFiber);
    
  } else {
    console.log('✗ Status bar not found');
    
    // Log the entire page HTML to debug
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Page body (first 1000 chars):', bodyHTML.substring(0, 1000));
  }
  
  console.log('\nKeeping browser open for inspection. Press Ctrl+C to exit.');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();