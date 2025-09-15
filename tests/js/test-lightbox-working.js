const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing lightbox functionality...');
  
  try {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for photos to load...');
    await page.waitForSelector('.grid img', { timeout: 10000 });
    
    // Click on the first photo
    console.log('Clicking on first photo to open lightbox...');
    const firstPhoto = await page.locator('.grid img').first();
    await firstPhoto.click();
    
    // Wait for viewer to open
    await page.waitForTimeout(1000);
    
    // Check for viewer by looking for the full-size image
    const fullImageVisible = await page.locator('img[src*="/thumbnails/"][src*="/full"]').isVisible().catch(() => false);
    const hasFixedOverlay = await page.locator('.fixed.inset-0').count().catch(() => 0);
    
    console.log('Full image visible:', fullImageVisible);
    console.log('Fixed overlay elements:', hasFixedOverlay);
    
    if (hasFixedOverlay > 0) {
      console.log('✅ SUCCESS: Lightbox is open');
      
      // Now test rotation
      console.log('\nTesting rotation in lightbox...');
      await page.keyboard.press('r'); // Rotate right
      console.log('Pressed "r" to rotate right');
      
      await page.waitForTimeout(2000); // Wait for rotation to save
      
      // Close lightbox
      console.log('Closing lightbox with Escape...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
      const stillOpen = await page.locator('.fixed.inset-0').count().catch(() => 0);
      if (stillOpen === 0) {
        console.log('✅ SUCCESS: Lightbox closed');
      } else {
        console.log('❌ FAILED: Lightbox did not close');
      }
      
    } else {
      console.log('❌ FAILED: Lightbox did not open');
    }
    
    // Keep open to observe
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest completed');
})();