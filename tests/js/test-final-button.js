const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for the page to fully load
  await page.waitForTimeout(5000);
  
  // Check API response
  console.log('\nChecking API for active jobs...');
  const apiResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/system/stats');
    return await response.json();
  });
  console.log('Active jobs from API:', apiResponse.active_jobs);
  
  // Look for the button
  console.log('\nLooking for jobs button...');
  const button = await page.locator('button:has-text("active job")').first();
  
  if (await button.count() > 0) {
    console.log('✓ Jobs button found!');
    
    const buttonText = await button.textContent();
    console.log('Button text:', buttonText);
    
    // Click the button
    console.log('\nClicking the button...');
    await button.click();
    
    // Wait for modal
    await page.waitForTimeout(1000);
    
    // Check if modal appeared
    const modalTitle = await page.locator('h2:has-text("Jobs Monitor")');
    if (await modalTitle.count() > 0) {
      console.log('✓✓✓ SUCCESS! Jobs modal opened!');
      
      // Check modal content
      const jobs = await page.locator('[data-testid="job-item"], .border.rounded-lg.p-4').all();
      console.log(`\nModal shows ${jobs.length} job(s)`);
      
      // Try to find cancel button
      const cancelButton = await page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.count() > 0) {
        console.log('✓ Cancel button found');
      }
      
      // Close modal
      const closeButton = await page.locator('button svg.w-5.h-5').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        console.log('✓ Modal closed');
      }
    } else {
      console.log('✗ Modal did not appear');
    }
  } else {
    console.log('✗ Jobs button not found');
    
    // Debug: show what's in the status bar
    const statusBar = await page.locator('.fixed.bottom-0');
    if (await statusBar.count() > 0) {
      const statusBarHTML = await statusBar.innerHTML();
      console.log('\nStatus bar HTML:', statusBarHTML.substring(0, 300));
    }
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();