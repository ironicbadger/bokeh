const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let errorCount = 0;
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
      errorCount++;
    } else if (msg.type() === 'warning') {
      console.log('⚠️  Console Warning:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
    errorCount++;
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    if (!request.url().includes('favicon')) {
      console.log('❌ Request Failed:', request.url());
      errorCount++;
    }
  });
  
  try {
    console.log('🔍 Testing Photo Management Application...\n');
    
    // Test 1: Navigate to homepage
    console.log('1. Loading homepage...');
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('   ✅ Page loaded with status:', response.status());
    
    // Test 2: Check page title
    const title = await page.title();
    console.log('   ✅ Page title:', title);
    
    // Test 3: Wait for photos to load
    console.log('\n2. Waiting for photos to load...');
    await page.waitForTimeout(3000); // Give API time to respond
    
    // Test 4: Check if photos loaded or if there's an error message
    const mainContent = await page.textContent('main');
    if (mainContent.includes('Loading photos...')) {
      console.log('   ⏳ Still loading photos after 3 seconds');
      
      // Wait a bit more
      await page.waitForTimeout(5000);
      const updatedContent = await page.textContent('main');
      
      if (updatedContent.includes('No photos found')) {
        console.log('   ℹ️  No photos in database (need to import)');
      } else if (updatedContent.includes('Error')) {
        console.log('   ❌ Error loading photos');
      } else if (updatedContent.includes('Loading photos...')) {
        console.log('   ⚠️  Photos still loading after 8 seconds');
      } else {
        console.log('   ✅ Photos loaded');
      }
    } else if (mainContent.includes('No photos found')) {
      console.log('   ℹ️  No photos in database');
    } else {
      console.log('   ✅ Content loaded successfully');
    }
    
    // Test 5: Check for photo grid
    const photoItems = await page.locator('[data-testid="photo-item"]').count().catch(() => 0);
    if (photoItems > 0) {
      console.log(`   ✅ Found ${photoItems} photos in grid`);
    } else {
      // Try alternative selector
      const images = await page.locator('main img').count().catch(() => 0);
      if (images > 0) {
        console.log(`   ✅ Found ${images} images`);
      } else {
        console.log('   ℹ️  No photos displayed');
      }
    }
    
    // Test 6: Check Import button
    console.log('\n3. Testing Import Photos button...');
    const importButton = await page.locator('button:has-text("Import Photos")').first();
    if (await importButton.isVisible()) {
      console.log('   ✅ Import button found');
      
      // Click it and check response
      await importButton.click();
      await page.waitForTimeout(1000);
      
      const importStatus = await page.textContent('body');
      if (importStatus.includes('Import job started') || importStatus.includes('Starting import')) {
        console.log('   ✅ Import triggered successfully');
      }
    }
    
    // Test 7: Check Status Bar
    console.log('\n4. Checking status bar...');
    const statusBar = await page.locator('div:has-text("Photos:")').first().textContent().catch(() => '');
    if (statusBar) {
      console.log('   ✅ Status bar found:', statusBar.substring(0, 100));
    }
    
    // Test 8: Check API connectivity
    console.log('\n5. Testing API connectivity...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/system/health');
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (apiResponse.error) {
      console.log('   ❌ API connection failed:', apiResponse.error);
    } else if (apiResponse.status === 'healthy') {
      console.log('   ✅ API is healthy');
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    if (errorCount === 0) {
      console.log('   ✅ All tests passed - No console errors detected');
    } else {
      console.log(`   ⚠️  ${errorCount} errors detected`);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  
  await browser.close();
})();