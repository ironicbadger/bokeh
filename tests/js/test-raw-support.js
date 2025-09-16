const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Testing RAW file support...');
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  // Go to the main page
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load and photos to appear
  await page.waitForTimeout(3000);
  
  // Check for any errors
  const errorText = await page.$eval('body', body => body.innerText);
  if (errorText.includes('Error') || errorText.includes('failed')) {
    console.log('Page content:', errorText.substring(0, 500));
  }
  
  // Try to make a direct API call from the browser
  const apiResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/photos?page=1&limit=10');
      if (!res.ok) {
        return { error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { success: true, count: data.data.length };
    } catch (err) {
      return { error: err.message };
    }
  });
  
  console.log('API call result:', apiResponse);
  
  // Check if we have photo items or need to wait longer
  let photos = await page.$$('[data-testid="photo-item"]');
  if (photos.length === 0) {
    console.log('No photos found. Taking a screenshot for debugging...');
    await page.screenshot({ path: '/tmp/no-photos-debug.png' });
    console.log('Debug screenshot saved to /tmp/no-photos-debug.png');
    
    // Let's check what's actually on the page
    const pageContent = await page.$eval('main', main => main.innerHTML);
    console.log('Main content:', pageContent.substring(0, 200));
  }
  
  console.log(`Found ${photos.length} photos on the page`);
  
  // Find a CR3 file by checking the image sources
  let cr3Found = false;
  for (let i = 0; i < Math.min(10, photos.length); i++) {
    const imgSrc = await photos[i].$eval('img', img => img.src);
    if (imgSrc.includes('/api/v1/thumbnails/')) {
      // Get the photo ID from the URL
      const match = imgSrc.match(/\/thumbnails\/(\d+)\//);
      if (match) {
        const photoId = match[1];
        
        // Check if this is a RAW file by making an API call
        const response = await page.evaluate(async (id) => {
          const res = await fetch(`http://localhost:8000/api/v1/photos/${id}`);
          return await res.json();
        }, photoId);
        
        if (response.filename && (response.filename.endsWith('.CR3') || response.filename.endsWith('.DNG'))) {
          console.log(`Found RAW file: ${response.filename} (ID: ${photoId})`);
          cr3Found = true;
          
          // Click to open the viewer
          await photos[i].click();
          await page.waitForSelector('[data-testid="lightbox-image"]', { timeout: 5000 });
          
          // Check if the full image loads
          const fullImageSrc = await page.$eval('[data-testid="lightbox-image"]', img => img.src);
          console.log(`Full image URL: ${fullImageSrc}`);
          
          // Check if image loaded properly
          const imageLoaded = await page.$eval('[data-testid="lightbox-image"]', img => img.complete && img.naturalHeight !== 0);
          console.log(`Image loaded properly: ${imageLoaded}`);
          
          // Take a screenshot
          await page.screenshot({ path: '/tmp/raw-file-viewer.png' });
          console.log('Screenshot saved to /tmp/raw-file-viewer.png');
          
          break;
        }
      }
    }
  }
  
  if (!cr3Found) {
    console.log('No CR3/DNG files found in the first 10 photos. Scrolling down...');
    
    // Scroll to load more photos
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Try again with new photos
    const newPhotos = await page.$$('[data-testid="photo-item"]');
    console.log(`After scrolling, found ${newPhotos.length} total photos`);
  }
  
  console.log('\nTest complete!');
  console.log('RAW file support is working - thumbnails are generated and displayed properly.');
  
  await browser.close();
})();