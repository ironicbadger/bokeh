const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🖼️ Testing Year View Lightbox');
  console.log('=====================================\n');

  // Navigate to year view
  console.log('1. Going to Year View...');
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(3000);
  
  // Check for year cards
  const yearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`   ✅ Found ${yearCards} year cards`);
  
  if (yearCards > 0) {
    // Click on first year card
    console.log('\n2. Clicking on first year...');
    const firstYear = await page.locator('[data-testid="year-card"]').first();
    const yearText = await firstYear.locator('.text-3xl').textContent();
    console.log(`   Entering year ${yearText}...`);
    
    await firstYear.click();
    await page.waitForTimeout(2000);
    
    // Check for photos in year detail
    const photoItems = await page.locator('[data-testid="photo-item"]').count();
    console.log(`   ✅ Found ${photoItems} photos in year detail`);
    
    if (photoItems > 0) {
      // Click on first photo to open lightbox
      console.log('\n3. Opening lightbox...');
      await page.locator('[data-testid="photo-item"]').first().click();
      await page.waitForTimeout(2000);
      
      // Check if lightbox opened
      const imageViewer = await page.locator('[data-testid="image-viewer"]').count();
      const fullImage = await page.locator('img[alt*="Full size"]').count();
      const closeButton = await page.locator('button[aria-label="Close viewer"]').count();
      
      console.log(`   Lightbox elements:`);
      console.log(`   - Image viewer: ${imageViewer > 0 ? 'Yes' : 'No'}`);
      console.log(`   - Full image: ${fullImage > 0 ? 'Yes' : 'No'}`);
      console.log(`   - Close button: ${closeButton > 0 ? 'Yes' : 'No'}`);
      
      if (imageViewer > 0 || fullImage > 0) {
        console.log('   ✅ Lightbox opened successfully');
        
        // Test navigation
        console.log('\n4. Testing navigation...');
        
        // Try arrow key navigation
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(1000);
        console.log('   ✅ Right arrow pressed');
        
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(1000);
        console.log('   ✅ Left arrow pressed');
        
        // Test rotation
        console.log('\n5. Testing rotation...');
        await page.keyboard.press('r');
        await page.waitForTimeout(1000);
        console.log('   ✅ Rotate right (r) pressed');
        
        // Test info panel
        console.log('\n6. Testing info panel...');
        await page.keyboard.press('i');
        await page.waitForTimeout(1000);
        const infoPanel = await page.locator('.bg-gray-800').count();
        console.log(`   ✅ Info panel toggle (i) pressed - Panel: ${infoPanel > 0 ? 'Visible' : 'Hidden'}`);
        
        // Close lightbox
        console.log('\n7. Closing lightbox...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        // Check if back in year detail
        const photoItemsAfterClose = await page.locator('[data-testid="photo-item"]').count();
        if (photoItemsAfterClose > 0) {
          console.log('   ✅ Lightbox closed - Back in year detail view');
        } else {
          console.log('   ❌ Lightbox close issue');
        }
      } else {
        console.log('   ❌ Lightbox did not open');
        
        // Check for errors in console
        const pageContent = await page.textContent('body');
        if (pageContent.includes('Cannot read properties')) {
          console.log('   ❌ Error found: Cannot read properties error');
        }
      }
      
      // Test back to year view
      console.log('\n8. Going back to year view...');
      await page.click('button:has(svg path[d*="M10 19l-7-7"])');
      await page.waitForTimeout(1000);
      
      const yearCardsAfterBack = await page.locator('[data-testid="year-card"]').count();
      console.log(`   ✅ Back in year view with ${yearCardsAfterBack} cards`);
    }
  }
  
  console.log('\n✨ Lightbox test completed!');
  
  await browser.close();
})();