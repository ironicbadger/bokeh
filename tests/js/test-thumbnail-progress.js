const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📸 Testing Thumbnail Generation Progress...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Open Jobs Modal
  console.log('1. Opening Jobs Modal...');
  await page.click('button:has-text("Jobs")');
  await page.waitForSelector('[data-testid="jobs-modal"]', { timeout: 5000 });
  
  // Start a scan if no active jobs
  const activeJobs = await page.$$('[data-testid="job-item"]');
  if (activeJobs.length === 0) {
    console.log('2. Starting new scan...');
    await page.click('button:has-text("Scan My Library")');
    await page.waitForTimeout(2000);
  }
  
  // Monitor thumbnail generation progress
  console.log('3. Monitoring thumbnail generation progress...\n');
  
  let lastProgress = -1;
  let checkCount = 0;
  const maxChecks = 30; // Check for 30 seconds
  
  while (checkCount < maxChecks) {
    try {
      // Look for thumbnail generation job
      const thumbJob = await page.$('text=/Thumbnail Generation/i');
      if (thumbJob) {
        // Get progress info
        const jobCard = await thumbJob.evaluateHandle(el => el.closest('[data-testid="job-item"]'));
        const progressText = await jobCard.$eval('.text-sm.text-gray-600', el => el.textContent);
        
        // Extract numbers
        const match = progressText.match(/(\d+) \/ (\d+)/);
        if (match) {
          const [_, processed, total] = match;
          const progress = Math.round((parseInt(processed) / parseInt(total)) * 100);
          
          if (progress !== lastProgress) {
            console.log(`   📊 Progress: ${processed}/${total} photos (${progress}%)`);
            lastProgress = progress;
          }
          
          // Check if completed
          if (progress === 100) {
            console.log('\n✅ Thumbnail generation completed!');
            break;
          }
        }
      }
      
      // Check photo grid update
      const photoCount = await page.$$eval('img[alt]', imgs => imgs.length);
      console.log(`   🖼️  Photos visible in grid: ${photoCount}`);
      
    } catch (e) {
      // Job might not exist yet or might have completed
    }
    
    await page.waitForTimeout(1000);
    checkCount++;
  }
  
  // Final photo count
  const finalPhotoCount = await page.$$eval('img[alt]', imgs => imgs.length);
  console.log(`\n📊 Final Results:`);
  console.log(`   - Photos in grid: ${finalPhotoCount}`);
  console.log(`   - Only photos with thumbnails are shown`);
  
  // Keep browser open for visual inspection
  console.log('\n👀 Browser will remain open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Test complete!');
})();