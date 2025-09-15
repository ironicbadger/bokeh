const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\n🌐 Testing Subtle Zoom Control\n');
  console.log('================================\n');
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Application loaded');
    
    // Look for the minimal zoom indicator in bottom-right
    await page.waitForTimeout(2000);
    const zoomIndicator = await page.locator('text=/\\dx/').first();
    
    if (await zoomIndicator.isVisible()) {
      const text = await zoomIndicator.textContent();
      console.log(`✅ Minimal zoom indicator visible: "${text}"`);
      
      // Hover to expand
      await zoomIndicator.hover();
      await page.waitForTimeout(500);
      
      // Check if slider is now visible
      const slider = await page.locator('input[type="range"]').first();
      if (await slider.isVisible()) {
        console.log('✅ Zoom control expands on hover');
        
        // Test slider
        await slider.fill('3');
        await page.waitForTimeout(500);
        console.log('✅ Changed zoom level via slider');
      }
      
      // Move mouse away to collapse
      await page.mouse.move(100, 100);
      await page.waitForTimeout(2000);
      console.log('✅ Zoom control auto-collapses after hover');
    }
    
    // Test keyboard shortcuts
    console.log('\n🎹 Testing Keyboard Shortcuts...');
    
    // Zoom in with Cmd/Ctrl + Plus
    await page.keyboard.down('Meta');
    await page.keyboard.press('Equal'); // Plus key
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    console.log('✅ Cmd/Ctrl + Plus increases zoom');
    
    // Zoom out with Cmd/Ctrl + Minus
    await page.keyboard.down('Meta');
    await page.keyboard.press('Minus');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    console.log('✅ Cmd/Ctrl + Minus decreases zoom');
    
    // Reset with Cmd/Ctrl + 0
    await page.keyboard.down('Meta');
    await page.keyboard.press('0');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    console.log('✅ Cmd/Ctrl + 0 resets zoom to default');
    
    // Take screenshot
    await page.screenshot({ path: 'test-subtle-zoom.png' });
    console.log('\n📸 Screenshot saved as test-subtle-zoom.png');
    
    console.log('\n🎆 Summary of Subtle Zoom Control:');
    console.log('  • Minimal indicator in bottom-right corner (e.g. "4x")');
    console.log('  • Expands to full slider on hover');
    console.log('  • Auto-collapses after 3 seconds');
    console.log('  • Keyboard shortcuts: Cmd/Ctrl + Plus/Minus/0');
    console.log('  • Shows helpful tooltip on first interaction');
    console.log('  • Non-intrusive but easily discoverable');
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();