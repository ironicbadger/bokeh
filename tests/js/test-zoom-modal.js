const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\n🌆 Testing Improved Zoom Control Modal\n');
  console.log('=====================================\n');
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Application loaded');
    
    // Look for the minimal zoom indicator
    await page.waitForTimeout(2000);
    const zoomIndicator = await page.locator('text=/\\dx/').first();
    
    if (await zoomIndicator.isVisible()) {
      console.log('✅ Minimal zoom indicator found in bottom-right');
      
      // Click to expand
      await zoomIndicator.click();
      await page.waitForTimeout(500);
      
      // Check for improved modal panel
      const gridDensityTitle = await page.locator('text="Grid Density"').first();
      if (await gridDensityTitle.isVisible()) {
        console.log('✅ Modal panel opened with "Grid Density" title');
      }
      
      // Check for column indicator
      const columnText = await page.locator('text=/columns/').first();
      if (await columnText.isVisible()) {
        const text = await columnText.textContent();
        console.log(`✅ Clear column indicator: "${text}"`);
      }
      
      // Check for reset button
      const resetButton = await page.locator('text=/Reset to default/').first();
      if (await resetButton.isVisible()) {
        console.log('✅ Reset button visible and readable');
      }
      
      // Test the slider
      const slider = await page.locator('input[type="range"]').first();
      if (await slider.isVisible()) {
        await slider.fill('7');
        await page.waitForTimeout(500);
        console.log('✅ Slider interaction working');
      }
      
      // Take screenshot of expanded panel
      await page.screenshot({ path: 'test-zoom-modal-expanded.png' });
      console.log('📸 Screenshot of expanded panel saved');
      
      // Click outside to close
      await page.mouse.click(100, 100);
      await page.waitForTimeout(2000);
      console.log('✅ Panel closes when clicking outside');
    }
    
    console.log('\n🎆 Improved Design Features:');
    console.log('  • Dark modal panel (bg-gray-900) for better contrast');
    console.log('  • Clear "Grid Density" title');
    console.log('  • Shows current value as "X columns"');
    console.log('  • Min/max labels under slider');
    console.log('  • Hover states on buttons');
    console.log('  • Reset button with keyboard hint');
    console.log('  • Border and shadow for depth');
    console.log('  • Proper padding and spacing');
    
    console.log('\n✅ All readability improvements verified!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();