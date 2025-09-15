const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing thumbnail rotation sync...');
  
  // Set up response listener for rotation endpoint
  let rotationResponse = null;
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/photos/') && response.url().includes('/rotation')) {
      console.log('Rotation API response:', response.status());
      if (response.ok()) {
        rotationResponse = await response.json();
        console.log('Rotation response data:', rotationResponse);
      }
    }
  });
  
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
    
    // Wait for the rotation API response
    console.log('Waiting for rotation API response...');
    let attempts = 0;
    while (!rotationResponse && attempts < 20) {
      await page.waitForTimeout(100);
      attempts++;
    }
    
    if (rotationResponse) {
      console.log('✅ Rotation saved successfully');
      console.log('   Thumbnail version:', rotationResponse.thumbnail_version);
    } else {
      console.log('❌ No rotation response received');
    }
    
    // Close the viewer
    console.log('Closing viewer...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Check if the thumbnail URL has changed
    const thumbnailAfter = await firstPhotoImg.getAttribute('src');
    console.log('Thumbnail URL after rotation:', thumbnailAfter);
    
    // Check the actual HTML to see if src was updated
    const imgElement = await page.evaluate(() => {
      const img = document.querySelector('.grid img');
      return {
        src: img.src,
        getAttribute: img.getAttribute('src'),
        outerHTML: img.outerHTML.substring(0, 200)
      };
    });
    console.log('Image element details:', imgElement);
    
    if (thumbnailAfter !== thumbnailBefore && thumbnailAfter.includes('?v=')) {
      console.log('✅ SUCCESS: Thumbnail URL updated with version parameter');
    } else {
      console.log('❌ FAILED: Thumbnail URL did not update');
      console.log('   Expected to see ?v= parameter added');
      if (rotationResponse && rotationResponse.thumbnail_version) {
        console.log('   Note: Backend returned version but frontend didn\'t update');
      }
    }
    
    // Wait a moment to see the final result
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('Test completed');
})();