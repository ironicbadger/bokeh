const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  const page = await browser.newPage();
  
  console.log('Visual Content Comparison Test\n');
  console.log('Testing if thumbnails and lightbox show the SAME photo content\n');
  console.log('=' .repeat(60));

  try {
    // Go to the main page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Find photo 490 (140A2767.CR3)
    console.log('Looking for 140A2767.CR3 (ID: 490)...\n');
    
    // Scroll to find it
    let found = false;
    for (let i = 0; i < 10; i++) {
      const thumb490 = await page.$('img[src*="/490/"]');
      if (thumb490) {
        found = true;
        console.log('Found photo 490!');
        
        // Get the thumbnail element's position
        const box = await thumb490.boundingBox();
        
        // Take a screenshot of just the thumbnail
        const thumbScreenshot = await page.screenshot({
          clip: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        });
        
        // Save thumbnail screenshot
        fs.writeFileSync('/tmp/490_thumbnail_content.png', thumbScreenshot);
        console.log('Saved thumbnail screenshot to /tmp/490_thumbnail_content.png');
        
        // Get thumbnail natural dimensions
        const thumbInfo = await thumb490.evaluate(img => ({
          src: img.src,
          displayed: { width: img.width, height: img.height },
          natural: { width: img.naturalWidth, height: img.naturalHeight }
        }));
        
        console.log('\nThumbnail info:');
        console.log(`  Source: ${thumbInfo.src}`);
        console.log(`  Natural size: ${thumbInfo.natural.width}x${thumbInfo.natural.height}`);
        console.log(`  Displayed size: ${thumbInfo.displayed.width}x${thumbInfo.displayed.height}`);
        
        // Click to open lightbox
        await thumb490.click();
        
        // Wait for lightbox - try multiple possible selectors
        await page.waitForTimeout(2000); // Let lightbox open
        
        // Try different selectors for the lightbox image
        let lightboxImg = await page.$('[data-testid="lightbox-image"]');
        if (!lightboxImg) {
          lightboxImg = await page.$('img[src*="/full"]');
        }
        if (!lightboxImg) {
          // Look for the largest image on the page
          const allImages = await page.$$('img');
          for (const img of allImages) {
            const src = await img.getAttribute('src');
            if (src && (src.includes('/full') || src.includes('/1200'))) {
              lightboxImg = img;
              break;
            }
          }
        }
        if (!lightboxImg) {
          // Last resort - find image in a modal/overlay
          lightboxImg = await page.$('.fixed img, .modal img, .lightbox img, [role="dialog"] img');
        }
        if (lightboxImg) {
          // Get lightbox info
          const lightboxInfo = await lightboxImg.evaluate(img => ({
            src: img.src,
            displayed: { width: img.width, height: img.height },
            natural: { width: img.naturalWidth, height: img.naturalHeight }
          }));
          
          console.log('\nLightbox info:');
          console.log(`  Source: ${lightboxInfo.src}`);
          console.log(`  Natural size: ${lightboxInfo.natural.width}x${lightboxInfo.natural.height}`);
          console.log(`  Displayed size: ${lightboxInfo.displayed.width}x${lightboxInfo.displayed.height}`);
          
          // Take screenshot of lightbox
          const lightboxBox = await lightboxImg.boundingBox();
          const lightboxScreenshot = await page.screenshot({
            clip: {
              x: lightboxBox.x,
              y: lightboxBox.y,
              width: lightboxBox.width,
              height: lightboxBox.height
            }
          });
          
          fs.writeFileSync('/tmp/490_lightbox_content.png', lightboxScreenshot);
          console.log('Saved lightbox screenshot to /tmp/490_lightbox_content.png');
          
          // Analysis
          console.log('\n' + '=' .repeat(60));
          console.log('ANALYSIS');
          console.log('=' .repeat(60));
          
          const thumbAspect = (thumbInfo.natural.width / thumbInfo.natural.height).toFixed(6);
          const lightboxAspect = (lightboxInfo.natural.width / lightboxInfo.natural.height).toFixed(6);
          
          console.log(`\nAspect ratios:`);
          console.log(`  Thumbnail: ${thumbAspect}`);
          console.log(`  Lightbox:  ${lightboxAspect}`);
          
          const aspectDiff = Math.abs(parseFloat(thumbAspect) - parseFloat(lightboxAspect));
          if (aspectDiff < 0.01) {
            console.log(`  Difference: ${aspectDiff.toFixed(6)} (negligible - just resize rounding)`);
          } else {
            console.log(`  Difference: ${aspectDiff.toFixed(6)} (significant - may be different images)`);
          }
          
          console.log('\n' + '=' .repeat(60));
          console.log('VISUAL INSPECTION NEEDED');
          console.log('=' .repeat(60));
          console.log('\nPlease visually compare these two files:');
          console.log('  1. /tmp/490_thumbnail_content.png');
          console.log('  2. /tmp/490_lightbox_content.png');
          console.log('\nDo they show the SAME photo content (same scene/subject)?');
          console.log('Or are they DIFFERENT photos entirely?');
          console.log('\nThe aspect ratio difference of ~0.002 suggests they are');
          console.log('the SAME photo, just with slight rounding differences from resizing.');
        }
        
        break;
      } else {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(1000);
      }
    }
    
    if (!found) {
      console.log('Could not find photo 490. It may not be loaded yet.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest complete!');
})();