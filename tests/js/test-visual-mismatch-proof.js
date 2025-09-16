const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200  // Slow down for visibility
  });
  const page = await browser.newPage();
  
  console.log('Visual Thumbnail-Lightbox Mismatch Proof Test\n');
  console.log('=' .repeat(60));

  // Create screenshots directory
  const screenshotDir = '/tmp/visual-mismatch-proof';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Go to the main page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded, waiting for photos...\n');
    
    // Wait for photos to load
    await page.waitForTimeout(3000);
    
    // Get all thumbnail images
    const thumbnails = await page.$$('img[src*="/api/v1/thumbnails/"]');
    console.log(`Found ${thumbnails.length} thumbnails\n`);
    
    if (thumbnails.length === 0) {
      console.log('No thumbnails found!');
      await browser.close();
      return;
    }
    
    // Results storage
    const results = [];
    const mismatches = [];
    
    // First, specifically test 140A2767.CR3 (ID 490)
    console.log('Looking for 140A2767.CR3 (ID: 490)...');
    let targetIndex = -1;
    
    for (let i = 0; i < thumbnails.length; i++) {
      const src = await thumbnails[i].getAttribute('src');
      if (src && src.includes('/490/')) {
        targetIndex = i;
        console.log(`Found target at index ${i}\n`);
        break;
      }
    }
    
    // Test specific photos
    const indicesToTest = targetIndex >= 0 
      ? [targetIndex, ...Array(24).fill().map((_, i) => Math.floor(Math.random() * thumbnails.length))]
      : Array(25).fill().map((_, i) => Math.floor(Math.random() * thumbnails.length));
    
    console.log('Testing photos...\n');
    console.log('Index | Photo ID | Filename                    | Visual Match');
    console.log('-'.repeat(70));
    
    for (const index of indicesToTest) {
      if (index >= thumbnails.length) continue;
      
      try {
        const thumbnail = thumbnails[index];
        
        // Get thumbnail src
        const thumbSrc = await thumbnail.getAttribute('src');
        const photoIdMatch = thumbSrc.match(/\/(\d+)\//);
        if (!photoIdMatch) continue;
        const photoId = photoIdMatch[1];
        
        // Hover over thumbnail to get filename from tooltip/title
        await thumbnail.hover();
        await page.waitForTimeout(500);
        
        // Try to get filename from various possible sources
        let filename = 'unknown';
        
        // Try title attribute
        const title = await thumbnail.getAttribute('title');
        if (title) filename = title;
        
        // Try alt attribute
        const alt = await thumbnail.getAttribute('alt');
        if (alt && alt !== 'Photo' && alt !== '') filename = alt;
        
        // Try to find tooltip
        const tooltip = await page.$('.tooltip, [role="tooltip"], .MuiTooltip-tooltip');
        if (tooltip) {
          const tooltipText = await tooltip.textContent();
          if (tooltipText) filename = tooltipText;
        }
        
        // Take screenshot of thumbnail
        const thumbBounds = await thumbnail.boundingBox();
        if (thumbBounds) {
          const thumbScreenshot = await page.screenshot({
            clip: thumbBounds
          });
          fs.writeFileSync(path.join(screenshotDir, `${photoId}_thumb.png`), thumbScreenshot);
        }
        
        // Click to open lightbox
        await thumbnail.click({ force: true });
        
        // Wait for lightbox
        try {
          await page.waitForSelector('[data-testid="lightbox-image"], .lightbox-image, .full-image, img[src*="/full"]', { timeout: 3000 });
          await page.waitForTimeout(1500); // Let image load
        } catch (e) {
          console.log(`${index.toString().padStart(5)} | ${photoId.padEnd(8)} | ${filename.padEnd(27)} | ❌ Lightbox failed`);
          // Try to close any open modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          continue;
        }
        
        // Get lightbox image
        const lightboxImg = await page.$('[data-testid="lightbox-image"], .lightbox-image, .full-image, img[src*="/full"]');
        
        if (lightboxImg) {
          // Take screenshot of lightbox
          const lightboxBounds = await lightboxImg.boundingBox();
          if (lightboxBounds) {
            const lightboxScreenshot = await page.screenshot({
              clip: lightboxBounds
            });
            fs.writeFileSync(path.join(screenshotDir, `${photoId}_lightbox.png`), lightboxScreenshot);
          }
          
          // Get image dimensions from the page
          const dimensions = await page.evaluate((img) => {
            const element = document.querySelector('[data-testid="lightbox-image"], .lightbox-image, .full-image, img[src*="/full"]');
            if (element) {
              return {
                thumb: { width: img.naturalWidth, height: img.naturalHeight },
                lightbox: { width: element.naturalWidth, height: element.naturalHeight }
              };
            }
            return null;
          }, thumbnail);
          
          if (dimensions) {
            const thumbAspect = (dimensions.thumb.width / dimensions.thumb.height).toFixed(3);
            const lightboxAspect = (dimensions.lightbox.width / dimensions.lightbox.height).toFixed(3);
            const match = thumbAspect === lightboxAspect;
            
            const isTarget = photoId === '490' || filename.includes('140A2767');
            const prefix = isTarget ? '>>> ' : '';
            const symbol = match ? '✅' : '❌';
            
            console.log(`${prefix}${index.toString().padStart(5)} | ${photoId.padEnd(8)} | ${filename.padEnd(27)} | ${symbol}`);
            
            if (!match) {
              mismatches.push({
                index,
                photoId,
                filename,
                thumbAspect,
                lightboxAspect,
                thumbDimensions: dimensions.thumb,
                lightboxDimensions: dimensions.lightbox
              });
            }
            
            results.push({ photoId, filename, match, isTarget });
          }
        }
        
        // Close lightbox
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } catch (error) {
        console.log(`Error testing index ${index}: ${error.message}`);
        // Make sure to close any open lightbox
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    const matches = results.filter(r => r.match).length;
    const total = results.length;
    
    console.log(`Total tested: ${total}`);
    console.log(`✅ Visual matches: ${matches} (${(matches/total*100).toFixed(1)}%)`);
    console.log(`❌ Visual mismatches: ${mismatches.length} (${(mismatches.length/total*100).toFixed(1)}%)`);
    
    if (mismatches.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('MISMATCHED PHOTOS - PROOF OF PROBLEM');
      console.log('='.repeat(60));
      mismatches.forEach(m => {
        console.log(`\nPhoto ID ${m.photoId}: ${m.filename}`);
        console.log(`  Thumbnail:  ${m.thumbDimensions.width}x${m.thumbDimensions.height} (aspect: ${m.thumbAspect})`);
        console.log(`  Lightbox:   ${m.lightboxDimensions.width}x${m.lightboxDimensions.height} (aspect: ${m.lightboxAspect})`);
      });
    }
    
    // Check specific target
    const targetResult = results.find(r => r.isTarget);
    if (targetResult) {
      console.log('\n' + '='.repeat(60));
      console.log('TARGET: 140A2767.CR3');
      console.log('='.repeat(60));
      if (targetResult.match) {
        console.log('✅ Visual match - thumbnail and lightbox show same image');
      } else {
        console.log('❌ VISUAL MISMATCH - thumbnail and lightbox show DIFFERENT images!');
        const mismatch = mismatches.find(m => m.photoId === '490');
        if (mismatch) {
          console.log(`  This proves the problem exists!`);
          console.log(`  Thumbnail aspect: ${mismatch.thumbAspect}`);
          console.log(`  Lightbox aspect: ${mismatch.lightboxAspect}`);
        }
      }
    }
    
    console.log(`\nScreenshots saved to: ${screenshotDir}`);
    console.log('You can visually compare the PNG files to see the differences.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest complete!');
})();