const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Testing fresh database scan with real-time updates...\n');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  // Check initial state - should be empty
  const initialCount = await page.locator('img').count();
  console.log(`✅ Initial state: ${initialCount} photos (should be 0)`);
  
  // Check status bar shows 0 photos
  const statusBarText = await page.locator('.fixed.bottom-0').textContent();
  console.log(`📊 Status bar: ${statusBarText.includes('Photos: 0') ? '✅ Shows 0 photos' : '❌ Not showing 0'}`);
  
  // Open Jobs Modal
  console.log('\n🔧 Opening Jobs Modal...');
  await page.click('button:has-text("Jobs")');
  await page.waitForTimeout(1000);
  
  // Start scan
  console.log('📁 Starting scan of photo library...');
  const scanButton = page.locator('button:has-text("Scan My Library")');
  if (await scanButton.isVisible()) {
    await scanButton.click();
    console.log('✅ Scan started!\n');
  } else {
    console.log('❌ Scan button not found\n');
    await browser.close();
    return;
  }
  
  // Monitor for real-time updates
  console.log('👀 Monitoring for real-time photo appearance...\n');
  let previousPhotoCount = 0;
  let photosAppeared = false;
  let maxChecks = 30; // Check for 60 seconds
  
  for (let i = 0; i < maxChecks; i++) {
    await page.waitForTimeout(2000);
    
    // Count photos in grid
    const currentPhotoCount = await page.locator('img').count();
    
    // Check if photos increased
    if (currentPhotoCount > previousPhotoCount) {
      const newPhotos = currentPhotoCount - previousPhotoCount;
      console.log(`🎉 +${newPhotos} photos appeared! Total: ${currentPhotoCount}`);
      previousPhotoCount = currentPhotoCount;
      photosAppeared = true;
    }
    
    // Check scan progress
    const scanProgress = await page.locator('text=/Scanning.*%/').first().textContent().catch(() => null);
    const thumbProgress = await page.locator('text=/Thumbnails.*%/').first().textContent().catch(() => null);
    
    if (scanProgress) {
      process.stdout.write(`\r📁 ${scanProgress}`);
    }
    if (thumbProgress && !scanProgress) {
      process.stdout.write(`\r🖼️ ${thumbProgress}`);
    }
    
    // Check if scan completed
    const completedText = await page.locator('text=/completed/i').count();
    if (completedText > 0 && currentPhotoCount > 0) {
      console.log('\n\n✅ Scan completed!');
      break;
    }
    
    // Early success if we see photos appearing
    if (currentPhotoCount > 100) {
      console.log('\n\n🚀 Success! Photos are appearing in real-time!');
      break;
    }
  }
  
  // Final results
  console.log('\n\n=== FINAL RESULTS ===');
  const finalPhotoCount = await page.locator('img').count();
  const finalStatusBar = await page.locator('.fixed.bottom-0').textContent();
  
  console.log(`📸 Total photos loaded: ${finalPhotoCount}`);
  console.log(`📊 Status bar: ${finalStatusBar.substring(0, 100)}...`);
  
  if (photosAppeared) {
    console.log('\n✅ SUCCESS: Photos appeared in real-time as expected!');
    console.log('✅ The auto-reload system is working correctly!');
  } else {
    console.log('\n❌ FAILURE: No photos appeared during the scan');
    console.log('❌ The auto-reload system needs fixing');
  }
  
  await browser.close();
})();