const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing visual rotation feedback...');
  
  try {
    // Go to the main page
    console.log('1. Navigating to homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Click first photo
    console.log('2. Opening first image...');
    const firstPhoto = await page.locator('img[alt]').first();
    await firstPhoto.click();
    await page.waitForTimeout(1500);
    
    // Look for the image container with transform style
    console.log('3. Looking for image container...');
    const imageContainers = await page.locator('div[style*="transform"]').all();
    console.log(`   Found ${imageContainers.length} elements with transform style`);
    
    // Find the actual image container (should have scale and rotate)
    let imageContainer = null;
    for (const container of imageContainers) {
      const style = await container.getAttribute('style');
      if (style && style.includes('scale') && style.includes('rotate')) {
        imageContainer = container;
        console.log('   Found image container with style:', style);
        break;
      }
    }
    
    if (!imageContainer) {
      throw new Error('Could not find image container with transform style');
    }
    
    // Get initial style
    const initialStyle = await imageContainer.getAttribute('style');
    console.log('4. Initial rotation state:', initialStyle);
    
    // Press 'r' to rotate right
    console.log('5. Pressing "r" to rotate right...');
    await page.keyboard.press('r');
    
    // Wait a bit for the rotation to apply
    await page.waitForTimeout(500);
    
    // Check the style again
    const afterRotateStyle = await imageContainer.getAttribute('style');
    console.log('   After rotation:', afterRotateStyle);
    
    // Check if rotation changed
    if (afterRotateStyle && afterRotateStyle.includes('rotate(90deg)')) {
      console.log('   ✓ Visual rotation applied successfully!');
    } else {
      console.log('   ⚠ Rotation may not have applied visually');
      console.log('   Expected: rotate(90deg)');
      console.log('   Actual:', afterRotateStyle);
    }
    
    // Try rotating again
    console.log('6. Pressing "r" again for cumulative rotation...');
    await page.keyboard.press('r');
    await page.waitForTimeout(500);
    
    const afterSecondRotate = await imageContainer.getAttribute('style');
    console.log('   After second rotation:', afterSecondRotate);
    
    if (afterSecondRotate && afterSecondRotate.includes('rotate(180deg)')) {
      console.log('   ✓ Cumulative rotation working!');
    }
    
    // Try left rotation
    console.log('7. Pressing "l" for left rotation...');
    await page.keyboard.press('l');
    await page.waitForTimeout(500);
    
    const afterLeftRotate = await imageContainer.getAttribute('style');
    console.log('   After left rotation:', afterLeftRotate);
    
    if (afterLeftRotate && afterLeftRotate.includes('rotate(90deg)')) {
      console.log('   ✓ Left rotation working!');
    }
    
    // Check for saving indicator
    console.log('8. Checking for saving indicator...');
    const savingText = await page.locator('text=/Saving rotation/i').count();
    if (savingText > 0) {
      console.log('   ✓ Saving indicator present');
    } else {
      console.log('   ⚠ No saving indicator found');
    }
    
    console.log('\n✅ Visual rotation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\nKeeping browser open for 5 seconds to observe...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();