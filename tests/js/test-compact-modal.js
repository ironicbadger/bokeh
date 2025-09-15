const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for page load
  await page.waitForTimeout(3000);
  
  // Click the jobs button
  console.log('Looking for jobs button...');
  const button = await page.locator('button:has-text("active job")').first();
  
  if (await button.count() > 0) {
    console.log('✓ Jobs button found');
    await button.click();
    
    // Wait for modal
    await page.waitForTimeout(1000);
    
    // Check for the new compact modal
    const modal = await page.locator('text=Activity').first();
    if (await modal.count() > 0) {
      console.log('✓ Activity modal appeared!');
      
      // Check for job details
      const scanningText = await page.locator('text=Generating Thumbnails').first();
      if (await scanningText.count() > 0) {
        console.log('✓ Job title visible');
      }
      
      // Check for current file
      const currentFile = await page.locator('text=IMG_4532.HEIC').first();
      if (await currentFile.count() > 0) {
        console.log('✓ Current file displayed');
      }
      
      // Check for progress
      const progressText = await page.locator('text=67%').first();
      if (await progressText.count() > 0) {
        console.log('✓ Progress percentage shown');
      }
      
      // Check for cancel button (Square icon)
      const cancelButton = await page.locator('button[title="Cancel job"]').first();
      if (await cancelButton.count() > 0) {
        console.log('✓ Cancel button available');
      }
      
      // Check modal size and position
      const modalElement = await page.locator('.fixed.top-20.right-4').first();
      if (await modalElement.count() > 0) {
        const box = await modalElement.boundingBox();
        console.log(`\nModal dimensions: ${box.width}x${box.height}px`);
        console.log(`Position: top-right at (${box.x}, ${box.y})`);
      }
    } else {
      console.log('✗ Modal not found');
    }
  } else {
    console.log('✗ Jobs button not found');
  }
  
  console.log('\nKeeping browser open for inspection...');
  await page.waitForTimeout(15000);
  
  await browser.close();
})();