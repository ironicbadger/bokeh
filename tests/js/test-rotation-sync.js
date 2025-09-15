const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing thumbnail rotation sync...');
  
  try {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for photos to load...');
    await page.waitForSelector('.grid img', { timeout: 10000 });
    
    // Get the first photo's thumbnail URL before rotation
    const firstPhotoImg = await page.locator('.grid img').first();
    const thumbnailBefore = await firstPhotoImg.getAttribute('src');
    console.log('Thumbnail URL before rotation:', thumbnailBefore);
    
    // Click on the first photo to open the viewer
    console.log('Opening image viewer...');
    await firstPhotoImg.click();
    await page.waitForTimeout(1000); // Wait for viewer to open
    
    // Rotate the image
    console.log('Rotating image...');
    await page.keyboard.press('r'); // Rotate right
    await page.waitForTimeout(1000); // Wait for rotation to save
    
    // Close the viewer
    console.log('Closing viewer...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Check if the thumbnail URL has changed (should have version parameter)
    const thumbnailAfter = await firstPhotoImg.getAttribute('src');
    console.log('Thumbnail URL after rotation:', thumbnailAfter);
    
    if (thumbnailAfter !== thumbnailBefore && thumbnailAfter.includes('?v=')) {
      console.log('✅ SUCCESS: Thumbnail URL updated with version parameter');
      console.log('   Before:', thumbnailBefore);
      console.log('   After:', thumbnailAfter);
    } else {
      console.log('❌ FAILED: Thumbnail URL did not update');
      console.log('   Before:', thumbnailBefore);
      console.log('   After:', thumbnailAfter);
    }
    
    // Wait a moment to see the final result
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();