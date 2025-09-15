const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📸 Testing Orientation & UI Updates...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Check status bar changes
  console.log('1. Checking Status Bar Updates...');
  const statusBar = await page.$('.fixed.bottom-0');
  const statusText = await statusBar?.textContent();
  
  // Check for library size instead of disk percentage
  if (statusText?.includes('Library:')) {
    console.log('   ✅ Shows "Library:" instead of disk percentage');
  } else {
    console.log('   ❌ Still showing old format');
  }
  
  if (statusText?.includes('Free:')) {
    console.log('   ✅ Shows "Free:" disk space');
  }
  
  // Parse library size
  const libraryMatch = statusText?.match(/Library: ([\d.]+\s+\w+)/);
  if (libraryMatch) {
    console.log(`   📊 Library size: ${libraryMatch[1]}`);
  }
  
  // Check job polling behavior
  console.log('\n2. Checking Job Polling...');
  console.log('   Monitoring network requests for 10 seconds...');
  
  let jobRequestCount = 0;
  page.on('request', request => {
    if (request.url().includes('/api/v1/jobs')) {
      jobRequestCount++;
    }
  });
  
  await page.waitForTimeout(10000);
  
  const requestsPerSecond = jobRequestCount / 10;
  if (requestsPerSecond < 0.2) {  // Should be every 30s when no active jobs
    console.log(`   ✅ Reduced polling: ${jobRequestCount} requests in 10s (${requestsPerSecond.toFixed(2)}/sec)`);
  } else {
    console.log(`   ⚠️  High polling rate: ${jobRequestCount} requests in 10s (${requestsPerSecond.toFixed(2)}/sec)`);
  }
  
  // Test API for orientation data
  console.log('\n3. Testing Orientation Data...');
  const photoData = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos?page=1&per_page=5');
    const data = await response.json();
    return data.data;
  });
  
  if (photoData && photoData.length > 0) {
    console.log(`   Found ${photoData.length} photos`);
    // Check if any have orientation data (new photos would have it)
    const hasOrientationFields = 'original_orientation' in (photoData[0] || {});
    if (hasOrientationFields) {
      console.log('   ✅ Photos have orientation fields');
    } else {
      console.log('   ℹ️  Orientation fields not exposed in API (backend only)');
    }
  }
  
  console.log('\n👀 Browser will remain open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Test complete!');
})();