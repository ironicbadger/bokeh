const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console for debugging
  page.on('console', msg => {
    if (msg.text().includes('rotation') || msg.text().includes('Rotation')) {
      console.log('Console:', msg.text());
    }
  });
  
  console.log('🔍 Detailed Rotation State Test\n');
  console.log('=' .repeat(50));
  
  try {
    // Load grid
    console.log('\n1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Open first image
    console.log('\n2. Opening first image...');
    const images = await page.locator('img[alt]').all();
    await images[0].click();
    await page.waitForTimeout(1500);
    
    // Check initial state
    const container = await page.locator('div[style*="transform"][style*="scale"]').first();
    let style = await container.getAttribute('style');
    console.log('   First image initial:', style);
    
    // Rotate first image twice (to 180°)
    console.log('\n3. Rotating first image to 180°...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    style = await container.getAttribute('style');
    console.log('   First image after 2 rotations:', style);
    const firstImageRotation = style.match(/rotate\((\d+)deg\)/)?.[1];
    console.log('   Extracted rotation:', firstImageRotation + '°');
    
    // Navigate to second image
    console.log('\n4. Navigating to second image...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    console.log('   Second image initial:', style);
    const secondImageInitial = style.match(/rotate\((\d+)deg\)/)?.[1];
    
    if (secondImageInitial === '0') {
      console.log('   ✓ Second image starts at 0° (correct)');
    } else {
      console.log(`   ✗ Second image starts at ${secondImageInitial}° (should be 0°)`);
    }
    
    // Rotate second image once (to 90°)
    console.log('\n5. Rotating second image to 90°...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    style = await container.getAttribute('style');
    console.log('   Second image after rotation:', style);
    const secondImageRotation = style.match(/rotate\((\d+)deg\)/)?.[1];
    
    if (secondImageRotation === '90') {
      console.log('   ✓ Second image at 90° (correct)');
    } else {
      console.log(`   ✗ Second image at ${secondImageRotation}° (should be 90°)`);
    }
    
    // Go back to first image
    console.log('\n6. Going back to first image...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    console.log('   First image on return:', style);
    const firstImageReturn = style.match(/rotate\((\d+)deg\)/)?.[1];
    
    if (firstImageReturn === firstImageRotation) {
      console.log(`   ✓ First image still at ${firstImageReturn}° (preserved)`);
    } else {
      console.log(`   ✗ First image now at ${firstImageReturn}° (was ${firstImageRotation}°)`);
    }
    
    // Navigate forward to second image again
    console.log('\n7. Going forward to second image again...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    console.log('   Second image on return:', style);
    const secondImageReturn = style.match(/rotate\((\d+)deg\)/)?.[1];
    
    if (secondImageReturn === '90') {
      console.log('   ✓ Second image still at 90° (preserved)');
    } else {
      console.log(`   ✗ Second image now at ${secondImageReturn}° (should be 90°)`);
    }
    
    // Navigate to third image
    console.log('\n8. Going to third image (unrotated)...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    style = await container.getAttribute('style');
    console.log('   Third image initial:', style);
    const thirdImageRotation = style.match(/rotate\((\d+)deg\)/)?.[1];
    
    if (thirdImageRotation === '0') {
      console.log('   ✓ Third image at 0° (correct)');
    } else {
      console.log(`   ✗ Third image at ${thirdImageRotation}° (should be 0°)`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('\nSummary:');
    console.log('Each image should maintain its own rotation state');
    console.log('Navigation should preserve individual rotations');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\nKeeping browser open for inspection...');
  await page.waitForTimeout(10000);
  await browser.close();
})();