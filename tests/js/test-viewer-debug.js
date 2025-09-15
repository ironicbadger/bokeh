const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Photo clicked') || text.includes('viewer') || text.includes('Viewer')) {
      console.log('Console:', text);
    }
  });
  
  console.log('Testing image viewer with debug output...');
  
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
    
    // Wait a moment for console logs
    await page.waitForTimeout(2000);
    
    // Check if viewer is visible
    const viewerVisible = await page.locator('.fixed.inset-0.z-50').isVisible().catch(() => false);
    
    if (viewerVisible) {
      console.log('✅ SUCCESS: Image viewer opened');
    } else {
      console.log('❌ FAILED: Image viewer did not open');
    }
    
    // Keep open for a moment to see result
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();