const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📅 Testing Year View Navigation');
  console.log('=====================================\n');

  // Navigate to year view
  console.log('1. Going to Year View...');
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(2000);
  
  // Check for year cards
  const yearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`   ✅ Found ${yearCards} year cards`);
  
  if (yearCards > 0) {
    // Get first year info
    const firstYear = await page.locator('[data-testid="year-card"]').first();
    const yearText = await firstYear.locator('.text-3xl').textContent();
    const photoCount = await firstYear.locator('.text-sm').textContent();
    
    console.log(`\n2. Clicking on year ${yearText} (${photoCount})...`);
    
    // Click on the first year card
    await firstYear.click();
    await page.waitForTimeout(2000);
    
    // Check if we're in year detail view (should have back button)
    const backButton = await page.locator('button:has(svg path[d*="M10 19l-7-7"])').count();
    if (backButton > 0) {
      console.log('   ✅ Year detail view loaded successfully');
      
      // Check for photos in detail view
      const detailPhotos = await page.locator('[data-testid="photo-item"]').count();
      console.log(`   ✅ Found ${detailPhotos} photos in year detail view`);
      
      // Check for month headers
      const monthHeaders = await page.locator('h2.text-xl').count();
      console.log(`   ✅ Photos organized into ${monthHeaders} months`);
      
      // Take screenshot
      await page.screenshot({ path: 'test-year-detail.png' });
      console.log('   📸 Screenshot saved as test-year-detail.png');
      
      // Test back button
      console.log('\n3. Testing back button...');
      await page.click('button:has(svg path[d*="M10 19l-7-7"])');
      await page.waitForTimeout(1000);
      
      // Check if we're back to year cards view
      const yearCardsAfterBack = await page.locator('[data-testid="year-card"]').count();
      if (yearCardsAfterBack > 0) {
        console.log('   ✅ Back button works - returned to year cards view');
      } else {
        console.log('   ❌ Back button did not return to year cards view');
      }
    } else {
      console.log('   ❌ Year detail view did not load (no back button found)');
      console.log('   Current URL:', await page.url());
      
      // Check if it's a 404 page
      const pageContent = await page.textContent('body');
      if (pageContent.includes('404') || pageContent.includes('not found')) {
        console.log('   ❌ Got 404 error page instead of year detail view');
      }
    }
    
    // Test keyboard navigation
    console.log('\n4. Testing keyboard shortcuts...');
    await page.goto('http://localhost:3000/?view=year');
    await page.waitForTimeout(1000);
    
    // Press 'g' for grid view
    await page.keyboard.press('g');
    await page.waitForTimeout(500);
    let currentUrl = await page.url();
    console.log(`   ✅ 'G' key: ${currentUrl.includes('view=grid') || !currentUrl.includes('view=') ? 'Grid view' : 'Failed'}`);
    
    // Press 'y' for year view
    await page.keyboard.press('y');
    await page.waitForTimeout(500);
    currentUrl = await page.url();
    console.log(`   ✅ 'Y' key: ${currentUrl.includes('view=year') ? 'Year view' : 'Failed'}`);
    
  } else {
    console.log('   ⚠️ No year cards to test navigation');
  }
  
  console.log('\n✨ Year navigation test completed!');
  
  await browser.close();
})();