const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for page load
  await page.waitForTimeout(3000);
  
  // Open the jobs modal
  console.log('\nOpening jobs modal...');
  const jobsButton = await page.locator('button:has-text("⚡")').first();
  await jobsButton.click();
  await page.waitForTimeout(1000);
  
  // Start a scan if needed
  let scanJob = await page.locator('text=Scanning Photos').first();
  if (await scanJob.count() === 0) {
    console.log('Starting a scan job...');
    const scanButton = await page.locator('button:has-text("Scan My Library")').first();
    if (await scanButton.count() > 0 && !await scanButton.isDisabled()) {
      await scanButton.click();
      await page.waitForTimeout(3000);
    }
  }
  
  // Test full cancellation flow
  console.log('\nTesting full cancellation flow...');
  
  // First click on X
  const cancelButton = await page.locator('.flex.items-center.gap-1 button').last();
  await cancelButton.click();
  console.log('✓ Clicked X button');
  
  await page.waitForTimeout(500);
  
  // Now click the green check to confirm
  const checkButton = await page.locator('button[title="Confirm cancellation"]').first();
  if (await checkButton.count() > 0) {
    console.log('✓ Green check button found');
    await checkButton.click();
    console.log('✓ Clicked green check to confirm');
    
    // Wait for job to be cancelled
    await page.waitForTimeout(2000);
    
    // Check if job disappeared
    const jobAfter = await page.locator('text=Scanning Photos').first();
    if (await jobAfter.count() === 0) {
      console.log('✓ Job successfully cancelled and removed');
    } else {
      console.log('✗ Job still showing');
    }
    
    // Check for "No active jobs" message
    const noJobs = await page.locator('text=No active jobs').first();
    if (await noJobs.count() > 0) {
      console.log('✓ "No active jobs" message appeared');
    }
  } else {
    console.log('✗ Green check button not found');
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();