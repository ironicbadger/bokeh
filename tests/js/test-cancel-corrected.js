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
  
  console.log('\n=== Test 1: Click X twice (should NOT cancel) ===');
  
  // First click on X
  let cancelButton = await page.locator('button[title="Cancel job"]').first();
  await cancelButton.click();
  console.log('✓ First click on X - confirmation shown');
  
  await page.waitForTimeout(500);
  
  // Check confirmation appeared
  let confirmText = await page.locator('text=Confirm job cancellation?').first();
  if (await confirmText.count() > 0) {
    console.log('✓ Confirmation text appeared');
  }
  
  // Second click on X (should cancel confirmation, not the job)
  cancelButton = await page.locator('button[title="Cancel confirmation"]').first();
  await cancelButton.click();
  console.log('✓ Second click on X - should cancel confirmation');
  
  await page.waitForTimeout(500);
  
  // Check if confirmation disappeared
  confirmText = await page.locator('text=Confirm job cancellation?').first();
  if (await confirmText.count() === 0) {
    console.log('✓ Confirmation cancelled - text disappeared');
  } else {
    console.log('✗ Confirmation text still showing');
  }
  
  // Check if job is still running
  scanJob = await page.locator('text=Scanning Photos').first();
  if (await scanJob.count() > 0) {
    console.log('✓ Job still running (not cancelled)');
  } else {
    console.log('✗ Job was cancelled (should not be)');
  }
  
  console.log('\n=== Test 2: Click X then green check (should cancel) ===');
  
  // First click on X again
  cancelButton = await page.locator('button[title="Cancel job"]').first();
  if (await cancelButton.count() > 0) {
    await cancelButton.click();
    console.log('✓ Clicked X - confirmation shown');
    
    await page.waitForTimeout(500);
    
    // Click green check to confirm
    const checkButton = await page.locator('button[title="Confirm cancellation"]').first();
    if (await checkButton.count() > 0) {
      await checkButton.click();
      console.log('✓ Clicked green check - job should cancel');
      
      await page.waitForTimeout(2000);
      
      // Check if job disappeared
      scanJob = await page.locator('text=Scanning Photos').first();
      if (await scanJob.count() === 0) {
        console.log('✓ Job cancelled successfully');
      } else {
        console.log('✗ Job still showing');
      }
    }
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();