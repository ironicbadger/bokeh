const { chromium } = require('playwright');

async function wait(ms, message) {
  if (message) console.log(message);
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for network requests to track thumbnail regeneration
  const regenerationRequests = [];
  page.on('request', request => {
    if (request.url().includes('/regenerate/')) {
      regenerationRequests.push(request.url());
      console.log('   🔄 Regeneration request:', request.url());
    }
  });
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.text().includes('Thumbnail regeneration')) {
      console.log('   Console:', msg.text());
    }
  });
  
  console.log('🖼️  Testing Thumbnail Regeneration on Rotation\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Load grid
    await wait(0, '\n1. Loading photo grid...');
    await page.goto('http://localhost:3000');
    await wait(2000);
    
    // Get initial thumbnails
    const gridImages = await page.locator('img[alt]').all();
    const thumb1Before = await gridImages[0].getAttribute('src');
    const thumb2Before = await gridImages[1].getAttribute('src');
    
    console.log('   Photo 1 thumbnail:', thumb1Before);
    console.log('   Photo 2 thumbnail:', thumb2Before);
    
    // 2. Open first photo
    await wait(0, '\n2. Opening first photo in lightbox...');
    await gridImages[0].click();
    await wait(1500);
    
    // 3. Rotate first photo
    await wait(0, '\n3. Rotating first photo...');
    await page.keyboard.press('r');
    await wait(1500, '   Waiting for rotation to save...');
    
    // 4. Navigate to second photo (should trigger regen for first)
    await wait(0, '\n4. Navigating to second photo...');
    regenerationRequests.length = 0; // Clear previous requests
    await page.keyboard.press('ArrowRight');
    await wait(1000);
    
    if (regenerationRequests.length > 0) {
      console.log('   ✅ Thumbnail regeneration triggered when leaving rotated photo');
    } else {
      console.log('   ⚠️  No regeneration request detected');
    }
    
    // 5. Rotate second photo
    await wait(0, '\n5. Rotating second photo...');
    await page.keyboard.press('r');
    await wait(1500);
    
    // 6. Close lightbox (should trigger regen for second photo)
    await wait(0, '\n6. Closing lightbox...');
    regenerationRequests.length = 0;
    await page.keyboard.press('Escape');
    await wait(1000);
    
    if (regenerationRequests.length > 0) {
      console.log('   ✅ Thumbnail regeneration triggered when closing with rotated photo');
    } else {
      console.log('   ⚠️  No regeneration request on close');
    }
    
    // 7. Wait for thumbnails to update
    await wait(3000, '\n7. Waiting for thumbnails to regenerate...');
    
    // Check if thumbnails updated
    const thumb1After = await gridImages[0].getAttribute('src');
    const thumb2After = await gridImages[1].getAttribute('src');
    
    console.log('\n8. Checking thumbnail updates...');
    console.log('   Photo 1 after:', thumb1After);
    console.log('   Photo 2 after:', thumb2After);
    
    const version1Before = thumb1Before.match(/v=(\d+)/)?.[1] || '0';
    const version1After = thumb1After.match(/v=(\d+)/)?.[1] || '0';
    const version2Before = thumb2Before.match(/v=(\d+)/)?.[1] || '0';
    const version2After = thumb2After.match(/v=(\d+)/)?.[1] || '0';
    
    if (parseInt(version1After) > parseInt(version1Before)) {
      console.log(`   ✅ Photo 1 thumbnail version updated (v${version1Before} → v${version1After})`);
    } else {
      console.log(`   ⚠️  Photo 1 thumbnail version unchanged (v${version1Before})`);
    }
    
    if (parseInt(version2After) > parseInt(version2Before)) {
      console.log(`   ✅ Photo 2 thumbnail version updated (v${version2Before} → v${version2After})`);
    } else {
      console.log(`   ⚠️  Photo 2 thumbnail version unchanged`);
    }
    
    // 9. Check if actual thumbnail files are updated
    await wait(0, '\n9. Checking if thumbnails visually updated...');
    await page.reload();
    await wait(3000);
    
    // Open first photo again to verify rotation is visible in thumbnail
    const refreshedImages = await page.locator('img[alt]').all();
    const thumb1Refreshed = await refreshedImages[0].getAttribute('src');
    console.log('   Photo 1 after refresh:', thumb1Refreshed);
    
    // 10. Test multiple rotations without closing
    await wait(0, '\n10. Testing multiple rotations...');
    await refreshedImages[0].click();
    await wait(1500);
    
    // Rotate multiple times
    await page.keyboard.press('r');
    await wait(1000);
    await page.keyboard.press('r');
    await wait(1000);
    
    // Navigate to trigger regen
    await page.keyboard.press('ArrowRight');
    await wait(500);
    await page.keyboard.press('ArrowLeft');
    await wait(500);
    
    // Close to trigger final regen
    regenerationRequests.length = 0;
    await page.keyboard.press('Escape');
    await wait(1000);
    
    console.log(`\n   Total regeneration requests in session: ${regenerationRequests.length}`);
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ Thumbnail Regeneration Test Complete!\n');
    console.log('Expected behavior:');
    console.log('  • Thumbnails regenerate when navigating away from rotated photo');
    console.log('  • Thumbnails regenerate when closing lightbox with rotated photos');
    console.log('  • Thumbnail versions increment after regeneration');
    console.log('  • Visual rotation is reflected in grid thumbnails');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nKeeping browser open for manual inspection...');
  await wait(10000);
  await browser.close();
})();