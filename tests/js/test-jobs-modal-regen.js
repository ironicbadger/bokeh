const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing Jobs Modal and Regenerate Thumbnails...');
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Click the jobs button (lightning bolt) in the status bar
  console.log('Opening Jobs Modal...');
  const jobsButton = await page.locator('.fixed.bottom-0 button').first();
  await jobsButton.click();
  
  await page.waitForTimeout(1000);
  
  // Check if modal opened
  const modal = await page.locator('text=Activity').first();
  if (await modal.isVisible()) {
    console.log('✓ Jobs Modal opened');
  } else {
    console.log('✗ Jobs Modal did not open');
  }
  
  // Look for the regenerate button
  const regenButton = await page.locator('button:has-text("Force Regenerate All Thumbnails")').first();
  if (await regenButton.isVisible()) {
    console.log('✓ Force Regenerate button found');
    
    // Check if button is enabled
    const isDisabled = await regenButton.isDisabled();
    console.log(`  Button is ${isDisabled ? 'disabled' : 'enabled'}`);
    
    if (!isDisabled) {
      console.log('Clicking Force Regenerate All Thumbnails...');
      await regenButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for status message
      const statusMessage = await page.locator('.text-xs.text-gray-600').first();
      if (await statusMessage.isVisible()) {
        const text = await statusMessage.textContent();
        console.log(`  Status: ${text}`);
      }
    }
  } else {
    console.log('✗ Force Regenerate button not found');
  }
  
  // Take screenshot of modal
  await page.screenshot({ path: 'tests/js/jobs-modal-screenshot.png' });
  console.log('Screenshot saved to tests/js/jobs-modal-screenshot.png');
  
  await page.waitForTimeout(5000);
  
  await browser.close();
})();