const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🖼️ Testing Full-Screen Image Viewer...\n');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for photos to load
  console.log('1. Waiting for photos to load...');
  await page.waitForSelector('img[loading="lazy"]', { timeout: 10000 });
  const photoCount = await page.locator('img[loading="lazy"]').count();
  console.log(`   ✅ Found ${photoCount} photos in grid`);
  
  // Click on first photo to open viewer
  console.log('\n2. Opening image viewer...');
  await page.locator('img[loading="lazy"]').first().click();
  
  // Check if viewer opened
  const viewer = await page.waitForSelector('.fixed.inset-0.bg-black', { timeout: 5000 });
  if (viewer) {
    console.log('   ✅ Image viewer opened');
  } else {
    console.log('   ❌ Failed to open viewer');
  }
  
  // Check for controls
  console.log('\n3. Checking viewer controls...');
  const controls = [
    { selector: 'button[title="Close (Esc)"]', name: 'Close button' },
    { selector: 'button[title="Info (I)"]', name: 'Info button' },
    { selector: 'button[title="Zoom In (+)"]', name: 'Zoom In' },
    { selector: 'button[title="Zoom Out (-)"]', name: 'Zoom Out' },
    { selector: 'button[title="Rotate Right (R)"]', name: 'Rotate Right' },
    { selector: 'button[title*="Rotate Left"]', name: 'Rotate Left' },
  ];
  
  for (const control of controls) {
    const element = await page.$(control.selector);
    if (element) {
      console.log(`   ✅ ${control.name} found`);
    } else {
      console.log(`   ❌ ${control.name} not found`);
    }
  }
  
  // Test keyboard navigation
  console.log('\n4. Testing keyboard navigation...');
  
  // Check initial image counter
  const counterText = await page.textContent('.text-white.text-sm');
  console.log(`   Current position: ${counterText}`);
  
  // Press right arrow to go to next image
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const newCounterText = await page.textContent('.text-white.text-sm');
  if (newCounterText !== counterText) {
    console.log(`   ✅ Arrow navigation works: ${newCounterText}`);
  } else {
    console.log('   ❌ Arrow navigation not working');
  }
  
  // Test info panel
  console.log('\n5. Testing info panel...');
  await page.keyboard.press('i');
  await page.waitForTimeout(500);
  
  const infoPanel = await page.$('.absolute.top-16.right-4');
  if (infoPanel) {
    console.log('   ✅ Info panel opened');
    const infoText = await infoPanel.textContent();
    if (infoText.includes('Filename:')) {
      console.log('   ✅ Shows filename');
    }
    if (infoText.includes('Size:')) {
      console.log('   ✅ Shows file size');
    }
    if (infoText.includes('Dimensions:')) {
      console.log('   ✅ Shows dimensions');
    }
  } else {
    console.log('   ❌ Info panel not found');
  }
  
  // Test zoom
  console.log('\n6. Testing zoom controls...');
  await page.click('button[title="Zoom In (+)"]');
  await page.waitForTimeout(300);
  console.log('   ✅ Zoom in clicked');
  
  await page.click('button[title="Zoom Out (-)"]');
  await page.waitForTimeout(300);
  console.log('   ✅ Zoom out clicked');
  
  // Test rotation
  console.log('\n7. Testing rotation...');
  await page.keyboard.press('r');
  await page.waitForTimeout(300);
  console.log('   ✅ Rotated right with R key');
  
  // Test thumbnail strip
  console.log('\n8. Checking thumbnail strip...');
  const thumbnailStrip = await page.$$('.absolute.bottom-0 img.w-12.h-12');
  if (thumbnailStrip.length > 0) {
    console.log(`   ✅ Found ${thumbnailStrip.length} thumbnails in preview strip`);
  } else {
    console.log('   ❌ Thumbnail strip not found');
  }
  
  // Test image loading
  console.log('\n9. Testing image preloading...');
  const mainImage = await page.$('img[alt]:not(.w-12)');
  if (mainImage) {
    const src = await mainImage.getAttribute('src');
    if (src && src.includes('/1200')) {
      console.log('   ✅ Loading large resolution (1200px)');
    } else {
      console.log(`   ℹ️  Image source: ${src}`);
    }
  }
  
  // Test closing
  console.log('\n10. Testing close functionality...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  const viewerGone = await page.$('.fixed.inset-0.bg-black');
  if (!viewerGone) {
    console.log('   ✅ Viewer closed with Escape key');
  } else {
    console.log('   ❌ Viewer still visible');
  }
  
  console.log('\n👀 Browser will remain open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\n✨ Image viewer test complete!');
})();