const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing real-time scan and thumbnail workflow...');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // Check initial photo count - look for image elements in the grid
  const initialCount = await page.locator('.masonry-grid img').count();
  console.log(`Initial photo count in grid: ${initialCount}`);
  
  // Check status bar
  const statusBarText = await page.locator('.fixed.bottom-0').textContent();
  console.log(`Status bar: ${statusBarText}`);
  
  // Open Jobs Modal
  console.log('Opening Jobs Modal...');
  await page.click('button:has-text("Jobs")');
  await page.waitForTimeout(1000);
  
  // Check if modal is open
  const modalVisible = await page.locator('text="Jobs"').first().isVisible();
  console.log(`Jobs modal visible: ${modalVisible}`);
  
  // Click Scan My Library
  console.log('Starting scan...');
  const scanButton = page.locator('button:has-text("Scan My Library")');
  if (await scanButton.isVisible()) {
    await scanButton.click();
    console.log('Scan started!');
  } else {
    console.log('Scan button not found - might already be scanning');
  }
  
  // Monitor for 30 seconds to see real-time updates
  console.log('Monitoring for real-time updates...');
  let previousCount = initialCount;
  let previousStatusBar = statusBarText;
  
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    
    // Check photo count
    const currentCount = await page.locator('.masonry-grid img').count();
    
    // Check status bar for updates
    const currentStatusBar = await page.locator('.fixed.bottom-0').textContent();
    
    // Check for scanning/thumbnail progress indicator
    const progressIndicator = await page.locator('.animate-pulse').count();
    
    // Check if new photos appeared
    if (currentCount > previousCount) {
      console.log(`✅ NEW PHOTOS APPEARED! Count increased from ${previousCount} to ${currentCount}`);
      previousCount = currentCount;
    }
    
    // Check if status bar updated
    if (currentStatusBar !== previousStatusBar) {
      console.log(`📊 Status bar updated: ${currentStatusBar}`);
      previousStatusBar = currentStatusBar;
    }
    
    // Check for active job indicators
    if (progressIndicator > 0) {
      console.log(`⚡ Active job indicator showing (${progressIndicator} pulsing elements)`);
    }
    
    // Look for specific progress text
    const scanProgress = await page.locator('text=/Scanning.*%/').count();
    const thumbProgress = await page.locator('text=/Thumbnails.*%/').count();
    
    if (scanProgress > 0) {
      const scanText = await page.locator('text=/Scanning.*%/').first().textContent();
      console.log(`📁 ${scanText}`);
    }
    
    if (thumbProgress > 0) {
      const thumbText = await page.locator('text=/Thumbnails.*%/').first().textContent();
      console.log(`🖼️ ${thumbText}`);
    }
  }
  
  // Final check
  const finalCount = await page.locator('.masonry-grid img').count();
  const finalStatusBar = await page.locator('.fixed.bottom-0').textContent();
  
  console.log('\n--- FINAL RESULTS ---');
  console.log(`Initial photos: ${initialCount}`);
  console.log(`Final photos: ${finalCount}`);
  console.log(`Photos added: ${finalCount - initialCount}`);
  console.log(`Final status bar: ${finalStatusBar}`);
  
  if (finalCount > initialCount) {
    console.log('✅ SUCCESS: Photos appeared in real-time!');
  } else {
    console.log('⚠️ WARNING: No new photos appeared during test');
  }
  
  await browser.close();
})();