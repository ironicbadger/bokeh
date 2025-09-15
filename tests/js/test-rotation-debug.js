const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true  // Open DevTools to see console logs
  });
  const page = await browser.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  console.log('Testing rotation with debug output...');
  
  try {
    // Go to the main page
    console.log('1. Navigating to homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Click first photo
    console.log('2. Opening first image...');
    const firstPhoto = await page.locator('img[alt]').first();
    await firstPhoto.click();
    await page.waitForTimeout(2000);
    
    // Press 'r' to rotate
    console.log('3. Pressing "r" to rotate...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    
    // Check transform style
    const imageContainer = await page.locator('div[style*="transform"][style*="scale"]').first();
    const style = await imageContainer.getAttribute('style');
    console.log('4. Current style:', style);
    
    console.log('\nKeeping browser open for manual testing...');
    console.log('Try pressing "r" or "l" keys and watch the console output');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();