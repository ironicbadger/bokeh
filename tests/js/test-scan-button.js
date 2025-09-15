const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for page load
  await page.waitForTimeout(3000);
  
  // Check that Import button is gone from header
  console.log('\nChecking header...');
  const headerImportBtn = await page.locator('header button:has-text("Import Photos")');
  if (await headerImportBtn.count() === 0) {
    console.log('✓ Import button removed from header');
  } else {
    console.log('✗ Import button still in header');
  }
  
  // Open the jobs modal
  console.log('\nOpening jobs modal...');
  const jobsButton = await page.locator('button:has-text("⚡")').first();
  if (await jobsButton.count() > 0) {
    await jobsButton.click();
    console.log('✓ Clicked jobs button');
    
    // Wait for modal
    await page.waitForTimeout(1000);
    
    // Check for Scan My Library button
    const scanButton = await page.locator('button:has-text("Scan My Library")').first();
    if (await scanButton.count() > 0) {
      console.log('✓ Scan My Library button found');
      
      // Check if button has folder icon
      const buttonWithIcon = await page.locator('button:has-text("Scan My Library") svg').first();
      if (await buttonWithIcon.count() > 0) {
        console.log('✓ Button has folder icon');
      }
      
      // Check if button is enabled
      const isDisabled = await scanButton.isDisabled();
      if (!isDisabled) {
        console.log('✓ Button is enabled');
        
        // Click the scan button
        console.log('\nClicking Scan My Library...');
        await scanButton.click();
        
        // Wait for response
        await page.waitForTimeout(2000);
        
        // Check for status message
        const statusMsg = await page.locator('text=Scan started').first();
        if (await statusMsg.count() > 0) {
          const statusText = await statusMsg.textContent();
          console.log('✓ Scan started:', statusText);
        } else {
          console.log('✗ No status message shown');
        }
        
        // Check if a scan job appears
        await page.waitForTimeout(2000);
        const scanJob = await page.locator('text=Scanning Photos').first();
        if (await scanJob.count() > 0) {
          console.log('✓ Scan job appeared in activity list');
        }
        
        // Check if button is now disabled (scan already running)
        const isNowDisabled = await scanButton.isDisabled();
        if (isNowDisabled) {
          console.log('✓ Button disabled while scan is running');
        }
      } else {
        console.log('✗ Button is disabled');
      }
    } else {
      console.log('✗ Scan My Library button not found');
    }
  } else {
    console.log('✗ Jobs button not found');
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();