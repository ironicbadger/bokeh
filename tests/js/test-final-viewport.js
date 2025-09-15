const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🖼️  Testing Image Viewport Fit\n');
  console.log('=' .repeat(50));
  
  try {
    // Test with different viewport sizes
    const viewportTests = [
      { width: 1920, height: 1080, name: 'Full HD' },
      { width: 1280, height: 720, name: 'HD' },
      { width: 800, height: 600, name: 'Small' },
    ];
    
    for (const viewport of viewportTests) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
      console.log('-'.repeat(40));
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000');
      await page.waitForTimeout(2000);
      
      // Click first image
      const firstImg = await page.locator('img').first();
      await firstImg.click();
      await page.waitForTimeout(1500);
      
      // Get lightbox image
      const lightboxImg = await page.locator('img[draggable="false"]').first();
      const bounds = await lightboxImg.boundingBox();
      
      if (bounds) {
        console.log(`Image size: ${Math.round(bounds.width)}x${Math.round(bounds.height)}`);
        
        // Check if it fits
        const fitsWidth = bounds.width <= viewport.width;
        const fitsHeight = bounds.height <= viewport.height;
        
        if (fitsWidth && fitsHeight) {
          console.log('✅ Image fits in viewport');
        } else {
          console.log('❌ Image overflows:');
          if (!fitsWidth) console.log(`  Width: ${bounds.width} > ${viewport.width}`);
          if (!fitsHeight) console.log(`  Height: ${bounds.height} > ${viewport.height}`);
        }
        
        // Test rotation
        await page.keyboard.press('r');
        await page.waitForTimeout(1000);
        
        const rotatedBounds = await lightboxImg.boundingBox();
        if (rotatedBounds) {
          console.log(`Rotated: ${Math.round(rotatedBounds.width)}x${Math.round(rotatedBounds.height)}`);
          
          const rotatedFitsWidth = rotatedBounds.width <= viewport.width;
          const rotatedFitsHeight = rotatedBounds.height <= viewport.height;
          
          if (rotatedFitsWidth && rotatedFitsHeight) {
            console.log('✅ Rotated image fits');
          } else {
            console.log('❌ Rotated image overflows');
          }
        }
      }
      
      // Close lightbox
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Viewport fit test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nKeeping browser open for inspection...');
  await page.waitForTimeout(5000);
  await browser.close();
})();