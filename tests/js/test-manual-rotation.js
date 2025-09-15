const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Page console:', msg.text());
  });
  
  console.log('Manual rotation test - keep browser open for inspection');
  
  try {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for photos to load...');
    await page.waitForSelector('.grid img', { timeout: 10000 });
    
    console.log('Click on a photo to open the viewer');
    console.log('Then press "r" to rotate right');
    console.log('Watch the console for any messages');
    console.log('The browser will stay open for 60 seconds...');
    
    // Keep browser open for manual testing
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();