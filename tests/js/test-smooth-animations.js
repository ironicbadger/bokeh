const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎨 Testing smooth animations and transitions...\n');
  
  // Go to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // Check for animation CSS classes
  const hasAnimationCSS = await page.locator('.photo-item').first().evaluate(el => {
    const styles = window.getComputedStyle(el);
    return styles.animation !== 'none';
  }).catch(() => false);
  
  console.log(`✅ Animation CSS loaded: ${hasAnimationCSS ? 'Yes' : 'No'}`);
  
  // Check for skeleton loaders
  const skeletonCount = await page.locator('.skeleton-loader').count();
  console.log(`🦴 Skeleton loaders found: ${skeletonCount}`);
  
  // Check for fade-in animations
  const photoItems = await page.locator('.photo-item').count();
  console.log(`📸 Photo items with animation class: ${photoItems}`);
  
  // Test zoom transition smoothness
  console.log('\n🔍 Testing zoom transitions...');
  
  // Open zoom control
  await page.hover('.fixed.bottom-right');
  await page.waitForTimeout(500);
  
  // Change zoom level and watch for smooth transition
  const zoomSlider = page.locator('input[type="range"]').first();
  if (await zoomSlider.isVisible()) {
    const initialColumns = await page.locator('.photo-grid').evaluate(el => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    
    await zoomSlider.fill('8');
    await page.waitForTimeout(1000);
    
    const newColumns = await page.locator('.photo-grid').evaluate(el => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    
    console.log(`✅ Grid columns changed from ${initialColumns} to ${newColumns}`);
    
    // Check if transition is applied
    const hasTransition = await page.locator('.photo-grid').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.transition !== 'none';
    });
    
    console.log(`✅ Grid has smooth transition: ${hasTransition ? 'Yes' : 'No'}`);
  }
  
  // Test status bar number animations
  console.log('\n📊 Testing status bar animations...');
  
  const statusBar = page.locator('.animated-number').first();
  if (await statusBar.isVisible()) {
    const initialValue = await statusBar.textContent();
    console.log(`Initial status: ${initialValue}`);
    
    // Trigger a scan to see numbers animate
    await page.click('button:has-text("Jobs")');
    await page.waitForTimeout(1000);
    
    const scanButton = page.locator('button:has-text("Scan My Library")');
    if (await scanButton.isVisible()) {
      await scanButton.click();
      console.log('Scan started - watching for animated number changes...');
      
      // Watch for 5 seconds
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(1000);
        const currentValue = await statusBar.textContent();
        const hasUpdatingClass = await statusBar.evaluate(el => {
          return el.classList.contains('updating');
        });
        console.log(`  ${i+1}s: ${currentValue} ${hasUpdatingClass ? '(animating)' : ''}`);
      }
    }
  }
  
  // Test hover animations
  console.log('\n🎯 Testing hover animations...');
  
  const firstPhoto = page.locator('.photo-wrapper').first();
  if (await firstPhoto.isVisible()) {
    // Check hover transform
    const normalTransform = await firstPhoto.evaluate(el => {
      return window.getComputedStyle(el).transform;
    });
    
    await firstPhoto.hover();
    await page.waitForTimeout(300); // Wait for transition
    
    const hoverTransform = await firstPhoto.evaluate(el => {
      return window.getComputedStyle(el).transform;
    });
    
    console.log(`✅ Hover transform: ${normalTransform} → ${hoverTransform}`);
    
    // Check overlay animation
    const overlayOpacity = await page.locator('.photo-wrapper').first()
      .locator('.group-hover\\:opacity-100').evaluate(el => {
        return window.getComputedStyle(el).opacity;
      });
    
    console.log(`✅ Overlay opacity on hover: ${overlayOpacity}`);
  }
  
  // Performance check
  console.log('\n⚡ Testing animation performance...');
  
  // Scroll to trigger more photo loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  
  const finalPhotoCount = await page.locator('.photo-item').count();
  console.log(`✅ Total photos loaded with animations: ${finalPhotoCount}`);
  
  // Check for janky animations
  const animationDurations = await page.locator('.photo-item').evaluateAll(elements => {
    return elements.slice(0, 10).map(el => {
      const styles = window.getComputedStyle(el);
      return styles.animationDuration;
    });
  });
  
  console.log(`✅ Animation durations: ${animationDurations.join(', ')}`);
  
  console.log('\n✨ Animation test complete!');
  
  await browser.close();
})();