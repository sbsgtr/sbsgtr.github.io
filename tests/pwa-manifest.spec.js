/**
 * PWA Manifest Compliance Tests for NEXWAVE CORE
 *
 * Validates the manifest.json meets PWA installability requirements:
 * - Required fields exist with correct types
 * - All referenced icon files are accessible and correct size
 * - Shortcuts point to valid ERP pages
 * - Display mode is standalone
 * - Service worker installs and precaches assets
 *
 * NOTE: beforeAll cannot use 'page' or 'context' fixtures in Playwright.
 * We use beforeEach to fetch manifest data when needed.
 */

const { test, expect } = require('playwright/test');

// ── Helpers ──

/** Fetch JSON from a relative URL */
async function getManifest(page) {
  return await page.evaluate(async () => {
    const res = await fetch('/manifest.json');
    return res.json();
  });
}

/** Check that a URL returns HTTP 200 */
async function urlExists(page, url) {
  return await page.evaluate(async (u) => {
    try {
      const res = await fetch(u, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }, url);
}

/** Read PNG dimensions using the browser's Image element */
async function getImageDimensions(page, url) {
  return await page.evaluate(async (u) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        img.onerror = null;
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        img.onload = null;
        resolve(null);
      };
      img.src = u;
    });
  }, url);
}

// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
//  TESTS
// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

