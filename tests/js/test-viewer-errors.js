const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture all console messages including errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    } else if (msg.text().includes('Error') || msg.text().includes('error')) {
      console.log('Console:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  console.log('Testing for errors when opening viewer...');
  
  try {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for photos to load...');
    await page.waitForSelector('.grid img', { timeout: 10000 });
    
    // Click on the first photo
    console.log('Clicking on first photo...');
    const firstPhoto = await page.locator('.grid img').first();
    await firstPhoto.click();
    
    // Wait for potential errors
    await page.waitForTimeout(2000);
    
    // Check DOM for viewer elements
    const hasViewer = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        if (el.className && el.className.toString().includes('fixed') && 
            el.className.toString().includes('inset-0')) {
          return true;
        }
      }
      return false;
    });
    
    console.log('Has viewer elements:', hasViewer);
    
    // Keep open for observation
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();