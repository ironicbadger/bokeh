const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down to see animations
  });
  const page = await browser.newPage();
  
  console.log('🎨 Visual test of smooth animations...\n');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  console.log('✅ Page loaded');
  
  // Wait for photos to load
  await page.waitForTimeout(3000);
  
  // Count initial photos
  const photoCount = await page.locator('img').count();
  console.log(`📸 Photos loaded: ${photoCount}`);
  
  // Test zoom animation
  console.log('\n🔍 Testing zoom animation...');
  console.log('Watch the grid smoothly transition between different column counts');
  
  // Hover over zoom control
  const zoomArea = page.locator('div').filter({ hasText: /^5x$/ }).first();
  if (await zoomArea.isVisible()) {
    await zoomArea.hover();
    await page.waitForTimeout(500);
    console.log('✅ Zoom control expanded');
    
    // Change zoom slowly
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      // Animate from 5 to 8
      for (let i = 5; i <= 8; i++) {
        await slider.fill(String(i));
        await page.waitForTimeout(500);
        console.log(`  Zoom level: ${i}`);
      }
      
      // And back down
      for (let i = 7; i >= 3; i--) {
        await slider.fill(String(i));
        await page.waitForTimeout(500);
        console.log(`  Zoom level: ${i}`);
      }
      
      await slider.fill('5'); // Reset to default
    }
  }
  
  // Test scroll for lazy loading animations
  console.log('\n📜 Testing scroll animations...');
  console.log('Watch for smooth fade-in as new photos load');
  
  // Scroll slowly
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    const newCount = await page.locator('img').count();
    if (newCount > photoCount) {
      console.log(`  ✨ New photos appeared! (${newCount - photoCount} more)`);
    }
  }
  
  // Test hover animations
  console.log('\n🎯 Testing hover animations...');
  console.log('Watch for smooth scale and shadow transitions');
  
  const photos = page.locator('img');
  const photoElements = await photos.all();
  
  if (photoElements.length > 0) {
    // Hover over first few photos
    for (let i = 0; i < Math.min(3, photoElements.length); i++) {
      await photoElements[i].hover();
      console.log(`  Hovering photo ${i + 1}`);
      await page.waitForTimeout(800);
    }
  }
  
  // Test status bar number animation
  console.log('\n📊 Testing status bar number animation...');
  console.log('Opening Jobs modal to trigger a scan...');
  
  await page.click('button:has-text("Jobs")');
  await page.waitForTimeout(1000);
  
  const scanButton = page.locator('button:has-text("Scan My Library")');
  if (await scanButton.isVisible()) {
    console.log('Starting scan - watch the numbers smoothly count up in the status bar');
    await scanButton.click();
    
    // Watch for 10 seconds
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const statusText = await page.locator('.animated-number').first().textContent();
      console.log(`  ${i+1}s: ${statusText}`);
    }
  }
  
  console.log('\n✨ Visual animation test complete!');
  console.log('Leave browser open to continue exploring animations...');
  
  // Keep browser open for manual testing
  await page.waitForTimeout(30000);
  
  await browser.close();
})();