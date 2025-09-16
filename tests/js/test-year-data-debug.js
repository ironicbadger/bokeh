const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
  });
  
  console.log('🔍 Debugging Year View Data');
  console.log('=====================================\n');

  // Add console.log to the YearView component
  await page.addInitScript(() => {
    window.__DEBUG_YEAR_VIEW__ = true;
  });
  
  // Navigate to year view
  console.log('Loading Year View...');
  await page.goto('http://localhost:3000/?view=year');
  await page.waitForTimeout(3000);
  
  // Check what React Query has cached
  const queryData = await page.evaluate(() => {
    // Try to access React Query cache
    const reactFiber = document.querySelector('#__next')?._reactRootContainer?._internalRoot?.current;
    
    // Get the actual data from the page
    const yearCards = document.querySelectorAll('[data-testid="year-card"]');
    
    // Check if loading message is shown
    const loadingElement = document.querySelector('.text-gray-400');
    const isLoading = loadingElement?.textContent?.includes('Loading years');
    
    // Try to get the years data directly
    const debugInfo = {
      yearCardsCount: yearCards.length,
      isLoading: isLoading,
      loadingText: loadingElement?.textContent || null,
      pageHtml: document.querySelector('.min-h-screen')?.innerHTML?.substring(0, 500) || null
    };
    
    return debugInfo;
  });
  
  console.log('Query Data:', JSON.stringify(queryData, null, 2));
  
  // Try to manually trigger the API call
  console.log('\nManually fetching years API...');
  const apiData = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/photos/years');
      const data = await response.json();
      return {
        success: true,
        yearsCount: data.years?.length || 0,
        years: data.years?.map(y => ({ year: y.year, count: y.count })) || []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('API Data:', JSON.stringify(apiData, null, 2));
  
  // Check if year cards are rendered after a longer wait
  console.log('\nWaiting longer for year cards to render...');
  await page.waitForTimeout(5000);
  
  const finalYearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`Final year cards count: ${finalYearCards}`);
  
  // Get the actual page content
  const pageText = await page.textContent('body');
  if (pageText.includes('2025') || pageText.includes('2024')) {
    console.log('✅ Year data is present in the page');
  } else {
    console.log('❌ Year data is NOT present in the page');
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'test-year-data-debug.png' });
  console.log('\n📸 Screenshot saved as test-year-data-debug.png');
  
  await browser.close();
})();