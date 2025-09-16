const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  const page = await browser.newPage();
  
  console.log('Testing Clear Cache Button\n');
  console.log('=' .repeat(60));

  try {
    // Go to the main page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('1. Page loaded, waiting for photos...');
    await page.waitForTimeout(3000);
    
    // Check initial image URLs
    const initialUrls = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="/api/v1/thumbnails/"]');
      return Array.from(images).slice(0, 3).map(img => img.src);
    });
    
    console.log('\n2. Initial thumbnail URLs:');
    initialUrls.forEach(url => {
      const urlObj = new URL(url);
      console.log(`   ${urlObj.pathname}${urlObj.search}`);
    });
    
    // Open the jobs modal
    console.log('\n3. Opening Jobs/Activity modal...');
    const jobsButton = await page.$('button:has-text("Jobs"), button:has-text("⚡")');
    if (jobsButton) {
      await jobsButton.click();
      await page.waitForTimeout(1000);
      
      console.log('4. Looking for Clear Image Cache button...');
      const clearCacheButton = await page.$('button:has-text("Clear Image Cache")');
      
      if (clearCacheButton) {
        console.log('5. Found button, clicking...');
        await clearCacheButton.click();
        
        // Wait for page reload
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
        
        // Check new image URLs
        const newUrls = await page.evaluate(() => {
          const images = document.querySelectorAll('img[src*="/api/v1/thumbnails/"]');
          return Array.from(images).slice(0, 3).map(img => img.src);
        });
        
        console.log('\n6. New thumbnail URLs after cache clear:');
        newUrls.forEach(url => {
          const urlObj = new URL(url);
          console.log(`   ${urlObj.pathname}${urlObj.search}`);
        });
        
        // Check if cache bust parameter was added
        const hasCacheBust = newUrls.some(url => url.includes('cb='));
        
        console.log('\n' + '=' .repeat(60));
        console.log('RESULTS');
        console.log('=' .repeat(60));
        
        if (hasCacheBust) {
          console.log('✅ SUCCESS: Cache bust parameter added to URLs');
          console.log('   Images will be reloaded from server');
          
          // Check session storage
          const cacheBustValue = await page.evaluate(() => sessionStorage.getItem('cacheBust'));
          console.log(`   Cache bust timestamp: ${cacheBustValue}`);
        } else {
          console.log('⚠️  WARNING: No cache bust parameter found');
          console.log('   Images may still be cached');
        }
        
      } else {
        console.log('❌ ERROR: Clear Image Cache button not found');
      }
    } else {
      console.log('❌ ERROR: Jobs button not found');
    }
    
    // Check cache headers
    console.log('\n' + '=' .repeat(60));
    console.log('CACHE HEADERS CHECK');
    console.log('=' .repeat(60));
    
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8000/api/v1/thumbnails/1/400');
      return {
        ok: res.ok,
        headers: {
          cacheControl: res.headers.get('cache-control'),
          pragma: res.headers.get('pragma'),
          expires: res.headers.get('expires')
        }
      };
    });
    
    console.log('\nBackend cache headers:');
    console.log(`  Cache-Control: ${response.headers.cacheControl}`);
    console.log(`  Pragma: ${response.headers.pragma}`);
    console.log(`  Expires: ${response.headers.expires}`);
    
    if (response.headers.cacheControl?.includes('no-cache')) {
      console.log('\n✅ Development mode: Aggressive no-cache headers active');
    } else {
      console.log('\n⚠️  Production mode: Standard caching headers active');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  await browser.close();
  console.log('\nTest complete!');
})();