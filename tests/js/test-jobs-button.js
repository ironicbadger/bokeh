const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Look for the exact element showing the jobs
  console.log('\nLooking for the jobs element...');
  
  // Try different selectors
  const selectors = [
    'button:has-text("active job")',
    'span:has-text("active job")',
    'text=active job',
    '.text-blue-600.animate-pulse',
    '*:has-text("⚡")'
  ];
  
  for (const selector of selectors) {
    console.log(`\nTrying selector: ${selector}`);
    const element = await page.locator(selector).first();
    
    if (await element.count() > 0) {
      console.log('✓ Element found');
      
      // Get element details
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.evaluate(el => el.className);
      const onclick = await element.evaluate(el => el.onclick ? 'has onclick' : 'no onclick');
      const parent = await element.evaluate(el => ({
        tagName: el.parentElement?.tagName,
        className: el.parentElement?.className
      }));
      
      console.log(`  Tag: ${tagName}`);
      console.log(`  Class: ${className}`);
      console.log(`  OnClick: ${onclick}`);
      console.log(`  Parent: ${parent.tagName} - ${parent.className}`);
      
      // Try to click it
      console.log('  Attempting to click...');
      try {
        await element.click({ timeout: 2000 });
        console.log('  ✓ Click succeeded');
        
        // Check if modal appeared
        await page.waitForTimeout(500);
        const modal = await page.locator('text=Jobs Monitor');
        if (await modal.count() > 0) {
          console.log('  ✓ Modal appeared!');
        } else {
          console.log('  ✗ Modal did not appear');
        }
      } catch (e) {
        console.log('  ✗ Click failed:', e.message);
      }
    } else {
      console.log('✗ Element not found');
    }
  }
  
  // Check the actual rendered HTML of the status bar
  console.log('\n\nStatus bar HTML structure:');
  const statusBarRight = await page.locator('.flex.gap-4').last();
  if (await statusBarRight.count() > 0) {
    const html = await statusBarRight.innerHTML();
    console.log(html);
  }
  
  console.log('\nKeeping browser open for inspection. Press Ctrl+C to exit.');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();