const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    }
  });
  
  // Collect page errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  console.log('🔍 Checking Year View for Errors');
  console.log('=====================================\n');

  // Navigate to year view
  console.log('Loading Year View...');
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(3000);
  
  // Check for year cards
  const yearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`\nYear cards found: ${yearCards}`);
  
  // Check the actual page content
  const pageContent = await page.content();
  
  // Check if YearView component is rendered
  if (pageContent.includes('Loading years...')) {
    console.log('✅ YearView component is rendered (showing loading state)');
  }
  
  // Check for specific elements
  const hasZoomControl = await page.locator('[data-testid="zoom-control"]').count();
  console.log(`Zoom control present: ${hasZoomControl > 0 ? 'Yes' : 'No'}`);
  
  // Try to fetch the API directly from the page
  console.log('\nTrying to fetch years API from page context...');
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/photos/years');
      const data = await response.json();
      return { 
        ok: response.ok, 
        status: response.status, 
        yearsCount: data.years ? data.years.length : 0,
        firstYear: data.years ? data.years[0] : null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('API Response from page:', JSON.stringify(apiResponse, null, 2));
  
  // Print all console messages
  if (consoleMessages.length > 0) {
    console.log('\n📝 Console Messages:');
    consoleMessages.forEach(msg => {
      console.log(`  [${msg.type}] ${msg.text}`);
    });
  }
  
  // Check React Query devtools if available
  const reactQueryState = await page.evaluate(() => {
    if (window.__REACT_QUERY_DEVTOOLS_GLOBAL_STATE__) {
      const queries = Array.from(window.__REACT_QUERY_DEVTOOLS_GLOBAL_STATE__.queries.values());
      return queries.map(q => ({
        queryKey: q.queryKey,
        state: q.state.status,
        error: q.state.error?.message
      }));
    }
    return null;
  });
  
  if (reactQueryState) {
    console.log('\n🔧 React Query State:');
    console.log(JSON.stringify(reactQueryState, null, 2));
  }
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-year-debug.png' });
  console.log('\n📸 Debug screenshot saved as test-year-debug.png');
  
  await browser.close();
})();