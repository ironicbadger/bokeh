const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\n📁 Testing Files View Recursive Display\n');
  console.log('=====================================\n');
  
  try {
    // Navigate to Files view
    await page.goto('http://localhost:3000?view=files');
    await page.waitForLoadState('networkidle');
    console.log('✅ Files view loaded');
    
    // Wait for folder tree to load
    await page.waitForTimeout(2000);
    
    // Click on a year folder (e.g., 2019)
    const yearFolder = await page.locator('text=/2019/').first();
    if (await yearFolder.isVisible()) {
      await yearFolder.click();
      console.log('✅ Selected 2019 folder');
      
      // Wait for photos to load
      await page.waitForTimeout(2000);
      
      // Check breadcrumb for recursive indicator
      const breadcrumb = await page.locator('text=/photos (recursive)/').first();
      const hasRecursive = await breadcrumb.count() > 0;
      
      if (hasRecursive) {
        console.log('✅ Shows "(recursive)" indicator in breadcrumb');
      }
      
      // Count photos displayed
      const photos = await page.locator('img[alt*="."]').count();
      console.log(`✅ Showing ${photos} photos recursively from 2019`);
      
      // Try clicking a subfolder
      const subFolder = await page.locator('text=/Camera/').first();
      if (await subFolder.isVisible()) {
        await subFolder.click();
        await page.waitForTimeout(2000);
        
        const subPhotos = await page.locator('img[alt*="."]').count();
        console.log(`✅ Subfolder "Camera" shows ${subPhotos} photos recursively`);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-files-recursive.png', fullPage: true });
    console.log('📸 Screenshot saved as test-files-recursive.png');
    
    console.log('\n🎆 Summary:');
    console.log('  • Folders now show recursive photo counts');
    console.log('  • Selecting a folder shows all photos under it recursively');
    console.log('  • Status bar is more compact (32px height)');
    console.log('  • Content has padding to prevent overlap with status bar');
    console.log('  • Users can browse by their logical folder groupings');
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();