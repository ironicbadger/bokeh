const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Error:', msg.text());
    }
  });
  
  console.log('Testing Year View Simple');
  console.log('=========================\n');
  
  // Go directly to year view
  await page.goto('http://localhost:3000/?view=year');
  console.log('Navigated to year view');
  
  // Wait for potential loading
  await page.waitForTimeout(5000);
  
  // Check what's actually on the page
  const bodyText = await page.textContent('body');
  console.log('\nPage contains:');
  console.log('- "Bokeh":', bodyText.includes('Bokeh'));
  console.log('- "Year":', bodyText.includes('Year'));
  console.log('- "Grid":', bodyText.includes('Grid'));
  console.log('- "Files":', bodyText.includes('Files'));
  console.log('- "Loading":', bodyText.includes('Loading'));
  console.log('- Any year numbers:', /202[0-9]/.test(bodyText));
  
  // Check specific elements
  const viewButtons = await page.locator('button').count();
  console.log(`\nButtons found: ${viewButtons}`);
  
  const yearCards = await page.locator('[data-testid="year-card"]').count();
  console.log(`Year cards found: ${yearCards}`);
  
  // Try to find any div with year-like content
  const divs = await page.$$eval('div', elements => 
    elements.map(el => el.textContent).filter(text => 
      text && /202[0-9]/.test(text)
    ).slice(0, 5)
  );
  
  if (divs.length > 0) {
    console.log('\nDivs containing years:');
    divs.forEach(text => console.log(`  "${text.substring(0, 50)}..."`));
  }
  
  // Check if there's a loading state
  const loadingIndicator = await page.locator('text=Loading').count();
  console.log(`\nLoading indicator: ${loadingIndicator > 0 ? 'Yes' : 'No'}`);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-year-simple.png' });
  console.log('\n📸 Screenshot saved as test-year-simple.png');
  
  await browser.close();
})();