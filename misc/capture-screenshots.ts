import { chromium, type Browser, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './screenshots-final';

interface ScreenshotConfig {
  route: string;
  filename: string;
  viewports: { width: number; height: number; label: string }[];
}

const routes: ScreenshotConfig[] = [
  {
    route: '/',
    filename: 'dashboard',
    viewports: [
      { width: 1920, height: 1080, label: 'desktop' },
      { width: 375, height: 667, label: 'mobile' }
    ]
  },
  {
    route: '/search',
    filename: 'search',
    viewports: [
      { width: 1920, height: 1080, label: 'desktop' },
      { width: 375, height: 667, label: 'mobile' }
    ]
  },
  {
    route: '/watchlist',
    filename: 'watchlist',
    viewports: [
      { width: 1920, height: 1080, label: 'desktop' },
      { width: 375, height: 667, label: 'mobile' }
    ]
  },
  {
    route: '/settings',
    filename: 'settings',
    viewports: [
      { width: 1920, height: 1080, label: 'desktop' },
      { width: 375, height: 667, label: 'mobile' }
    ]
  }
];

async function captureScreenshots() {
  console.log('🎬 Starting screenshot capture...');
  console.log(`📁 Output directory: ${SCREENSHOT_DIR}`);

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();

  const capturedFiles: string[] = [];

  for (const routeConfig of routes) {
    const page: Page = await context.newPage();

    for (const viewport of routeConfig.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const url = `${BASE_URL}${routeConfig.route}`;
      console.log(`\n📸 Navigating to: ${url} (${viewport.label} - ${viewport.width}x${viewport.height})`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        await page.waitForTimeout(1000);

        const filename = `${SCREENSHOT_DIR}/${routeConfig.filename}-${viewport.label}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        capturedFiles.push(filename);
        console.log(`✅ Saved: ${filename}`);
      } catch (error) {
        console.error(`❌ Error capturing ${routeConfig.route} (${viewport.label}):`, error);
      }
    }

    await page.close();
  }

  await context.close();
  await browser.close();

  console.log('\n🎉 Screenshot capture complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Total screenshots: ${capturedFiles.length}`);
  console.log(`   Output directory: ${SCREENSHOT_DIR}`);
  console.log('\n📄 Captured files:');
  capturedFiles.forEach(file => console.log(`   - ${file}`));

  return capturedFiles;
}

captureScreenshots().catch(console.error);
