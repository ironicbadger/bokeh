const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  const page = await browser.newPage();
  
  console.log('Cache Invalidation Test\n');
  console.log('Testing that Cmd+Shift+R properly invalidates caches\n');
  console.log('=' .repeat(60));

  try {
    // Enable network logging
    const responses = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/v1/thumbnails/')) {
        const status = response.status();
        const headers = response.headers();
        responses.push({
          url: url.substring(url.lastIndexOf('/api')),
          status,
          cacheControl: headers['cache-control'],
          etag: headers['etag'],
          fromCache: status === 304
        });
      }
    });

    // Initial page load
    console.log('1. Initial page load...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const initialResponses = [...responses];
    console.log(`   Loaded ${initialResponses.length} thumbnails`);
    console.log(`   First thumbnail: Status ${initialResponses[0]?.status}`);
    console.log(`   Cache-Control: ${initialResponses[0]?.cacheControl}`);
    console.log(`   ETag: ${initialResponses[0]?.etag}\n`);
    
    // Clear response log
    responses.length = 0;
    
    // Normal reload (Cmd+R / Ctrl+R)
    console.log('2. Normal reload (Cmd+R)...');
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+r' : 'Control+r');
    await page.waitForTimeout(3000);
    
    const normalReloadResponses = [...responses];
    const cached304Count = normalReloadResponses.filter(r => r.status === 304).length;
    console.log(`   Loaded ${normalReloadResponses.length} thumbnails`);
    console.log(`   304 (Not Modified) responses: ${cached304Count}`);
    console.log(`   200 (OK) responses: ${normalReloadResponses.length - cached304Count}\n`);
    
    // Clear response log
    responses.length = 0;
    
    // Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
    console.log('3. Hard refresh (Cmd+Shift+R)...');
    await page.keyboard.press(isMac ? 'Meta+Shift+r' : 'Control+Shift+r');
    await page.waitForTimeout(3000);
    
    const hardRefreshResponses = [...responses];
    const hardRefresh304Count = hardRefreshResponses.filter(r => r.status === 304).length;
    const hardRefresh200Count = hardRefreshResponses.filter(r => r.status === 200).length;
    console.log(`   Loaded ${hardRefreshResponses.length} thumbnails`);
    console.log(`   304 (Not Modified) responses: ${hardRefresh304Count}`);
    console.log(`   200 (OK) responses: ${hardRefresh200Count}\n`);
    
    // Analysis
    console.log('=' .repeat(60));
    console.log('ANALYSIS');
    console.log('=' .repeat(60));
    
    if (normalReloadResponses.length > 0) {
      const normalCacheRate = (cached304Count / normalReloadResponses.length * 100).toFixed(1);
      console.log(`Normal reload: ${normalCacheRate}% served from cache (304 responses)`);
    }
    
    if (hardRefreshResponses.length > 0) {
      const hardRefreshCacheRate = (hardRefresh304Count / hardRefreshResponses.length * 100).toFixed(1);
      console.log(`Hard refresh:  ${hardRefreshCacheRate}% served from cache (304 responses)`);
      
      if (hardRefresh200Count === hardRefreshResponses.length) {
        console.log('\n✅ SUCCESS: Hard refresh properly bypassed cache (all 200 responses)');
        console.log('   The must-revalidate directive is working correctly.');
      } else if (hardRefresh304Count > 0) {
        console.log('\n⚠️  WARNING: Some responses still came from cache on hard refresh');
        console.log('   This might indicate browser is still using cached versions.');
      }
    }
    
    // Check the actual headers
    console.log('\n' + '=' .repeat(60));
    console.log('CACHE HEADERS CHECK');
    console.log('=' .repeat(60));
    
    if (hardRefreshResponses.length > 0) {
      const sample = hardRefreshResponses[0];
      console.log('\nSample response headers:');
      console.log(`  Cache-Control: ${sample.cacheControl}`);
      console.log(`  ETag: ${sample.etag}`);
      
      if (sample.cacheControl) {
        if (sample.cacheControl.includes('immutable')) {
          console.log('\n❌ ERROR: immutable directive prevents hard refresh from working!');
        } else if (sample.cacheControl.includes('must-revalidate')) {
          console.log('\n✅ GOOD: must-revalidate directive allows proper cache invalidation');
        }
        
        const maxAgeMatch = sample.cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const seconds = parseInt(maxAgeMatch[1]);
          const days = Math.floor(seconds / 86400);
          console.log(`   Cache duration: ${days} days`);
        }
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest complete!');
})();