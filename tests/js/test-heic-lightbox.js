const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🖼️ Testing HEIC files in lightbox...\n');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // Find a HEIC image by looking for IMG_0204.HEIC in the hover text
  const heicPhoto = page.locator('img').filter({ has: page.locator('..').filter({ hasText: /IMG_0204\.HEIC/i }) }).first();
  
  // Or just click any image to test
  const firstImage = page.locator('img').first();
  
  if (await firstImage.isVisible()) {
    console.log('✅ Found photos in grid');
    
    // Click to open lightbox
    await firstImage.click();
    await page.waitForTimeout(1000);
    
    // Check if lightbox opened
    const lightboxImage = page.locator('.fixed.inset-0 img').first();
    const lightboxVisible = await lightboxImage.isVisible();
    
    console.log(`✅ Lightbox opened: ${lightboxVisible}`);
    
    if (lightboxVisible) {
      // Get the src of the image
      const imageSrc = await lightboxImage.getAttribute('src');
      console.log(`📸 Image source: ${imageSrc}`);
      
      // Navigate through a few photos to find HEIC files
      console.log('\nNavigating to find HEIC files...');
      
      for (let i = 0; i < 20; i++) {
        // Get current filename if displayed
        const filenameElement = page.locator('.fixed.inset-0').locator('text=/\\.HEIC/i').first();
        if (await filenameElement.isVisible()) {
          const filename = await filenameElement.textContent();
          console.log(`\n✅ Found HEIC file: ${filename}`);
          
          // Check if image loads properly
          const imageLoaded = await lightboxImage.evaluate(img => img.complete && img.naturalHeight !== 0);
          console.log(`✅ HEIC image loaded properly: ${imageLoaded}`);
          
          // Get image dimensions
          const dimensions = await lightboxImage.evaluate(img => ({
            width: img.naturalWidth,
            height: img.naturalHeight
          }));
          console.log(`📐 Image dimensions: ${dimensions.width}x${dimensions.height}`);
          
          break;
        }
        
        // Navigate to next photo
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
      }
      
      // Close lightbox
      await page.keyboard.press('Escape');
      console.log('\n✅ Lightbox closed');
    }
  } else {
    console.log('❌ No photos found in grid');
  }
  
  console.log('\n✨ HEIC lightbox test complete!');
  
  await page.waitForTimeout(2000);
  await browser.close();
})();