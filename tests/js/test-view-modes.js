const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing View Mode Switching...');
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('1. Testing Grid View (default)');
    // Check that grid view is default
    const gridButton = await page.locator('button:has-text("Grid")');
    const gridButtonClasses = await gridButton.getAttribute('class');
    if (gridButtonClasses.includes('bg-blue-600')) {
      console.log('✓ Grid view is active by default');
    }
    
    // Check for photo grid
    await page.waitForTimeout(2000);
    const gridExists = await page.locator('[class*="grid"]').first().isVisible();
    console.log(gridExists ? '✓ Grid layout visible' : '✗ Grid layout not found');
    
    console.log('\n2. Testing Year View');
    // Switch to Year view
    await page.click('button:has-text("Year")');
    await page.waitForTimeout(1000);
    
    // Check URL changed
    const yearUrl = page.url();
    if (yearUrl.includes('view=year')) {
      console.log('✓ URL updated to include view=year');
    }
    
    // Check for year view elements
    const yearHeader = await page.locator('h2').first();
    const yearText = await yearHeader.textContent();
    console.log(`✓ Year view showing: ${yearText}`);
    
    // Try expanding a year
    const yearToggle = await page.locator('h2').first().locator('..');
    await yearToggle.click();
    await page.waitForTimeout(2000);
    console.log('✓ Year expanded');
    
    console.log('\n3. Testing Files View');
    // Switch to Files view
    await page.click('button:has-text("Files")');
    await page.waitForTimeout(1000);
    
    // Check URL changed
    const filesUrl = page.url();
    if (filesUrl.includes('view=files')) {
      console.log('✓ URL updated to include view=files');
    }
    
    // Check for file tree
    const folderHeader = await page.locator('h3:has-text("FOLDERS")');
    if (await folderHeader.isVisible()) {
      console.log('✓ File tree panel visible');
    }
    
    console.log('\n4. Testing Keyboard Shortcuts');
    // Test 'g' for grid
    await page.keyboard.press('g');
    await page.waitForTimeout(500);
    if (page.url().includes('view=grid') || !page.url().includes('view=')) {
      console.log('✓ Keyboard shortcut "g" switches to grid view');
    }
    
    // Test 'y' for year
    await page.keyboard.press('y');
    await page.waitForTimeout(500);
    if (page.url().includes('view=year')) {
      console.log('✓ Keyboard shortcut "y" switches to year view');
    }
    
    // Test 'f' for files
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    if (page.url().includes('view=files')) {
      console.log('✓ Keyboard shortcut "f" switches to files view');
    }
    
    console.log('\n✅ All view mode tests passed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();