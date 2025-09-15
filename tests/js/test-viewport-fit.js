const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set a specific viewport size
  await page.setViewportSize({ width: 1024, height: 768 });
  
  console.log('Testing image viewport fit...');
  console.log('Viewport size: 1024x768\n');
  
  try {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Wait for images to load
    await page.waitForTimeout(3000);
    
    // Find and click first image
    console.log('Opening first image...');
    const images = await page.locator('img').all();
    if (images.length > 0) {
      await images[0].click();
      await page.waitForTimeout(2000);
      
      // Check if lightbox opened
      const lightbox = await page.locator('.fixed.inset-0').first();
      if (await lightbox.isVisible()) {
        console.log('✓ Lightbox opened\n');
        
        // Get the actual image element in the lightbox
        const lightboxImages = await page.locator('img[draggable="false"]').all();
        if (lightboxImages.length > 0) {
          const img = lightboxImages[0];
          const bounds = await img.boundingBox();
          
          if (bounds) {
            console.log('Image dimensions:');
            console.log(`  Width: ${Math.round(bounds.width)}px`);
            console.log(`  Height: ${Math.round(bounds.height)}px`);
            console.log(`  Position: (${Math.round(bounds.x)}, ${Math.round(bounds.y)})\n`);
            
            // Check fit
            const viewportWidth = 1024;
            const viewportHeight = 768;
            
            if (bounds.width <= viewportWidth && bounds.height <= viewportHeight) {
              console.log('✅ Image fits within viewport!');
            } else {
              console.log('❌ Image overflows viewport');
              if (bounds.width > viewportWidth) {
                console.log(`  Width overflow: ${Math.round(bounds.width - viewportWidth)}px`);
              }
              if (bounds.height > viewportHeight) {
                console.log(`  Height overflow: ${Math.round(bounds.height - viewportHeight)}px`);
              }
            }
            
            // Test rotation
            console.log('\nTesting rotation...');
            await page.keyboard.press('r');
            await page.waitForTimeout(1000);
            
            const rotatedBounds = await img.boundingBox();
            if (rotatedBounds) {
              console.log('Rotated dimensions:');
              console.log(`  Width: ${Math.round(rotatedBounds.width)}px`);
              console.log(`  Height: ${Math.round(rotatedBounds.height)}px`);
              
              if (rotatedBounds.width <= viewportWidth && rotatedBounds.height <= viewportHeight) {
                console.log('✅ Rotated image fits within viewport!');
              } else {
                console.log('❌ Rotated image overflows viewport');
              }
            }
          }
        }
      }
    }
    
    console.log('\nTest complete. Keeping browser open for manual inspection...');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await page.waitForTimeout(10000);
  await browser.close();
})();