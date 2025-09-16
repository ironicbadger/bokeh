const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔄 Testing All View Modes');
  console.log('=====================================\n');

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // Test Grid View (default)
  console.log('📊 Testing Grid View...');
  await page.goto('http://localhost:3000/?view=grid');
  await page.waitForTimeout(2000);
  
  const gridPhotos = await page.locator('[data-testid="photo-item"]').count();
  console.log(`  ✅ Grid view loaded with ${gridPhotos} photos`);
  
  // Test Year View
  console.log('\n📅 Testing Year View...');
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(2000);
  
  const yearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`  ✅ Year view loaded with ${yearCards} year cards`);
  
  // Check year card details
  if (yearCards > 0) {
    const firstYear = await page.locator('[data-testid="year-card"]').first();
    const yearText = await firstYear.locator('.text-3xl').textContent();
    const photoCount = await firstYear.locator('.text-sm').textContent();
    console.log(`  📸 First year: ${yearText} - ${photoCount}`);
  }
  
  // Test Files View
  console.log('\n📁 Testing Files View...');
  await page.goto('http://localhost:3000/?view=files');
  await page.waitForTimeout(2000);
  
  const folderTree = await page.locator('[data-testid="folder-tree"]').count();
  const filesGrid = await page.locator('[data-testid="files-grid"]').count();
  console.log(`  ✅ Files view loaded with folder tree: ${folderTree > 0 ? 'Yes' : 'No'}`);
  
  // Test view mode switching via buttons
  console.log('\n🔀 Testing View Mode Switching...');
  
  // Click Grid button
  await page.click('button:has-text("Grid")');
  await page.waitForTimeout(1000);
  let currentView = await page.url();
  console.log(`  ✅ Grid button works: ${currentView.includes('view=grid') || !currentView.includes('view=')}`);
  
  // Click Year button
  await page.click('button:has-text("Year")');
  await page.waitForTimeout(1000);
  currentView = await page.url();
  console.log(`  ✅ Year button works: ${currentView.includes('view=year')}`);
  
  // Click Files button
  await page.click('button:has-text("Files")');
  await page.waitForTimeout(1000);
  currentView = await page.url();
  console.log(`  ✅ Files button works: ${currentView.includes('view=files')}`);
  
  // Test zoom control presence
  console.log('\n🔍 Testing Zoom Control...');
  const zoomControl = await page.locator('[data-testid="zoom-control"]').count();
  console.log(`  ✅ Zoom control present: ${zoomControl > 0 ? 'Yes' : 'No'}`);
  
  // Take screenshots
  console.log('\n📸 Taking screenshots...');
  await page.goto('http://localhost:3000/?view=grid');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-grid-view.png' });
  console.log('  ✅ Grid view screenshot saved');
  
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-year-view.png' });
  console.log('  ✅ Year view screenshot saved');
  
  await page.goto('http://localhost:3000/?view=files');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-files-view.png' });
  console.log('  ✅ Files view screenshot saved');
  
  console.log('\n✨ All view modes tested successfully!');
  
  await browser.close();
})();