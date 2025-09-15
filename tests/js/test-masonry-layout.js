const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing Masonry Layout...');
  await page.goto('http://localhost:3000');
  
  // Wait for photos to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot to see the masonry layout
  await page.screenshot({ path: 'tests/js/masonry-screenshot.png', fullPage: true });
  console.log('Screenshot saved to tests/js/masonry-screenshot.png');
  
  // Check if masonry container exists
  const masonryContainer = await page.locator('[style*="display"][style*="flex-wrap"]').first();
  if (await masonryContainer.count() > 0) {
    console.log('✓ Masonry container found');
    
    // Check for images with varying heights
    const images = await page.locator('img[loading="lazy"]').all();
    console.log(`Found ${images.length} images in masonry layout`);
    
    if (images.length > 0) {
      // Check first few images for different heights
      const heights = new Set();
      for (let i = 0; i < Math.min(5, images.length); i++) {
        const img = images[i];
        const height = await img.evaluate(el => el.offsetHeight);
        heights.add(height);
      }
      
      console.log(`Unique image heights: ${heights.size}`);
      if (heights.size > 1) {
        console.log('✓ Images have varying heights (masonry working)');
      } else {
        console.log('⚠️  All images have same height');
      }
    }
  } else {
    console.log('✗ Masonry container not found');
  }
  
  // Check header is fixed
  const header = await page.locator('header.fixed').first();
  if (await header.isVisible()) {
    console.log('✓ Header is fixed at top');
  }
  
  // Check status bar
  const statusBar = await page.locator('.fixed.bottom-0').first();
  if (await statusBar.isVisible()) {
    console.log('✓ Status bar is visible');
    
    // Check if content is properly spaced from status bar
    const mainContent = await page.locator('main').first();
    const mainBounds = await mainContent.boundingBox();
    const statusBounds = await statusBar.boundingBox();
    
    if (mainBounds && statusBounds) {
      const hasBottomMargin = mainContent.evaluate(el => 
        window.getComputedStyle(el).marginBottom
      );
      console.log(`Main content margin-bottom: ${await hasBottomMargin}`);
    }
  }
  
  // Scroll to test infinite scroll
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'tests/js/masonry-scrolled.png', fullPage: false });
  console.log('Scrolled screenshot saved to tests/js/masonry-scrolled.png');
  
  await page.waitForTimeout(5000);
  
  await browser.close();
})();