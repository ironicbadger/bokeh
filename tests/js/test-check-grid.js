const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Checking photo grid loading...');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  
  // Wait for initial load
  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);
  
  // Check various selectors to understand the page structure
  const gridCount = await page.locator('.masonry-grid').count();
  console.log(`Masonry grids found: ${gridCount}`);
  
  const imgCount = await page.locator('.masonry-grid img').count();
  console.log(`Images in masonry grid: ${imgCount}`);
  
  const allImgCount = await page.locator('img').count();
  console.log(`Total images on page: ${allImgCount}`);
  
  // Check for loading spinner
  const spinnerCount = await page.locator('.animate-spin').count();
  console.log(`Loading spinners: ${spinnerCount}`);
  
  // Check for error messages
  const errorText = await page.locator('text=/error|failed/i').count();
  console.log(`Error messages: ${errorText}`);
  
  // Get the actual HTML to see what's rendered
  const mainContent = await page.locator('main').first().innerHTML();
  console.log('\n--- Main content preview (first 500 chars) ---');
  console.log(mainContent.substring(0, 500));
  
  // Check for specific photo grid component
  const photoGrid = await page.locator('[class*="grid"]').count();
  console.log(`\nGrid elements found: ${photoGrid}`);
  
  // Check network for API calls
  console.log('\n--- Checking API calls ---');
  page.on('response', response => {
    if (response.url().includes('/api/v1/photos')) {
      console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
    }
  });
  
  // Reload to capture network traffic
  await page.reload();
  await page.waitForTimeout(3000);
  
  // Final check
  const finalImgCount = await page.locator('img').count();
  console.log(`\nFinal image count after reload: ${finalImgCount}`);
  
  await browser.close();
})();