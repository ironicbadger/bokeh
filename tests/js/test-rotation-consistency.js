const { chromium } = require('playwright');

async function waitAndLog(page, message, ms = 1000) {
  console.log(message);
  await page.waitForTimeout(ms);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔄 Testing Rotation State Consistency\n');
  console.log('=' .repeat(50));
  
  // Track rotation states for validation
  const rotationStates = {};
  
  try {
    // 1. Load the grid
    await waitAndLog(page, '\n1. Loading photo grid...', 2000);
    await page.goto('http://localhost:3000');
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Get first three images for testing
    const gridImages = await page.locator('img[alt]').all();
    if (gridImages.length < 3) {
      throw new Error('Need at least 3 images for this test');
    }
    
    // 2. Record initial thumbnail URLs
    console.log('\n2. Recording initial thumbnail states...');
    const thumb1Before = await gridImages[0].getAttribute('src');
    const thumb2Before = await gridImages[1].getAttribute('src');
    console.log('   Image 1 URL:', thumb1Before);
    console.log('   Image 2 URL:', thumb2Before);
    
    // 3. Open first image in lightbox
    await waitAndLog(page, '\n3. Opening first image in lightbox...', 1500);
    await gridImages[0].click();
    
    // Get initial rotation state
    const imageContainer = await page.locator('div[style*="transform"][style*="scale"]').first();
    const initialStyle1 = await imageContainer.getAttribute('style');
    console.log('   Initial style:', initialStyle1);
    
    // 4. Rotate the first image
    await waitAndLog(page, '\n4. Rotating first image (pressing "r")...', 500);
    await page.keyboard.press('r');
    await page.waitForTimeout(1500); // Wait for server save
    
    const rotatedStyle1 = await imageContainer.getAttribute('style');
    console.log('   After rotation:', rotatedStyle1);
    
    if (rotatedStyle1.includes('rotate(90deg)')) {
      console.log('   ✓ First image rotated to 90°');
      rotationStates['image1'] = 90;
    } else {
      console.log('   ✗ Rotation not applied visually');
    }
    
    // 5. Navigate to next image
    await waitAndLog(page, '\n5. Navigating to next image (arrow right)...', 500);
    await page.keyboard.press('ArrowRight');
    
    const styleImage2 = await imageContainer.getAttribute('style');
    console.log('   Second image style:', styleImage2);
    
    // 6. Navigate back to first image
    await waitAndLog(page, '\n6. Going back to first image (arrow left)...', 500);
    await page.keyboard.press('ArrowLeft');
    
    const backToFirst = await imageContainer.getAttribute('style');
    console.log('   First image style after returning:', backToFirst);
    
    // Check if rotation persisted
    if (backToFirst.includes('rotate(90deg)')) {
      console.log('   ✓ Rotation persisted when navigating back');
    } else {
      console.log('   ✗ ISSUE: Rotation lost when navigating back!');
      console.log('     Expected: rotate(90deg)');
      console.log('     Actual:', backToFirst);
    }
    
    // 7. Rotate second time
    await waitAndLog(page, '\n7. Rotating first image again (to 180°)...', 500);
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    const rotatedStyle2 = await imageContainer.getAttribute('style');
    if (rotatedStyle2.includes('rotate(180deg)')) {
      console.log('   ✓ Cumulative rotation to 180°');
      rotationStates['image1'] = 180;
    }
    
    // 8. Navigate to second image and rotate it
    await waitAndLog(page, '\n8. Going to second image and rotating it...', 500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('r');
    await page.waitForTimeout(1500);
    
    const image2Rotated = await imageContainer.getAttribute('style');
    if (image2Rotated.includes('rotate(90deg)')) {
      console.log('   ✓ Second image rotated to 90°');
      rotationStates['image2'] = 90;
    }
    
    // 9. Close lightbox
    await waitAndLog(page, '\n9. Closing lightbox...', 500);
    await page.keyboard.press('Escape');
    
    // 10. Check thumbnail updates
    console.log('\n10. Checking if thumbnails updated...');
    await page.waitForTimeout(1000);
    
    const thumb1After = await gridImages[0].getAttribute('src');
    const thumb2After = await gridImages[1].getAttribute('src');
    
    console.log('   Image 1 URL after:', thumb1After);
    console.log('   Image 2 URL after:', thumb2After);
    
    if (thumb1After !== thumb1Before) {
      const version1Before = thumb1Before.match(/v=(\d+)/)?.[1] || '0';
      const version1After = thumb1After.match(/v=(\d+)/)?.[1] || '0';
      console.log(`   ✓ Image 1 thumbnail updated (v${version1Before} → v${version1After})`);
    } else {
      console.log('   ✗ Image 1 thumbnail did not update');
    }
    
    if (thumb2After !== thumb2Before) {
      const version2Before = thumb2Before.match(/v=(\d+)/)?.[1] || '0';
      const version2After = thumb2After.match(/v=(\d+)/)?.[1] || '0';
      console.log(`   ✓ Image 2 thumbnail updated (v${version2Before} → v${version2After})`);
    } else {
      console.log('   ✗ Image 2 thumbnail did not update');
    }
    
    // 11. Reopen first image from grid
    await waitAndLog(page, '\n11. Reopening first image from grid...', 1500);
    await gridImages[0].click();
    
    const reopenedStyle = await imageContainer.getAttribute('style');
    console.log('   Reopened style:', reopenedStyle);
    
    // Check if rotation matches what we set (180°)
    if (reopenedStyle.includes('rotate(180deg)')) {
      console.log('   ✓ Rotation state correct (180°)');
    } else if (reopenedStyle.includes('rotate(90deg)')) {
      console.log('   ✗ ISSUE: Shows old rotation (90°) instead of current (180°)');
    } else if (reopenedStyle.includes('rotate(0deg)')) {
      console.log('   ✗ ISSUE: Rotation completely lost!');
    } else {
      console.log('   ✗ ISSUE: Unexpected rotation state:', reopenedStyle);
    }
    
    // 12. Navigate to second image and check its rotation
    await waitAndLog(page, '\n12. Checking second image rotation...', 500);
    await page.keyboard.press('ArrowRight');
    
    const image2ReopenedStyle = await imageContainer.getAttribute('style');
    console.log('   Second image style:', image2ReopenedStyle);
    
    if (image2ReopenedStyle.includes('rotate(90deg)')) {
      console.log('   ✓ Second image rotation preserved (90°)');
    } else {
      console.log('   ✗ ISSUE: Second image rotation lost');
    }
    
    // 13. Test refresh persistence
    await waitAndLog(page, '\n13. Testing persistence after page refresh...', 500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Open first image again
    const refreshedGridImages = await page.locator('img[alt]').all();
    await refreshedGridImages[0].click();
    await page.waitForTimeout(1500);
    
    const afterRefreshStyle = await imageContainer.getAttribute('style');
    console.log('   After refresh style:', afterRefreshStyle);
    
    if (afterRefreshStyle.includes('rotate(180deg)')) {
      console.log('   ✓ Rotation persisted after page refresh');
    } else {
      console.log('   ✗ ISSUE: Rotation lost after page refresh');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('\n📊 ROTATION CONSISTENCY ANALYSIS:\n');
    
    const issues = [];
    
    // Check for common issues
    if (!backToFirst.includes('rotate(90deg)')) {
      issues.push('❌ Rotation not preserved when navigating between images');
    }
    
    if (!reopenedStyle.includes('rotate(180deg)')) {
      issues.push('❌ Rotation state mismatch between grid thumbnail and lightbox');
    }
    
    if (!afterRefreshStyle.includes('rotate(180deg)')) {
      issues.push('❌ Rotation not persisted after page refresh');
    }
    
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach(issue => console.log('  ' + issue));
      
      console.log('\nLikely problems:');
      console.log('  1. Optimistic rotation state not being preserved in component state');
      console.log('  2. Photo object not being updated with new rotation data');
      console.log('  3. Rotation state being reset when switching images');
      console.log('  4. Server rotation not being loaded when opening lightbox');
    } else {
      console.log('✅ All rotation state consistency checks passed!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
  
  console.log('\nKeeping browser open for manual inspection...');
  await page.waitForTimeout(10000);
  await browser.close();
})();