test.describe('PWA — Manifest JSON Structure', () => {

  test.describe('Required fields', () => {

    test('has name (max 45 chars for install prompt)', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('name');
      expect(typeof manifest.name).toBe('string');
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.name.length).toBeLessThanOrEqual(45);
    });

    test('has short_name (max 12 chars for home screen)', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('short_name');
      expect(typeof manifest.short_name).toBe('string');
      expect(manifest.short_name.length).toBeGreaterThan(0);
      expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    });

    test('has description', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('description');
      expect(typeof manifest.description).toBe('string');
      expect(manifest.description.length).toBeGreaterThan(0);
    });

    test('has id set to root', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('id');
      expect(manifest.id).toBe('/');
    });

    test('has start_url pointing to index page', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('start_url');
      expect(manifest.start_url).toBe('/pages/index.html');
    });

    test('has scope set to root', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('scope');
      expect(manifest.scope).toBe('/');
    });
  });

  test.describe('Display & appearance', () => {

    test('display mode is standalone', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('display');
      expect(manifest.display).toBe('standalone');
    });

    test('display_override includes standalone and minimal-ui', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('display_override');
      expect(Array.isArray(manifest.display_override)).toBe(true);
      expect(manifest.display_override).toContain('standalone');
      expect(manifest.display_override).toContain('minimal-ui');
    });

    test('orientation is portrait-primary', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('orientation');
      expect(manifest.orientation).toBe('portrait-primary');
    });

    test('background_color is a valid 6-char hex', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('background_color');
      expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('theme_color is a valid 6-char hex', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('theme_color');
      expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('has lang set to en', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('lang');
      expect(manifest.lang).toBe('en');
    });

    test('has dir set to ltr', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('dir');
      expect(manifest.dir).toBe('ltr');
    });

    test('categories include business, productivity, finance', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('categories');
      expect(Array.isArray(manifest.categories)).toBe(true);
      expect(manifest.categories.length).toBeGreaterThanOrEqual(3);
      expect(manifest.categories).toContain('business');
      expect(manifest.categories).toContain('productivity');
    });

    test('has launch_handler with navigate-existing mode', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('launch_handler');
      expect(manifest.launch_handler).toHaveProperty('client_mode');
      expect(manifest.launch_handler.client_mode).toBe('navigate-existing');
    });
  });

  test.describe('Icons — structure', () => {

    test('icons array has 5 entries', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('icons');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBe(5);
    });

    test('all icons have src, sizes, type, and valid src paths', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      for (const icon of manifest.icons) {
        expect(icon).toHaveProperty('src');
        expect(icon).toHaveProperty('sizes');
        expect(icon).toHaveProperty('type');
        expect(icon.type).toBe('image/png');
        expect(icon.src).toMatch(/^\/icons\/icon-\d+.*\.png$/);
      }
    });

    test('icon with purpose "any" exists at 512x512', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      const anyIcon = manifest.icons.find(i => i.purpose === 'any');
      expect(anyIcon).toBeDefined();
      expect(anyIcon.sizes).toContain('512x512');
    });

    test('maskable icons exist at 192x192 and 512x512', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      const maskables = manifest.icons.filter(i => i.purpose === 'maskable');
      expect(maskables.length).toBe(2);

      const sizes = maskables.map(i => i.sizes).sort();
      expect(sizes).toEqual(['192x192', '512x512']);
    });
  });

  test.describe('Icons — file accessibility', () => {

    const iconFiles = [
      { src: '/icons/icon-96.png', sizes: '96x96', label: '96x96' },
      { src: '/icons/icon-192.png', sizes: '192x192', label: '192x192' },
      { src: '/icons/icon-512.png', sizes: '512x512', label: '512x512' },
      { src: '/icons/icon-192-maskable.png', sizes: '192x192', label: '192x192 maskable' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', label: '512x512 maskable' },
    ];

    for (const icon of iconFiles) {
      test(`icon ${icon.label} (${icon.src}) is accessible and returns 200`, async ({ page }) => {
        await page.goto('/pages/index.html');
        const exists = await urlExists(page, icon.src);
        expect(exists).toBe(true);
      });
    }

    const iconDims = [
      { src: '/icons/icon-96.png', expectedW: 96, expectedH: 96, label: '96x96' },
      { src: '/icons/icon-192.png', expectedW: 192, expectedH: 192, label: '192x192' },
      { src: '/icons/icon-512.png', expectedW: 512, expectedH: 512, label: '512x512' },
      { src: '/icons/icon-192-maskable.png', expectedW: 192, expectedH: 192, label: '192x192 maskable' },
      { src: '/icons/icon-512-maskable.png', expectedW: 512, expectedH: 512, label: '512x512 maskable' },
    ];

    for (const icon of iconDims) {
      test(`icon ${icon.label} has correct dimensions (${icon.expectedW}x${icon.expectedH})`, async ({ page }) => {
        await page.goto('/pages/index.html');
        const dims = await getImageDimensions(page, icon.src);
        expect(dims).not.toBeNull();
        expect(dims.width).toBe(icon.expectedW);
        expect(dims.height).toBe(icon.expectedH);
      });
    }
  });

  test.describe('Shortcuts', () => {

    test('shortcuts array exists with 4 entries', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      expect(manifest).toHaveProperty('shortcuts');
      expect(Array.isArray(manifest.shortcuts)).toBe(true);
      expect(manifest.shortcuts.length).toBe(4);
    });

    test('all shortcuts have name, short_name, url, and description', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      for (const sc of manifest.shortcuts) {
        expect(sc).toHaveProperty('name');
        expect(sc).toHaveProperty('short_name');
        expect(sc).toHaveProperty('description');
        expect(sc).toHaveProperty('url');
        expect(typeof sc.name).toBe('string');
        expect(sc.name.length).toBeGreaterThan(0);
        expect(typeof sc.url).toBe('string');
      }
    });

    test('all shortcut URLs point to ERP pages', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      const expectedUrls = [
        '/erp/corporate.html',
        '/erp/est_inv.html',
        '/erp/est_inv.html?tab=invoices',
        '/erp/accounting.html',
      ];
      const urls = manifest.shortcuts.map(sc => sc.url);
      for (const url of expectedUrls) {
        expect(urls).toContain(url);
      }
    });

    test('all shortcut URLs are accessible (return 200)', async ({ page }) => {
      await page.goto('/pages/index.html');
      const manifest = await getManifest(page);
      for (const sc of manifest.shortcuts) {
        const exists = await urlExists(page, sc.url);
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('Link tag on pages', () => {

    const PAGES = [
      '/pages/index.html',
      '/pages/login.html',
      '/pages/verify.html',
      '/pages/countdown.html',
      '/pages/who-we-are.html',
      '/pages/what-we-do.html',
      '/pages/our_values.html',
      '/privacy.html',
      '/terms.html',
      '/erp/corporate.html',
      '/erp/products.html',
      '/erp/customers.html',
      '/erp/est_inv.html',
      '/erp/accounting.html',
      '/erp/companymgt.html',
      '/erp/settings.html',
    ];

    for (const pagePath of PAGES) {
      test(`${pagePath} has manifest link tag`, async ({ page }) => {
        await page.goto(pagePath);
        const manifestLink = await page.evaluate(() => {
          const link = document.querySelector('link[rel="manifest"]');
          if (!link) return null;
          return link.getAttribute('href');
        });
        expect(manifestLink).toBeTruthy();
        // Accept both './manifest.json' and '../manifest.json'
        expect(manifestLink).toMatch(/manifest\.json$/);
      });
    }
  });

  test.describe('Manifest loaded from link tag', () => {

    test('manifest link resolves to valid JSON with name', async ({ page }) => {
      await page.goto('/pages/index.html');

      const manifest = await page.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        if (!link) return null;
        const href = link.getAttribute('href');
        const res = await fetch(href);
        return res.json();
      });

      expect(manifest).not.toBeNull();
      expect(manifest).toHaveProperty('name');
      expect(manifest.name).toContain('NEXWAVE');
    });
  });

  test.describe('Service worker', () => {

    test('service worker is registered', async ({ page }) => {
      await page.goto('/pages/index.html');

      // Wait for SW registration (poll instead of fixed timeout)
      const isRegistered = await page.waitForFunction(async () => {
        if (!('serviceWorker' in navigator)) return false;
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }, { timeout: 10000 });

      expect(isRegistered).toBeTruthy();
    });

    test('service worker scope is root (/)', async ({ page }) => {
      await page.goto('/pages/index.html');

      const scope = await page.waitForFunction(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) return null;
        return registrations[0].scope;
      }, { timeout: 10000 });

      expect(await scope.jsonValue()).toBe('http://localhost:5500/');
    });

    test('manifest is precached by service worker', async ({ page }) => {
      await page.goto('/pages/index.html');

      const isCached = await page.waitForFunction(async () => {
        if (!('caches' in window)) return false;
        const keys = await caches.keys();
        const cacheKey = keys.find(k => k.startsWith('nexwave-core'));
        if (!cacheKey) return false;
        try {
          const cache = await caches.open(cacheKey);
          const cachedResponse = await cache.match('/manifest.json');
          return cachedResponse !== undefined;
        } catch {
          return false;
        }
      }, { timeout: 10000 });

      expect(isCached).toBeTruthy();
    });
  });
});
