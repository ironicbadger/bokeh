const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎨 Inspecting Photo Grid Layout...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForSelector('[data-testid="photo-item"], img', { timeout: 10000 });
  
  // Wait for images to load
  await page.waitForTimeout(3000);
  
  // Get grid information
  const gridInfo = await page.evaluate(() => {
    const grid = document.querySelector('.grid');
    const columns = grid ? grid.querySelectorAll('.flex-col') : [];
    const images = document.querySelectorAll('img[alt]');
    
    // Check gaps
    const gridClasses = grid ? grid.className : '';
    const columnClasses = columns.length > 0 ? columns[0].className : '';
    
    // Check image dimensions
    const imageSizes = Array.from(images).slice(0, 5).map(img => ({
      width: img.naturalWidth,
      height: img.naturalHeight,
      displayWidth: img.offsetWidth,
      displayHeight: img.offsetHeight,
      aspectRatio: img.naturalWidth / img.naturalHeight,
      displayAspectRatio: img.offsetWidth / img.offsetHeight
    }));
    
    return {
      columnCount: columns.length,
      imageCount: images.length,
      gridClasses,
      columnClasses,
      imageSizes
    };
  });
  
  console.log(`📊 Grid Layout Analysis:`);
  console.log(`   - Columns: ${gridInfo.columnCount}`);
  console.log(`   - Images: ${gridInfo.imageCount}`);
  console.log(`   - Grid classes: ${gridInfo.gridClasses}`);
  console.log(`   - Column classes: ${gridInfo.columnClasses}\n`);
  
  console.log(`📏 Image Dimensions (first 5):`);
  gridInfo.imageSizes.forEach((img, i) => {
    const aspectMatch = Math.abs(img.aspectRatio - img.displayAspectRatio) < 0.1;
    const icon = aspectMatch ? '✅' : '⚠️';
    console.log(`   ${icon} Image ${i + 1}:`);
    console.log(`      Natural: ${img.width}x${img.height} (ratio: ${img.aspectRatio.toFixed(2)})`);
    console.log(`      Display: ${img.displayWidth}x${img.displayHeight} (ratio: ${img.displayAspectRatio.toFixed(2)})`);
  });
  
  // Check for overlaps
  const hasOverlaps = await page.evaluate(() => {
    const statusBar = document.querySelector('[data-testid="status-bar"], footer, .fixed.bottom-0');
    const images = document.querySelectorAll('img[alt]');
    
    if (!statusBar) return false;
    
    const statusRect = statusBar.getBoundingClientRect();
    let overlapping = false;
    
    Array.from(images).forEach(img => {
      const imgRect = img.getBoundingClientRect();
      if (imgRect.bottom > statusRect.top) {
        overlapping = true;
      }
    });
    
    return overlapping;
  });
  
  console.log(`\n🔍 Layout Issues:`);
  console.log(`   - Status bar overlap: ${hasOverlaps ? '❌ Yes' : '✅ No'}`);
  
  // Keep browser open for 5 seconds for visual inspection
  console.log('\n👀 Browser will remain open for 5 seconds for visual inspection...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Layout inspection complete!');
})();