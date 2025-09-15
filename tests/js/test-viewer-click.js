const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing image viewer opening...');
  
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
    
    // Wait a moment for viewer to open
    await page.waitForTimeout(1000);
    
    // Check if viewer is visible
    const viewerVisible = await page.locator('.fixed.inset-0.z-50').isVisible().catch(() => false);
    
    if (viewerVisible) {
      console.log('✅ SUCCESS: Image viewer opened');
      
      // Try to close with Escape
      console.log('Testing Escape key to close...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      const viewerStillVisible = await page.locator('.fixed.inset-0.z-50').isVisible().catch(() => false);
      if (!viewerStillVisible) {
        console.log('✅ SUCCESS: Viewer closed with Escape key');
      } else {
        console.log('❌ FAILED: Viewer did not close with Escape');
      }
    } else {
      console.log('❌ FAILED: Image viewer did not open');
      
      // Check if there's any error in console
      const pageContent = await page.content();
      if (pageContent.includes('ImageViewer')) {
        console.log('ImageViewer component found in DOM');
      } else {
        console.log('ImageViewer component NOT found in DOM');
      }
    }
    
    // Keep open for a moment to see result
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();