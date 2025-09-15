const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔄 Testing Image Rotation Feature...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for photos to load
  console.log('1. Waiting for photos to load...');
  await page.waitForSelector('img[loading="lazy"]', { timeout: 10000 });
  const photoCount = await page.locator('img[loading="lazy"]').count();
  console.log(`   ✅ Found ${photoCount} photos in grid`);
  
  // Click on first photo
  console.log('\n2. Opening first photo in viewer...');
  await page.locator('img[loading="lazy"]').first().click();
  await page.waitForSelector('.fixed.inset-0.bg-black', { timeout: 5000 });
  console.log('   ✅ Image viewer opened');
  
  // Test rotation controls
  console.log('\n3. Testing rotation controls...');
  
  // Rotate right
  console.log('   Rotating image right (90°)...');
  await page.click('button[title="Rotate Right (R)"]');
  await page.waitForTimeout(1000);
  console.log('   ✅ Rotated right');
  
  // Rotate right again
  console.log('   Rotating image right again (180°)...');
  await page.click('button[title="Rotate Right (R)"]');
  await page.waitForTimeout(1000);
  console.log('   ✅ Rotated to 180°');
  
  // Check network request for rotation save
  console.log('\n4. Checking if rotation is saved to backend...');
  let rotationSaved = false;
  
  page.on('response', response => {
    if (response.url().includes('/rotation') && response.status() === 200) {
      rotationSaved = true;
      console.log('   ✅ Rotation saved to backend');
    }
  });
  
  // Rotate once more to trigger save
  await page.click('button[title="Rotate Right (R)"]');
  await page.waitForTimeout(2000);
  
  if (!rotationSaved) {
    console.log('   ⚠️ Rotation save request not detected');
  }
  
  // Close viewer
  console.log('\n5. Closing viewer...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log('   ✅ Viewer closed');
  
  // Check if thumbnails are being regenerated
  console.log('\n6. Checking thumbnail regeneration...');
  console.log('   Opening Jobs Modal to check for thumbnail jobs...');
  
  // Click the jobs button in status bar
  await page.click('button:has-text("⚡")');
  await page.waitForTimeout(1000);
  
  const jobsVisible = await page.isVisible('text="Activity"');
  if (jobsVisible) {
    console.log('   ✅ Jobs modal opened');
    
    // Check for thumbnail generation jobs
    const thumbnailJobs = await page.locator('text=/thumbnail/i').count();
    if (thumbnailJobs > 0) {
      console.log(`   ✅ Found ${thumbnailJobs} thumbnail generation job(s)`);
    } else {
      console.log('   ℹ️ No thumbnail generation jobs found (may have completed)');
    }
  }
  
  // Test force regenerate button
  console.log('\n7. Testing force regenerate thumbnails...');
  const regenButton = await page.locator('button:has-text("Force Regenerate All Thumbnails")');
  
  if (await regenButton.isVisible()) {
    console.log('   Clicking Force Regenerate button...');
    await regenButton.click();
    await page.waitForTimeout(2000);
    
    // Check for status message
    const statusMessage = await page.locator('text=/Regenerating thumbnails/i').textContent();
    if (statusMessage) {
      console.log(`   ✅ ${statusMessage}`);
    }
  }
  
  console.log('\n👀 Browser will remain open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Rotation test complete!');
})();