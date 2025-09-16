const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Testing thumbnail-lightbox consistency for 100 random images...\n');
  
  // Go to the main page
  await page.goto('http://localhost:3000');
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  // First, get all photos from API to know the total count
  const allPhotos = await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/photos?page=1&limit=1000');
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      return [];
    }
  });
  
  const totalPhotos = allPhotos.length;
  
  console.log(`Total photos in library: ${totalPhotos}`);
  
  if (totalPhotos === 0) {
    console.log('No photos found in library. Exiting...');
    await browser.close();
    return;
  }
  
  // Generate 100 random photo IDs (or less if library is smaller)
  const samplesToTest = Math.min(100, totalPhotos);
  const randomIds = new Set();
  
  // Shuffle and pick random photos
  const shuffled = [...allPhotos].sort(() => Math.random() - 0.5);
  for (let i = 0; i < samplesToTest; i++) {
    randomIds.add(shuffled[i].id);
  }
  
  console.log(`Testing ${samplesToTest} random photos...\n`);
  
  let successCount = 0;
  let failureCount = 0;
  const failures = [];
  
  // Test each random photo
  for (const photoId of randomIds) {
    try {
      // Get photo info from API
      const photoInfo = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/photos/${id}`);
          if (!res.ok) return null;
          return await res.json();
        } catch (err) {
          return null;
        }
      }, photoId);
      
      if (!photoInfo) {
        console.log(`❌ Photo ID ${photoId}: Not found`);
        failureCount++;
        continue;
      }
      
      // Load thumbnail URL
      const thumbnailUrl = `http://localhost:8000/api/v1/thumbnails/${photoId}/400`;
      const fullImageUrl = `http://localhost:8000/api/v1/thumbnails/${photoId}/full`;
      
      // Check if thumbnail loads
      const thumbnailResponse = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          return { ok: res.ok, status: res.status };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }, thumbnailUrl);
      
      if (!thumbnailResponse.ok) {
        console.log(`❌ Photo ID ${photoId} (${photoInfo.filename}): Thumbnail failed to load`);
        failureCount++;
        failures.push({
          id: photoId,
          filename: photoInfo.filename,
          error: 'Thumbnail not accessible'
        });
        continue;
      }
      
      // Check if full image loads
      const fullImageResponse = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          return { ok: res.ok, status: res.status };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }, fullImageUrl);
      
      if (!fullImageResponse.ok) {
        console.log(`❌ Photo ID ${photoId} (${photoInfo.filename}): Full image failed to load`);
        failureCount++;
        failures.push({
          id: photoId,
          filename: photoInfo.filename,
          error: 'Full image not accessible'
        });
        continue;
      }
      
      // Now navigate to the photo directly and verify it opens in lightbox
      await page.goto(`http://localhost:3000/?photoId=${photoId}`);
      await page.waitForTimeout(1000);
      
      // Check if we need to open the lightbox manually
      const lightboxImage = await page.$('[data-testid="lightbox-image"]');
      if (!lightboxImage) {
        // Try to find and click the first photo
        const photoItem = await page.$('[data-testid="photo-item"]');
        if (photoItem) {
          await photoItem.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Verify lightbox image loads
      const lightboxLoaded = await page.evaluate(() => {
        const img = document.querySelector('[data-testid="lightbox-image"]');
        if (!img) return false;
        return img.complete && img.naturalHeight !== 0;
      });
      
      if (lightboxLoaded) {
        // Get the actual src from the lightbox
        const lightboxSrc = await page.$eval('[data-testid="lightbox-image"]', img => img.src);
        
        // Verify it's pointing to the correct photo
        if (lightboxSrc.includes(`/${photoId}/`)) {
          console.log(`✅ Photo ID ${photoId} (${photoInfo.filename}): Thumbnail and lightbox match`);
          successCount++;
        } else {
          console.log(`⚠️  Photo ID ${photoId} (${photoInfo.filename}): Lightbox showing different image`);
          failureCount++;
          failures.push({
            id: photoId,
            filename: photoInfo.filename,
            error: 'Lightbox showing wrong image'
          });
        }
      } else {
        console.log(`❌ Photo ID ${photoId} (${photoInfo.filename}): Lightbox image failed to load`);
        failureCount++;
        failures.push({
          id: photoId,
          filename: photoInfo.filename,
          error: 'Lightbox image not loading'
        });
      }
      
      // Close lightbox if open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
    } catch (error) {
      console.log(`❌ Photo ID ${photoId}: Test error - ${error.message}`);
      failureCount++;
    }
    
    // Progress indicator every 10 photos
    if ((successCount + failureCount) % 10 === 0) {
      console.log(`\nProgress: ${successCount + failureCount}/${samplesToTest} tested...\n`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tested: ${samplesToTest}`);
  console.log(`✅ Successful: ${successCount} (${(successCount/samplesToTest*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failureCount} (${(failureCount/samplesToTest*100).toFixed(1)}%)`);
  
  if (failures.length > 0) {
    console.log('\nFailed photos:');
    failures.slice(0, 10).forEach(f => {
      console.log(`  - ID ${f.id}: ${f.filename} - ${f.error}`);
    });
    if (failures.length > 10) {
      console.log(`  ... and ${failures.length - 10} more`);
    }
  }
  
  // Test specific RAW formats if present
  console.log('\n' + '='.repeat(60));
  console.log('RAW FORMAT CHECK');
  console.log('='.repeat(60));
  
  const rawFormats = ['CR3', 'CR2', 'NEF', 'ARW', 'DNG', 'RAF', 'ORF'];
  for (const format of rawFormats) {
    const rawPhotos = await page.evaluate(async (ext) => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/photos?page=1&limit=1000`);
        const data = await res.json();
        return data.data.filter(p => p.filename.toUpperCase().endsWith(`.${ext}`)).slice(0, 3);
      } catch (err) {
        return [];
      }
    }, format);
    
    if (rawPhotos.length > 0) {
      console.log(`\n${format} files found: ${rawPhotos.length}`);
      for (const photo of rawPhotos) {
        const thumbnailCheck = await page.evaluate(async (id) => {
          const res = await fetch(`http://localhost:8000/api/v1/thumbnails/${id}/400`);
          return res.ok;
        }, photo.id);
        
        const fullCheck = await page.evaluate(async (id) => {
          const res = await fetch(`http://localhost:8000/api/v1/thumbnails/${id}/full`);
          return res.ok;
        }, photo.id);
        
        if (thumbnailCheck && fullCheck) {
          console.log(`  ✅ ${photo.filename}: Both thumbnail and full image work`);
        } else if (thumbnailCheck && !fullCheck) {
          console.log(`  ⚠️  ${photo.filename}: Thumbnail works, full image fails`);
        } else {
          console.log(`  ❌ ${photo.filename}: Failed`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  
  await browser.close();
})();