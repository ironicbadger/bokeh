const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function compareImages(page, thumbnailBuffer, lightboxBuffer, photoId, filename) {
  // Use Playwright's built-in screenshot comparison
  // For now, we'll compare dimensions and file sizes as a basic check
  // A more sophisticated approach would use image similarity algorithms
  
  const thumbSize = thumbnailBuffer.length;
  const lightboxSize = lightboxBuffer.length;
  
  // Get image dimensions using page.evaluate
  const thumbDimensions = await page.evaluate((buffer) => {
    return new Promise((resolve) => {
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.src = url;
    });
  }, thumbnailBuffer);
  
  const lightboxDimensions = await page.evaluate((buffer) => {
    return new Promise((resolve) => {
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.src = url;
    });
  }, lightboxBuffer);
  
  // Calculate aspect ratios
  const thumbAspect = (thumbDimensions.width / thumbDimensions.height).toFixed(3);
  const lightboxAspect = (lightboxDimensions.width / lightboxDimensions.height).toFixed(3);
  
  const match = thumbAspect === lightboxAspect;
  
  return {
    match,
    thumbDimensions,
    lightboxDimensions,
    thumbAspect,
    lightboxAspect,
    thumbSize,
    lightboxSize
  };
}

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100  // Slow down for visibility
  });
  const page = await browser.newPage();
  
  console.log('Visual Thumbnail-Lightbox Comparison Test\n');
  console.log('=' .repeat(60));

  // Create screenshots directory
  const screenshotDir = '/tmp/thumbnail-comparison';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Go to the main page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Loaded main page, waiting for photos...\n');
    
    // Wait a bit for React to render
    await page.waitForTimeout(5000);
    
    // Try different selectors if data-testid doesn't exist
    let photoItems = await page.$$('[data-testid="photo-item"]');
    let usingImageTags = false;
    
    if (photoItems.length === 0) {
      console.log('No photo-items with data-testid, trying img tags...');
      // Try to find images in a grid or masonry layout
      const images = await page.$$('img[src*="/api/v1/thumbnails/"]');
      
      if (images.length > 0) {
        // Wrap images in their parent containers for clicking
        photoItems = images;
        usingImageTags = true;
        console.log(`Found ${images.length} thumbnail images\n`);
      } else {
        // Take a debug screenshot
        await page.screenshot({ path: '/tmp/debug-no-photos.png' });
        console.log('Debug screenshot saved to /tmp/debug-no-photos.png');
        
        // Log what's on the page
        const bodyText = await page.$eval('body', el => el.innerText);
        console.log('Page content:', bodyText.substring(0, 500));
      }
    }
    
    console.log(`Found ${photoItems.length} photos on the page\n`);
    
    if (photoItems.length === 0) {
      console.log('No photos found! Check if the frontend is working correctly.');
      await browser.close();
      return;
    }
    
    // First, specifically test 140A2767.CR3 if we can find it
    console.log('Looking for specific photo: 140A2767.CR3 (ID: 490)...');
    
    // Scroll to load more photos if needed to find our target
    let targetFound = false;
    let scrollAttempts = 0;
    while (!targetFound && scrollAttempts < 10) {
      const foundTarget = await page.evaluate(() => {
        const images = document.querySelectorAll('[data-testid="photo-item"] img');
        for (let img of images) {
          if (img.src && img.src.includes('/490/')) {
            return true;
          }
        }
        return false;
      });
      
      if (foundTarget) {
        targetFound = true;
        console.log('Found target photo 140A2767.CR3!\n');
      } else {
        // Scroll down to load more
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await page.waitForTimeout(1500);
        scrollAttempts++;
      }
    }
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // Test up to 25 photos
    const photosToTest = Math.min(25, photoItems.length);
    const results = [];
    
    console.log(`Testing ${photosToTest} photos...\n`);
    console.log('Photo ID | Filename                    | Match | Thumb Aspect | Lightbox Aspect');
    console.log('-'.repeat(80));
    
    for (let i = 0; i < photosToTest; i++) {
      try {
        // Re-query photo items in case DOM changed
        let currentPhotoItems;
        let thumbnailImg;
        
        if (usingImageTags) {
          // Using direct image tags
          currentPhotoItems = await page.$$('img[src*="/api/v1/thumbnails/"]');
          if (i >= currentPhotoItems.length) break;
          thumbnailImg = currentPhotoItems[i];
        } else {
          // Using photo-item containers
          currentPhotoItems = await page.$$('[data-testid="photo-item"]');
          if (i >= currentPhotoItems.length) break;
          const photoItem = currentPhotoItems[i];
          thumbnailImg = await photoItem.$('img');
          if (!thumbnailImg) continue;
        }
        
        // Get thumbnail src and extract photo ID
        const thumbSrc = await thumbnailImg.getAttribute('src');
        const photoIdMatch = thumbSrc.match(/\/(\d+)\//);
        if (!photoIdMatch) continue;
        
        const photoId = photoIdMatch[1];
        
        // Take screenshot of thumbnail
        const thumbnailScreenshot = await thumbnailImg.screenshot();
        fs.writeFileSync(path.join(screenshotDir, `${photoId}_thumb.png`), thumbnailScreenshot);
        
        // Click to open lightbox
        if (usingImageTags) {
          // Click the image directly
          await thumbnailImg.click();
        } else {
          // Click the photo item container
          const photoItem = currentPhotoItems[i];
          await photoItem.click();
        }
        
        // Wait for lightbox to open
        await page.waitForSelector('[data-testid="lightbox-image"]', { timeout: 5000 });
        await page.waitForTimeout(1000); // Let image fully load
        
        // Get the lightbox image
        const lightboxImg = await page.$('[data-testid="lightbox-image"]');
        
        // Take screenshot of lightbox image
        const lightboxScreenshot = await lightboxImg.screenshot();
        fs.writeFileSync(path.join(screenshotDir, `${photoId}_lightbox.png`), lightboxScreenshot);
        
        // Get actual image sources for comparison
        const lightboxSrc = await lightboxImg.getAttribute('src');
        
        // Download actual images for comparison
        const thumbResponse = await page.evaluate(async (src) => {
          const response = await fetch(src);
          const buffer = await response.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        }, thumbSrc);
        
        const lightboxResponse = await page.evaluate(async (src) => {
          const response = await fetch(src);
          const buffer = await response.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        }, lightboxSrc);
        
        const thumbBuffer = Buffer.from(thumbResponse);
        const lightboxBuffer = Buffer.from(lightboxResponse);
        
        // Compare images
        const comparison = await compareImages(page, thumbBuffer, lightboxBuffer, photoId, 'unknown');
        
        // Get filename from info panel if available
        let filename = 'unknown';
        try {
          // Try to open info panel
          await page.keyboard.press('i');
          await page.waitForTimeout(500);
          
          const filenameElement = await page.$('[data-testid="info-filename"]');
          if (filenameElement) {
            filename = await filenameElement.textContent();
          }
          
          // Close info panel
          await page.keyboard.press('i');
        } catch (e) {
          // Info panel might not be available
        }
        
        // Special attention to our target
        const isTarget = photoId === '490' || filename.includes('140A2767');
        const prefix = isTarget ? '>>> ' : '    ';
        const matchSymbol = comparison.match ? '✅' : '❌';
        
        console.log(`${prefix}${photoId.padEnd(8)} | ${filename.padEnd(27)} | ${matchSymbol}    | ${comparison.thumbAspect.padEnd(12)} | ${comparison.lightboxAspect}`);
        
        if (isTarget) {
          console.log(`    Thumb: ${comparison.thumbDimensions.width}x${comparison.thumbDimensions.height}`);
          console.log(`    Lightbox: ${comparison.lightboxDimensions.width}x${comparison.lightboxDimensions.height}`);
        }
        
        results.push({
          photoId,
          filename,
          ...comparison
        });
        
        // Close lightbox
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } catch (error) {
        console.log(`    Error testing photo ${i}: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    const matches = results.filter(r => r.match).length;
    const mismatches = results.filter(r => !r.match).length;
    
    console.log(`Total tested: ${results.length}`);
    console.log(`✅ Matches: ${matches} (${(matches/results.length*100).toFixed(1)}%)`);
    console.log(`❌ Mismatches: ${mismatches} (${(mismatches/results.length*100).toFixed(1)}%)`);
    
    if (mismatches > 0) {
      console.log('\nMismatched photos:');
      results.filter(r => !r.match).forEach(r => {
        console.log(`  - Photo ${r.photoId}: ${r.filename}`);
        console.log(`    Thumbnail aspect: ${r.thumbAspect}, Lightbox aspect: ${r.lightboxAspect}`);
      });
    }
    
    // Check our specific target
    const targetResult = results.find(r => r.photoId === '490' || r.filename.includes('140A2767'));
    if (targetResult) {
      console.log('\n' + '='.repeat(60));
      console.log('TARGET PHOTO: 140A2767.CR3');
      console.log('='.repeat(60));
      if (targetResult.match) {
        console.log('✅ MATCH - Thumbnail and lightbox show the same image');
      } else {
        console.log('❌ MISMATCH - Thumbnail and lightbox show different images!');
        console.log(`   Thumbnail: ${targetResult.thumbDimensions.width}x${targetResult.thumbDimensions.height} (aspect: ${targetResult.thumbAspect})`);
        console.log(`   Lightbox: ${targetResult.lightboxDimensions.width}x${targetResult.lightboxDimensions.height} (aspect: ${targetResult.lightboxAspect})`);
      }
    }
    
    console.log(`\nScreenshots saved to: ${screenshotDir}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest complete!');
})();