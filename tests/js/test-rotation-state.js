const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    if (msg.text().includes('State updated') || msg.text().includes('rotation')) {
      console.log('Console:', msg.text());
    }
  });
  
  console.log('Testing rotation state updates...');
  
  try {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('img[alt]', { timeout: 10000 });
    
    // Open first image
    const firstPhoto = await page.locator('img[alt]').first();
    await firstPhoto.click();
    await page.waitForTimeout(1500);
    
    // Get the image container with data attributes
    const container = await page.locator('div[data-rotation]').first();
    
    console.log('\n1. Initial state:');
    const initialRotation = await container.getAttribute('data-rotation');
    const initialStyle = await container.getAttribute('style');
    console.log('   data-rotation:', initialRotation);
    console.log('   style:', initialStyle);
    
    // Press 'r' to rotate
    console.log('\n2. Pressing "r" to rotate right...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    
    const afterRotation = await container.getAttribute('data-rotation');
    const afterStyle = await container.getAttribute('style');
    console.log('   data-rotation:', afterRotation);
    console.log('   style:', afterStyle);
    
    // Press 'r' again
    console.log('\n3. Pressing "r" again...');
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);
    
    const after2Rotation = await container.getAttribute('data-rotation');
    const after2Style = await container.getAttribute('style');
    console.log('   data-rotation:', after2Rotation);
    console.log('   style:', after2Style);
    
    // Press 'l' for left rotation
    console.log('\n4. Pressing "l" for left rotation...');
    await page.keyboard.press('l');
    await page.waitForTimeout(1000);
    
    const afterLeftRotation = await container.getAttribute('data-rotation');
    const afterLeftStyle = await container.getAttribute('style');
    console.log('   data-rotation:', afterLeftRotation);
    console.log('   style:', afterLeftStyle);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();