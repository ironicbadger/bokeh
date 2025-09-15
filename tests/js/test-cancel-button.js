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
  console.log('✓ Jobs modal opened');
  
  await page.waitForTimeout(1000);
  
  // Check if there's an active job, if not start one
  let scanJob = await page.locator('text=Scanning Photos').first();
  if (await scanJob.count() === 0) {
    console.log('No active job, starting a scan...');
    const scanButton = await page.locator('button:has-text("Scan My Library")').first();
    if (await scanButton.count() > 0 && !await scanButton.isDisabled()) {
      await scanButton.click();
      console.log('✓ Started scan job');
      await page.waitForTimeout(3000);
    }
  }
  
  // Now look for the cancel button (X icon)
  console.log('\nTesting cancel button...');
  const cancelButton = await page.locator('.flex.items-center.gap-1 button').last();
  
  if (await cancelButton.count() > 0) {
    console.log('✓ Found cancel button (X)');
    
    // Check initial state
    const initialColor = await cancelButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    console.log('Initial color:', initialColor);
    
    // Click the cancel button once
    await cancelButton.click();
    console.log('✓ Clicked cancel button once');
    
    await page.waitForTimeout(500);
    
    // Check for confirmation elements
    const confirmText = await page.locator('text=Confirm job cancellation?').first();
    if (await confirmText.count() > 0) {
      console.log('✓ Confirmation text appeared');
    } else {
      console.log('✗ Confirmation text not found');
    }
    
    // Check for green check button
    const checkButton = await page.locator('button svg.w-4.h-4').first();
    if (await checkButton.count() > 0) {
      console.log('✓ Green check button appeared');
      
      // Check if it's pulsing
      const parentButton = await page.locator('button.animate-pulse').first();
      if (await parentButton.count() > 0) {
        console.log('✓ Check button is pulsing');
      }
    } else {
      console.log('✗ Check button not found');
    }
    
    // Check if X turned red
    const updatedColor = await cancelButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    console.log('Updated X color:', updatedColor);
    if (updatedColor !== initialColor) {
      console.log('✓ X button changed color (turned red)');
    }
    
    // Wait to see if it auto-resets
    console.log('\nWaiting 4 seconds to test auto-reset...');
    await page.waitForTimeout(4000);
    
    const confirmTextAfter = await page.locator('text=Confirm job cancellation?').first();
    if (await confirmTextAfter.count() === 0) {
      console.log('✓ Confirmation auto-reset after timeout');
    } else {
      console.log('✗ Confirmation still showing');
    }
    
  } else {
    console.log('✗ No cancel button found');
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();