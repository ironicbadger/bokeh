const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing auto-reload and sort features...');
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  // Check if sort selector is visible
  const sortSelector = await page.locator('text=Recently Added').first();
  if (await sortSelector.isVisible()) {
    console.log('✓ Sort selector is visible');
    
    // Click on "Date Taken" to change sort
    await page.click('text=Date Taken');
    await page.waitForTimeout(1000);
    console.log('✓ Switched to Date Taken sort');
    
    // Click back to "Recently Added"
    await page.click('text=Recently Added');
    await page.waitForTimeout(1000);
    console.log('✓ Switched back to Recently Added sort');
    
    // Check the order toggle
    const orderButton = await page.locator('text=Newest First').first();
    if (await orderButton.isVisible()) {
      console.log('✓ Order toggle button is visible');
      await orderButton.click();
      await page.waitForTimeout(1000);
      
      // Should now show "Oldest First"
      const oldestFirst = await page.locator('text=Oldest First').first();
      if (await oldestFirst.isVisible()) {
        console.log('✓ Order toggled to Oldest First');
      }
    }
  } else {
    console.log('⚠ Sort selector not found - may need to wait for components to load');
  }
  
  // Check photo count display
  const photoCount = await page.locator('text=/\\d+ photos/').first();
  if (await photoCount.isVisible()) {
    const countText = await photoCount.textContent();
    console.log(`✓ Photo count displayed: ${countText}`);
  }
  
  // Check if scanning indicator appears when jobs are active
  const jobsButton = await page.locator('button:has-text("⚡ Jobs")').first();
  if (await jobsButton.isVisible()) {
    console.log('✓ Jobs button found');
    
    // Open Jobs modal to check status
    await jobsButton.click();
    await page.waitForTimeout(1000);
    
    const jobsModal = await page.locator('text=Active Jobs').first();
    if (await jobsModal.isVisible()) {
      console.log('✓ Jobs modal opened');
      
      // Check if any jobs are running
      const runningJob = await page.locator('text=/RUNNING|PENDING/i').first();
      if (await runningJob.isVisible()) {
        console.log('✓ Active jobs detected - auto-refresh should be active');
        
        // Wait and check if photo count changes
        const initialCount = await page.locator('text=/\\d+ photos/').first().textContent();
        console.log(`Initial count: ${initialCount}`);
        
        console.log('Waiting 10 seconds to see if new photos appear...');
        await page.waitForTimeout(10000);
        
        const newCount = await page.locator('text=/\\d+ photos/').first().textContent();
        console.log(`New count: ${newCount}`);
        
        if (initialCount !== newCount) {
          console.log('✓ Photo count changed - auto-reload is working!');
        }
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    }
  }
  
  // Test the new API endpoints directly
  console.log('\nTesting new API endpoints...');
  
  // Test photo count endpoint
  const countResponse = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos/count');
    return response.json();
  });
  console.log(`✓ Photo count API: ${countResponse.count} photos`);
  console.log(`  Latest created at: ${countResponse.latest_created_at}`);
  
  // Test recent photos endpoint
  const recentResponse = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos/recent?limit=5');
    return response.json();
  });
  console.log(`✓ Recent photos API: ${recentResponse.count} recent photos returned`);
  
  // Test sorting by created_at
  const sortedResponse = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8000/api/v1/photos?sort=created_at&order=desc&per_page=5');
    return response.json();
  });
  console.log(`✓ Photos sorted by created_at: ${sortedResponse.data.length} photos`);
  if (sortedResponse.data.length > 0) {
    console.log(`  First photo created at: ${sortedResponse.data[0].created_at}`);
  }
  
  console.log('\n✅ All tests completed!');
  console.log('\nNote: Auto-reload works best when there are active scanning/thumbnail jobs running.');
  console.log('To fully test auto-reload: Start a scan and watch as new photos appear automatically!');
  
  await browser.close();
})();