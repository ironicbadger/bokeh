const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎯 Final Rotation Consistency Test\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Load and get initial state
    console.log('\n1. Loading photo grid and checking initial state...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Get thumbnail URLs
    const gridImages = await page.locator('img[alt]').all();
    const thumb1Initial = await gridImages[0].getAttribute('src');
    const thumb2Initial = await gridImages[1].getAttribute('src');
    
    console.log('   Photo 1 thumbnail:', thumb1Initial);
    console.log('   Photo 2 thumbnail:', thumb2Initial);
    
    // 2. Open first image and check its server rotation
    console.log('\n2. Opening first photo in lightbox...');
    await gridImages[0].click();
    await page.waitForTimeout(1500);
    
    const container = await page.locator('div[style*="transform"][style*="scale"]').first();
    let style = await container.getAttribute('style');
    const initialRotation1 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 1 opens with rotation: ${initialRotation1}°`);
    
    // 3. Navigate to second photo and check its server rotation
    console.log('\n3. Navigating to second photo...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    const initialRotation2 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 2 opens with rotation: ${initialRotation2}°`);
    
    // 4. Modify rotation of photo 2
    console.log('\n4. Modifying photo 2 rotation...');
    const targetRotation2 = (parseInt(initialRotation2) + 90) % 360;
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    style = await container.getAttribute('style');
    const newRotation2 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 2 rotated to: ${newRotation2}° (expected: ${targetRotation2}°)`);
    
    if (parseInt(newRotation2) === targetRotation2) {
      console.log('   ✅ Rotation applied correctly');
    } else {
      console.log('   ❌ Rotation mismatch');
    }
    
    // 5. Go back to photo 1
    console.log('\n5. Going back to photo 1...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    const returnRotation1 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 1 rotation: ${returnRotation1}° (should be: ${initialRotation1}°)`);
    
    if (returnRotation1 === initialRotation1) {
      console.log('   ✅ Photo 1 rotation unchanged');
    } else {
      console.log('   ❌ Photo 1 rotation changed unexpectedly');
    }
    
    // 6. Modify photo 1 rotation
    console.log('\n6. Modifying photo 1 rotation...');
    const targetRotation1 = (parseInt(returnRotation1) + 90) % 360;
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    style = await container.getAttribute('style');
    const newRotation1 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 1 rotated to: ${newRotation1}° (expected: ${targetRotation1}°)`);
    
    // 7. Navigate back to photo 2
    console.log('\n7. Returning to photo 2...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    const returnRotation2 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 2 rotation: ${returnRotation2}° (should be: ${newRotation2}°)`);
    
    if (returnRotation2 === newRotation2) {
      console.log('   ✅ Photo 2 rotation preserved');
    } else {
      console.log('   ❌ Photo 2 rotation not preserved');
    }
    
    // 8. Close and check thumbnails
    console.log('\n8. Closing lightbox and checking thumbnails...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    
    const thumb1Final = await gridImages[0].getAttribute('src');
    const thumb2Final = await gridImages[1].getAttribute('src');
    
    console.log('   Photo 1 thumbnail:', thumb1Final);
    console.log('   Photo 2 thumbnail:', thumb2Final);
    
    const version1Initial = thumb1Initial.match(/v=(\d+)/)?.[1] || '0';
    const version1Final = thumb1Final.match(/v=(\d+)/)?.[1] || '0';
    const version2Initial = thumb2Initial.match(/v=(\d+)/)?.[1] || '0';
    const version2Final = thumb2Final.match(/v=(\d+)/)?.[1] || '0';
    
    if (version1Final > version1Initial) {
      console.log(`   ✅ Photo 1 thumbnail updated (v${version1Initial} → v${version1Final})`);
    }
    if (version2Final > version2Initial) {
      console.log(`   ✅ Photo 2 thumbnail updated (v${version2Initial} → v${version2Final})`);
    }
    
    // 9. Reopen to verify persistence
    console.log('\n9. Reopening lightbox to verify persistence...');
    await gridImages[0].click();
    await page.waitForTimeout(1500);
    
    style = await container.getAttribute('style');
    const finalRotation1 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 1 reopens with: ${finalRotation1}° (should be: ${newRotation1}°)`);
    
    if (finalRotation1 === newRotation1) {
      console.log('   ✅ Photo 1 rotation persisted correctly');
    } else {
      console.log('   ❌ Photo 1 rotation not persisted');
    }
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    const finalRotation2 = style.match(/rotate\(([-\d]+)deg\)/)?.[1];
    console.log(`   Photo 2 reopens with: ${finalRotation2}° (should be: ${returnRotation2}°)`);
    
    if (finalRotation2 === returnRotation2) {
      console.log('   ✅ Photo 2 rotation persisted correctly');
    } else {
      console.log('   ❌ Photo 2 rotation not persisted');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('\n📊 Test Complete!');
    console.log('\nExpected behavior:');
    console.log('  1. Each photo maintains its own rotation state');
    console.log('  2. Navigation preserves individual rotations');
    console.log('  3. Thumbnails update with version numbers');
    console.log('  4. Rotations persist when reopening lightbox');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\nTest finished. Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
})();