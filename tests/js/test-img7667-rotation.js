const { chromium } = require('playwright');

async function wait(ms, message) {
  if (message) console.log(message);
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎯 Testing Real-Time Thumbnail Update for IMG_7667.jpg\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Load grid and find IMG_7667.jpg
    await wait(0, '\n1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await wait(2000);
    
    // Look for IMG_7667.jpg
    console.log('2. Looking for IMG_7667.jpg...');
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
      console.log('   ❌ IMG_7667.jpg not found in grid');
      console.log('   Trying first image instead...');
      const firstImage = await page.locator('img[alt]').first();
      targetImage = firstImage;
      targetIndex = 0;
    } else {
      console.log('   ✅ Found IMG_7667.jpg at index', targetIndex);
    }
    
    // Get initial thumbnail URL
    const thumbBefore = await targetImage.getAttribute('src');
    console.log('3. Initial thumbnail URL:', thumbBefore);
    
    // Take screenshot of thumbnail before
    await targetImage.screenshot({ path: 'thumb-before.png' });
    console.log('   Screenshot saved: thumb-before.png');
    
    // 4. Open in lightbox
    await wait(0, '\n4. Opening image in lightbox...');
    await targetImage.click();
    await wait(2000);
    
    // 5. Rotate the image
    await wait(0, '5. Rotating image (pressing "r")...');
    await page.keyboard.press('r');
    await wait(1500, '   Waiting for rotation to save...');
    
    // Check rotation in UI
    const container = await page.locator('div[style*="transform"][style*="scale"]').first();
    const style = await container.getAttribute('style');
    console.log('   Rotation applied:', style);
    
    // 6. Close lightbox
    await wait(0, '\n6. Closing lightbox to return to grid...');
    await page.keyboard.press('Escape');
    await wait(2000, '   Waiting for grid to update...');
    
    // 7. Check if thumbnail updated
    console.log('\n7. Checking thumbnail update...');
    
    // Find the image again (might have moved)
    let updatedImage = null;
    if (targetIndex >= 0) {
      const allImages = await page.locator('img[alt]').all();
      for (let i = 0; i < allImages.length; i++) {
        const alt = await allImages[i].getAttribute('alt');
        if (alt && alt.includes('IMG_7667')) {
          updatedImage = allImages[i];
          break;
        }
      }
    }
    
    if (!updatedImage) {
      updatedImage = await page.locator('img[alt]').nth(targetIndex);
    }
    
    const thumbAfter = await updatedImage.getAttribute('src');
    console.log('   New thumbnail URL:', thumbAfter);
    
    // Take screenshot of thumbnail after
    await updatedImage.screenshot({ path: 'thumb-after.png' });
    console.log('   Screenshot saved: thumb-after.png');
    
    // Compare URLs
    if (thumbAfter !== thumbBefore) {
      console.log('   ✅ Thumbnail URL changed!');
      
      // Extract version info
      const versionBefore = thumbBefore.match(/v=(\d+)/)?.[1];
      const versionAfter = thumbAfter.match(/v=(\d+)/)?.[1];
      const hasTimestamp = thumbAfter.includes('&t=');
      
      if (versionAfter && versionBefore) {
        console.log(`   Version: ${versionBefore} → ${versionAfter}`);
      }
      if (hasTimestamp) {
        console.log('   ✅ Timestamp added for cache busting');
      }
    } else {
      console.log('   ❌ Thumbnail URL unchanged');
    }
    
    // 8. Force refresh to verify persistence
    await wait(0, '\n8. Refreshing page to verify persistence...');
    await page.reload();
    await wait(3000);
    
    // Find image again after refresh
    let refreshedImage = null;
    const refreshedImages = await page.locator('img[alt]').all();
    for (let i = 0; i < refreshedImages.length; i++) {
      const alt = await refreshedImages[i].getAttribute('alt');
      if (alt && alt.includes('IMG_7667')) {
        refreshedImage = refreshedImages[i];
        break;
      }
    }
    
    if (!refreshedImage && targetIndex >= 0) {
      refreshedImage = await page.locator('img[alt]').nth(targetIndex);
    }
    
    if (refreshedImage) {
      const thumbRefreshed = await refreshedImage.getAttribute('src');
      console.log('   After refresh:', thumbRefreshed);
      
      await refreshedImage.screenshot({ path: 'thumb-refreshed.png' });
      console.log('   Screenshot saved: thumb-refreshed.png');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ Real-Time Thumbnail Update Test Complete!\n');
    console.log('Check the screenshots:');
    console.log('  • thumb-before.png - Original thumbnail');
    console.log('  • thumb-after.png - After rotation');
    console.log('  • thumb-refreshed.png - After page refresh');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nKeeping browser open for manual inspection...');
  await wait(15000);
  await browser.close();
})();