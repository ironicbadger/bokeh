const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set a specific viewport size to test
  await page.setViewportSize({ width: 1280, height: 720 });
  
  console.log('Testing image fit to viewport...');
  console.log('Viewport: 1280x720\n');
  
  try {
    // Navigate to homepage
    console.log('1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Open first image
    console.log('2. Opening first image in lightbox...');
    const firstPhoto = await page.locator('img[alt]').first();
    await firstPhoto.click();
    await page.waitForTimeout(1500);
    
    // Get the image element
    const lightboxImage = await page.locator('img[draggable="false"]').first();
    
    // Get image dimensions
    const imageBounds = await lightboxImage.boundingBox();
    console.log('\n3. Image dimensions:');
    console.log(`   Width: ${imageBounds.width}px`);
    console.log(`   Height: ${imageBounds.height}px`);
    console.log(`   X: ${imageBounds.x}px`);
    console.log(`   Y: ${imageBounds.y}px`);
    
    // Check if image fits in viewport
    const viewportWidth = 1280;
    const viewportHeight = 720;
    
    console.log('\n4. Viewport fit check:');
    if (imageBounds.width <= viewportWidth) {
      console.log(`   ✓ Width fits (${imageBounds.width} <= ${viewportWidth})`);
    } else {
      console.log(`   ✗ Width overflows (${imageBounds.width} > ${viewportWidth})`);
    }
    
    if (imageBounds.height <= viewportHeight) {
      console.log(`   ✓ Height fits (${imageBounds.height} <= ${viewportHeight})`);
    } else {
      console.log(`   ✗ Height overflows (${imageBounds.height} > ${viewportHeight})`);
    }
    
    // Check if image is visible (not cut off)
    if (imageBounds.x >= 0) {
      console.log(`   ✓ Not cut off on left (x: ${imageBounds.x})`);
    } else {
      console.log(`   ✗ Cut off on left (x: ${imageBounds.x})`);
    }
    
    if (imageBounds.y >= 0) {
      console.log(`   ✓ Not cut off on top (y: ${imageBounds.y})`);
    } else {
      console.log(`   ✗ Cut off on top (y: ${imageBounds.y})`);
    }
    
    // Test with zoom
    console.log('\n5. Testing with zoom...');
    await page.keyboard.press('+');
    await page.waitForTimeout(500);
    
    const zoomedBounds = await lightboxImage.boundingBox();
    console.log(`   Zoomed width: ${zoomedBounds.width}px`);
    console.log(`   Zoomed height: ${zoomedBounds.height}px`);
    
    // Reset zoom
    await page.keyboard.press('-');
    await page.waitForTimeout(500);
    
    // Navigate to next photo
    console.log('\n6. Testing with different image...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const nextImageBounds = await lightboxImage.boundingBox();
    console.log(`   Width: ${nextImageBounds.width}px`);
    console.log(`   Height: ${nextImageBounds.height}px`);
    
    if (nextImageBounds.width <= viewportWidth && nextImageBounds.height <= viewportHeight) {
      console.log('   ✓ Second image also fits in viewport');
    }
    
    // Test with rotation
    console.log('\n7. Testing with rotation...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    
    const rotatedBounds = await lightboxImage.boundingBox();
    console.log(`   Rotated width: ${rotatedBounds.width}px`);
    console.log(`   Rotated height: ${rotatedBounds.height}px`);
    
    if (rotatedBounds.width <= viewportWidth && rotatedBounds.height <= viewportHeight) {
      console.log('   ✓ Rotated image still fits in viewport');
    } else {
      console.log('   ✗ Rotated image overflows viewport');
    }
    
    // Test with smaller viewport
    console.log('\n8. Testing with smaller viewport (800x600)...');
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    
    const smallViewportBounds = await lightboxImage.boundingBox();
    console.log(`   Width: ${smallViewportBounds.width}px`);
    console.log(`   Height: ${smallViewportBounds.height}px`);
    
    if (smallViewportBounds.width <= 800 && smallViewportBounds.height <= 600) {
      console.log('   ✓ Image adapts to smaller viewport');
    } else {
      console.log('   ✗ Image overflows smaller viewport');
    }
    
    console.log('\n✅ Image fit test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\nKeeping browser open for manual inspection...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();