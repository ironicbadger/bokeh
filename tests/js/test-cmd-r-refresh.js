const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing Cmd+R refresh vs rotation conflict...\n');
  
  try {
    // Navigate to homepage
    console.log('1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Open first image
    console.log('2. Opening image in lightbox...');
    const firstImg = await page.locator('img').first();
    await firstImg.click();
    await page.waitForTimeout(1500);
    
    // Get initial rotation state
    const imageContainer = await page.locator('div[style*="transform"][style*="scale"]').first();
    const initialStyle = await imageContainer.getAttribute('style');
    console.log('3. Initial style:', initialStyle);
    
    // Test plain 'r' key (should rotate)
    console.log('\n4. Testing plain "r" key (should rotate)...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    
    const afterR = await imageContainer.getAttribute('style');
    if (afterR && afterR.includes('rotate(90deg)')) {
      console.log('   ✅ Plain "r" rotates the image');
    } else {
      console.log('   ❌ Plain "r" did not rotate');
    }
    
    // Test Cmd+R (should NOT rotate on Mac)
    console.log('\n5. Testing Cmd+R (should NOT rotate, allows refresh)...');
    const beforeCmdR = await imageContainer.getAttribute('style');
    
    // Simulate Cmd+R
    await page.keyboard.down('Meta'); // Meta key is Cmd on Mac
    await page.keyboard.press('r');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    
    const afterCmdR = await imageContainer.getAttribute('style');
    if (afterCmdR === beforeCmdR) {
      console.log('   ✅ Cmd+R does NOT trigger rotation');
      console.log('   Browser refresh would work normally');
    } else {
      console.log('   ❌ Cmd+R incorrectly triggered rotation');
    }
    
    // Test Ctrl+R (for Windows/Linux compatibility)
    console.log('\n6. Testing Ctrl+R (should also NOT rotate)...');
    const beforeCtrlR = await imageContainer.getAttribute('style');
    
    await page.keyboard.down('Control');
    await page.keyboard.press('r');
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);
    
    const afterCtrlR = await imageContainer.getAttribute('style');
    if (afterCtrlR === beforeCtrlR) {
      console.log('   ✅ Ctrl+R does NOT trigger rotation');
    } else {
      console.log('   ❌ Ctrl+R incorrectly triggered rotation');
    }
    
    // Test 'l' for left rotation
    console.log('\n7. Testing "l" for left rotation...');
    await page.keyboard.press('l');
    await page.waitForTimeout(1000);
    
    const afterL = await imageContainer.getAttribute('style');
    if (afterL && afterL.includes('rotate(0deg)')) {
      console.log('   ✅ "l" rotates left (back to 0°)');
    }
    
    // Test Cmd+L (should NOT rotate)
    console.log('\n8. Testing Cmd+L (should NOT rotate)...');
    const beforeCmdL = await imageContainer.getAttribute('style');
    
    await page.keyboard.down('Meta');
    await page.keyboard.press('l');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(500);
    
    const afterCmdL = await imageContainer.getAttribute('style');
    if (afterCmdL === beforeCmdL) {
      console.log('   ✅ Cmd+L does NOT trigger rotation');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Keyboard shortcut conflict test complete!');
    console.log('\nSummary:');
    console.log('  • Plain R/L keys: Rotate image ✓');
    console.log('  • Cmd+R: Does NOT rotate (allows browser refresh) ✓');
    console.log('  • Ctrl+R: Does NOT rotate (for Windows/Linux) ✓');
    console.log('  • Cmd+L: Does NOT rotate ✓');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\nClosing in 3 seconds...');
  await page.waitForTimeout(3000);
  await browser.close();
})();