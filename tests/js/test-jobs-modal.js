const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Look for the jobs button
  console.log('Looking for the jobs button...');
  const jobsButton = await page.locator('button:has-text("active job")');
  
  if (await jobsButton.count() > 0) {
    console.log('Jobs button found!');
    
    // Get button details
    const buttonText = await jobsButton.textContent();
    console.log('Button text:', buttonText);
    
    // Check if button is visible
    const isVisible = await jobsButton.isVisible();
    console.log('Button is visible:', isVisible);
    
    // Check if button is enabled
    const isEnabled = await jobsButton.isEnabled();
    console.log('Button is enabled:', isEnabled);
    
    // Get computed styles
    const styles = await jobsButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        pointerEvents: computed.pointerEvents,
        cursor: computed.cursor,
        zIndex: computed.zIndex,
        position: computed.position,
        display: computed.display
      };
    });
    console.log('Button styles:', styles);
    
    // Try to click the button
    console.log('Attempting to click the button...');
    try {
      await jobsButton.click({ timeout: 5000 });
      console.log('✓ Button clicked successfully!');
      
      // Wait a moment for modal to appear
      await page.waitForTimeout(1000);
      
      // Check if modal appeared
      const modal = await page.locator('text=Jobs Monitor');
      if (await modal.count() > 0) {
        console.log('✓ Jobs modal appeared!');
      } else {
        console.log('✗ Jobs modal did not appear');
      }
    } catch (error) {
      console.log('✗ Failed to click button:', error.message);
      
      // Try alternative click methods
      console.log('Trying force click...');
      try {
        await jobsButton.click({ force: true });
        console.log('✓ Force click succeeded');
      } catch (e) {
        console.log('✗ Force click also failed:', e.message);
      }
    }
    
    // Check for overlapping elements
    const boundingBox = await jobsButton.boundingBox();
    console.log('Button bounding box:', boundingBox);
    
    // Check what element is at the button's position
    if (boundingBox) {
      const elementAtPoint = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return {
          tagName: el?.tagName,
          className: el?.className,
          id: el?.id,
          textContent: el?.textContent?.substring(0, 50)
        };
      }, { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 });
      console.log('Element at button center:', elementAtPoint);
    }
    
  } else {
    console.log('No jobs button found. Checking for any buttons...');
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons on the page`);
    
    for (let i = 0; i < Math.min(5, allButtons.length); i++) {
      const text = await allButtons[i].textContent();
      console.log(`Button ${i}: ${text}`);
    }
  }
  
  // Keep browser open for manual inspection
  console.log('\nKeeping browser open for inspection. Press Ctrl+C to exit.');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();