const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to the app...');
  await page.goto('http://localhost:3000');
  
  // Wait for page load
  await page.waitForTimeout(3000);
  
  // Look for the jobs button (should always be visible now)
  console.log('\nLooking for jobs button...');
  const button = await page.locator('button:has-text("⚡")').first();
  
  if (await button.count() > 0) {
    const buttonText = await button.textContent();
    console.log('✓ Jobs button found:', buttonText);
    
    // Click to open modal
    await button.click();
    console.log('✓ Clicked jobs button');
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Check for the modal
    const modal = await page.locator('text=Activity').first();
    if (await modal.count() > 0) {
      console.log('✓ Activity modal opened');
      
      // Check for active job
      const scanningJob = await page.locator('text=Scanning Photos').first();
      if (await scanningJob.count() > 0) {
        console.log('✓ Active job displayed: Scanning Photos');
        
        // Check for current file
        const currentFile = await page.locator('text=IMG_2341.HEIC').first();
        if (await currentFile.count() > 0) {
          console.log('✓ Current file shown: IMG_2341.HEIC');
        } else {
          console.log('✗ Current file not displayed');
        }
        
        // Check for progress
        const progress = await page.locator('text=35%').first();
        if (await progress.count() > 0) {
          console.log('✓ Progress shown: 35%');
        } else {
          console.log('✗ Progress not shown');
        }
        
        // Check for item count
        const items = await page.locator('text=875 / 2500 items').first();
        if (await items.count() > 0) {
          console.log('✓ Item count shown: 875 / 2500');
        } else {
          console.log('✗ Item count not shown');
        }
      } else {
        console.log('✗ No active jobs displayed in modal');
        
        // Check what is displayed
        const modalContent = await page.locator('.fixed.bottom-12').first();
        if (await modalContent.count() > 0) {
          const text = await modalContent.textContent();
          console.log('Modal content:', text.substring(0, 200));
        }
      }
      
      // Test minimize button
      const minimizeBtn = await page.locator('button[title="Minimize"]').first();
      if (await minimizeBtn.count() > 0) {
        await minimizeBtn.click();
        console.log('✓ Clicked minimize button');
        
        await page.waitForTimeout(500);
        
        // Check if modal is hidden
        const modalAfterMinimize = await page.locator('text=Activity').first();
        if (await modalAfterMinimize.count() === 0) {
          console.log('✓ Modal minimized successfully');
          
          // Click jobs button again to restore
          await button.click();
          await page.waitForTimeout(500);
          
          const modalRestored = await page.locator('text=Activity').first();
          if (await modalRestored.count() > 0) {
            console.log('✓ Modal restored from minimize');
          }
        }
      }
    } else {
      console.log('✗ Modal did not open');
    }
  } else {
    console.log('✗ Jobs button not found');
  }
  
  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();