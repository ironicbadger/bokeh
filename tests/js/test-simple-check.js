const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Checking application state...\n');
  
  try {
    await page.goto('http://localhost:3000');
    console.log('✅ Page loaded');
    
    // Get page content
    const title = await page.title();
    console.log(`   Title: ${title}`);
    
    // Check for images
    const images = await page.$$('img');
    console.log(`   Images found: ${images.length}`);
    
    // Check for status bar
    const statusBar = await page.$('.fixed.bottom-0');
    console.log(`   Status bar: ${statusBar ? 'Present' : 'Not found'}`);
    
    // Check for Jobs button
    const jobsButton = await page.$('button:has-text("Jobs")');
    console.log(`   Jobs button: ${jobsButton ? 'Present' : 'Not found'}`);
    
    // Check for "No photos found" message
    const noPhotos = await page.$('text=/No photos found/i');
    console.log(`   No photos message: ${noPhotos ? 'Yes - library is empty' : 'No'}`);
    
    // If Jobs button exists, click it
    if (jobsButton) {
      console.log('\n📊 Opening Jobs Modal...');
      await jobsButton.click();
      await page.waitForTimeout(1000);
      
      // Check for scan button
      const scanButton = await page.$('button:has-text("Scan My Library")');
      console.log(`   Scan button: ${scanButton ? 'Present' : 'Not found'}`);
      
      // Check for active jobs
      const jobs = await page.$$('[class*="bg-gray-50"]');
      console.log(`   Active jobs: ${jobs.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n👀 Browser will remain open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('\n✨ Check complete!');
})();