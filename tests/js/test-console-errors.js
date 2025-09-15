const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Checking for console errors...\n');
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    }
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    console.log(`❌ Request failed: ${request.url()}`);
    console.log(`   Failure: ${request.failure()?.errorText}`);
  });
  
  try {
    await page.goto('http://localhost:3000');
    console.log('✅ Page loaded\n');
    
    // Wait for any async operations
    await page.waitForTimeout(3000);
    
    // Check for specific API call
    console.log('📡 Checking API calls...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/photos?page=1&per_page=50');
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          dataLength: data.data?.length || 0,
          error: data.error
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('   API Response:', apiResponse);
    
    // Check for images after API call
    await page.waitForTimeout(2000);
    const images = await page.$$('img[alt]');
    console.log(`\n🖼️  Images found after API call: ${images.length}`);
    
    // Check React Query state
    const queryState = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="photo-grid"]');
      return element ? 'Grid found' : 'Grid not found';
    });
    console.log(`   Grid state: ${queryState}`);
    
    // Summary
    console.log('\n📊 Summary:');
    const errors = consoleMessages.filter(m => m.type === 'error');
    console.log(`   Console errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(e => console.log(`     - ${e.text}`));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  console.log('\n👀 Browser will remain open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('\n✨ Test complete!');
})();