const { chromium } = require('playwright');

async function wait(ms, message) {
  if (message) console.log(message);
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎯 Visual Rotation Test - Checking Actual Image Changes\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Load grid and find IMG_7667.jpg
    await wait(0, '\n1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await wait(2000);
    
    // Look for IMG_7667.jpg
    console.log('2. Finding IMG_7667.jpg in grid...');
    let targetImage = null;
    let targetIndex = -1;
    
    // Scroll to find the image
    for (let scrollAttempts = 0; scrollAttempts < 10; scrollAttempts++) {
      const images = await page.locator('img[alt*="IMG_7667"]').all();
      if (images.length > 0) {
        targetImage = images[0];
        // Find the index
        const allImages = await page.locator('img[alt]').all();
        for (let i = 0; i < allImages.length; i++) {
          const alt = await allImages[i].getAttribute('alt');
          if (alt && alt.includes('IMG_7667')) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      
      // Scroll down to load more
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await wait(1000);
    }
    
    if (!targetImage) {
      console.log('   ❌ IMG_7667.jpg not found, using first image');
      targetImage = await page.locator('img[alt]').first();
      targetIndex = 0;
    } else {
      console.log('   ✅ Found IMG_7667.jpg at index', targetIndex);
    }
    
    // Scroll to make sure image is visible
    await targetImage.scrollIntoViewIfNeeded();
    await wait(500);
    
    // Get initial state
    const thumbBefore = await targetImage.getAttribute('src');
    const boundingBoxBefore = await targetImage.boundingBox();
    console.log('3. Initial state:');
    console.log('   URL:', thumbBefore);
    console.log('   Dimensions:', boundingBoxBefore ? `${boundingBoxBefore.width}x${boundingBoxBefore.height}` : 'N/A');
    
    // Take screenshot of thumbnail before
    await targetImage.screenshot({ path: 'thumb-visual-before.png' });
    console.log('   Screenshot: thumb-visual-before.png');
    
    // 4. Rotate multiple times to ensure visible change
    await wait(0, '\n4. Opening image in lightbox...');
    await targetImage.click();
    await wait(2000);
    
    console.log('5. Rotating image multiple times for visible change...');
    
    // Rotate 90 degrees
    console.log('   Rotation 1: 90° clockwise (press "r")');
    await page.keyboard.press('r');
    await wait(1500);
    
    // Rotate another 90 degrees (total 180)
    console.log('   Rotation 2: 90° clockwise (press "r")');
    await page.keyboard.press('r');
    await wait(1500);
    
    // Check rotation in viewer
    const viewerImage = await page.locator('img[alt*="IMG_7667"], img[alt]:first').first();
    const viewerContainer = await page.locator('div[style*="transform"][style*="scale"]').first();
    const style = await viewerContainer.getAttribute('style');
    console.log('   Viewer rotation style:', style || 'No rotation style found');
    
    // 6. Close lightbox and wait for thumbnail update
    await wait(0, '\n6. Closing lightbox to trigger thumbnail update...');
    await page.keyboard.press('Escape');
    await wait(3000, '   Waiting for grid to update...');
    
    // 7. Find the image again and check if it updated
    console.log('\n7. Checking thumbnail after rotation...');
    
    // Find the image again
    let updatedImage = null;
    const allImages = await page.locator('img[alt]').all();
    for (let i = 0; i < allImages.length; i++) {
      const alt = await allImages[i].getAttribute('alt');
      if (alt && alt.includes('IMG_7667')) {
        updatedImage = allImages[i];
        break;
      }
    }
    
    if (!updatedImage && targetIndex >= 0) {
      updatedImage = await page.locator('img[alt]').nth(targetIndex);
    }
    
    if (updatedImage) {
      await updatedImage.scrollIntoViewIfNeeded();
      await wait(500);
      
      const thumbAfter = await updatedImage.getAttribute('src');
      const boundingBoxAfter = await updatedImage.boundingBox();
      console.log('   URL:', thumbAfter);
      console.log('   Dimensions:', boundingBoxAfter ? `${boundingBoxAfter.width}x${boundingBoxAfter.height}` : 'N/A');
      
      // Take screenshot
      await updatedImage.screenshot({ path: 'thumb-visual-after.png' });
      console.log('   Screenshot: thumb-visual-after.png');
      
      // Compare URLs
      if (thumbAfter !== thumbBefore) {
        console.log('   ✅ Thumbnail URL changed!');
        
        // Check for version change
        const versionBefore = thumbBefore.match(/v=(\d+)/)?.[1];
        const versionAfter = thumbAfter.match(/v=(\d+)/)?.[1];
        const hasTimestamp = thumbAfter.includes('&_t=');
        
        if (versionAfter && versionBefore && versionAfter !== versionBefore) {
          console.log(`   ✅ Version updated: ${versionBefore} → ${versionAfter}`);
        }
        if (hasTimestamp) {
          console.log('   ✅ Timestamp added for immediate cache bypass');
        }
      } else {
        console.log('   ⚠️ Thumbnail URL unchanged');
      }
      
      // Check dimension changes (rotated images might have different aspect ratio)
      if (boundingBoxBefore && boundingBoxAfter) {
        const widthChanged = Math.abs(boundingBoxBefore.width - boundingBoxAfter.width) > 2;
        const heightChanged = Math.abs(boundingBoxBefore.height - boundingBoxAfter.height) > 2;
        
        if (widthChanged || heightChanged) {
          console.log('   ✅ Dimensions changed (indicates rotation applied)');
        }
      }
    }
    
    // 8. Hard refresh and check persistence
    await wait(0, '\n8. Hard refresh to check persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await wait(3000);
    
    // Find image after refresh
    let refreshedImage = null;
    const refreshedImages = await page.locator('img[alt]').all();
    for (let i = 0; i < refreshedImages.length; i++) {
      const alt = await refreshedImages[i].getAttribute('alt');
      if (alt && alt.includes('IMG_7667')) {
        refreshedImage = refreshedImages[i];
        break;
      }
    }
    
    if (refreshedImage) {
      await refreshedImage.scrollIntoViewIfNeeded();
      await wait(500);
      
      const thumbRefreshed = await refreshedImage.getAttribute('src');
      console.log('   After refresh URL:', thumbRefreshed);
      
      await refreshedImage.screenshot({ path: 'thumb-visual-refreshed.png' });
      console.log('   Screenshot: thumb-visual-refreshed.png');
      
      // Check that version persists but timestamp is gone
      const hasVersion = thumbRefreshed.includes('?v=');
      const hasTimestamp = thumbRefreshed.includes('&_t=');
      
      if (hasVersion && !hasTimestamp) {
        console.log('   ✅ Version persists, timestamp removed (correct behavior)');
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ Visual Rotation Test Complete!\n');
    console.log('Screenshots saved:');
    console.log('  • thumb-visual-before.png - Original orientation');
    console.log('  • thumb-visual-after.png - After 180° rotation');
    console.log('  • thumb-visual-refreshed.png - After page refresh');
    console.log('\nCheck these images to visually confirm rotation was applied.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nKeeping browser open for manual inspection...');
  await wait(10000);
  await browser.close();
})();