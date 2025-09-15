const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📸 Testing Photo Sorting...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for photos to load
  await page.waitForTimeout(3000);
  
  // Check for sort controls
  const sortControls = await page.$$('button:has-text("Newest First"), button:has-text("Oldest First")');
  console.log(`✅ Sort controls found: ${sortControls.length} buttons`);
  
  // Check default sort (should be Newest First)
  const newestButton = await page.$('button:has-text("Newest First")');
  const newestClasses = await newestButton?.getAttribute('class');
  const isNewestActive = newestClasses?.includes('bg-blue-600');
  console.log(`   Default sort: ${isNewestActive ? 'Newest First ✅' : 'Not set ❌'}`);
  
  // Get initial photo data
  console.log('\n📊 Testing sort order change...');
  
  // Click Oldest First
  await page.click('button:has-text("Oldest First")');
  console.log('   Clicked "Oldest First"');
  
  // Wait for data to reload
  await page.waitForTimeout(2000);
  
  // Check if button state changed
  const oldestButton = await page.$('button:has-text("Oldest First")');
  const oldestClasses = await oldestButton?.getAttribute('class');
  const isOldestActive = oldestClasses?.includes('bg-blue-600');
  console.log(`   Oldest First active: ${isOldestActive ? '✅' : '❌'}`);
  
  // Test API calls
  console.log('\n🔍 Checking API calls...');
  
  // Test newest first API
  const newestResponse = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos?page=1&per_page=5&sort=date_taken&order=desc');
    const data = await response.json();
    return {
      count: data.data?.length,
      firstPhoto: data.data?.[0]?.date_taken,
      lastPhoto: data.data?.[data.data?.length - 1]?.date_taken
    };
  });
  
  console.log('   Newest first API:');
  console.log(`     Photos: ${newestResponse.count}`);
  console.log(`     First: ${newestResponse.firstPhoto || 'null'}`);
  console.log(`     Last: ${newestResponse.lastPhoto || 'null'}`);
  
  // Test oldest first API
  const oldestResponse = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos?page=1&per_page=5&sort=date_taken&order=asc');
    const data = await response.json();
    return {
      count: data.data?.length,
      firstPhoto: data.data?.[0]?.date_taken,
      lastPhoto: data.data?.[data.data?.length - 1]?.date_taken
    };
  });
  
  console.log('\n   Oldest first API:');
  console.log(`     Photos: ${oldestResponse.count}`);
  console.log(`     First: ${oldestResponse.firstPhoto || 'null'}`);
  console.log(`     Last: ${oldestResponse.lastPhoto || 'null'}`);
  
  // Check photo count display
  const photoCount = await page.$eval('.text-sm.text-gray-600', el => el.textContent);
  console.log(`\n📊 Photo count displayed: ${photoCount}`);
  
  // Switch back to newest
  await page.click('button:has-text("Newest First")');
  await page.waitForTimeout(1000);
  
  console.log('\n👀 Browser will remain open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Sorting test complete!');
})();