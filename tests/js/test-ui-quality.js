const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing Photo Grid UI Quality...');
  await page.goto('http://localhost:3000');
  
  // Wait for photos to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot to see the current state
  await page.screenshot({ path: 'tests/js/grid-screenshot.png', fullPage: true });
  console.log('Screenshot saved to tests/js/grid-screenshot.png');
  
  // Check if status bar is visible and not overlapped
  const statusBar = await page.locator('.fixed.bottom-0').first();
  const statusBarBounds = await statusBar.boundingBox();
  console.log('Status bar position:', statusBarBounds);
  
  // Check photo grid container
  const photoGrid = await page.locator('.grid').first();
  const gridBounds = await photoGrid.boundingBox();
  console.log('Photo grid bounds:', gridBounds);
  
  // Check if grid overlaps status bar
  if (gridBounds && statusBarBounds) {
    const gridBottom = gridBounds.y + gridBounds.height;
    const statusBarTop = statusBarBounds.y;
    
    if (gridBottom > statusBarTop) {
      console.log('⚠️  WARNING: Photo grid overlaps status bar!');
      console.log(`Grid bottom: ${gridBottom}, Status bar top: ${statusBarTop}`);
    } else {
      console.log('✓ No overlap detected');
    }
  }
  
  // Check thumbnail quality by examining actual image elements
  const thumbnails = await page.locator('img[id^="photo-"]').all();
  console.log(`Found ${thumbnails.length} thumbnail images`);
  
  if (thumbnails.length > 0) {
    // Check first few thumbnails
    for (let i = 0; i < Math.min(3, thumbnails.length); i++) {
      const thumb = thumbnails[i];
      const src = await thumb.getAttribute('src');
      const naturalWidth = await thumb.evaluate(el => el.naturalWidth);
      const naturalHeight = await thumb.evaluate(el => el.naturalHeight);
      const displayWidth = await thumb.evaluate(el => el.offsetWidth);
      const displayHeight = await thumb.evaluate(el => el.offsetHeight);
      
      console.log(`Thumbnail ${i + 1}:`);
      console.log(`  Source: ${src}`);
      console.log(`  Natural size: ${naturalWidth}x${naturalHeight}`);
      console.log(`  Display size: ${displayWidth}x${displayHeight}`);
      
      if (naturalWidth === 0 || naturalHeight === 0) {
        console.log('  ⚠️  Image failed to load or has no size!');
      }
    }
  }
  
  // Check viewport and scrolling
  const viewportSize = page.viewportSize();
  console.log('Viewport size:', viewportSize);
  
  // Scroll to bottom to check if content goes under status bar
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'tests/js/grid-scrolled-screenshot.png', fullPage: false });
  console.log('Scrolled screenshot saved to tests/js/grid-scrolled-screenshot.png');
  
  await page.waitForTimeout(5000); // Keep browser open for manual inspection
  
  await browser.close();
})();