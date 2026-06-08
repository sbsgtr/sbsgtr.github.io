import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = 'C:\\Users\\sbsgt\\Desktop';
mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });

  // Load the test page
  const page = await context.newPage();
  await page.goto('http://localhost:5500/print-preview-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Inject the proper overlay structure (like openPrintPreview does)
  await page.evaluate(() => {
    const doc = document.querySelector('.print-document');
    if (!doc) return;
    const content = doc.outerHTML;
    const overlay = document.createElement('div');
    overlay.id = 'printPreviewOverlay';
    overlay.innerHTML = `
      <div class="print-preview-container">
        <div class="print-preview-header">Header</div>
        <div class="print-preview-body" id="printPreviewBody"></div>
      </div>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(overlay);
    document.getElementById('printPreviewBody').innerHTML = content;
    document.body.classList.add('print-preview-active');
    document.body.style.overflow = 'hidden';
  });
  await page.waitForTimeout(200);

  // Screenshot 1: Screen preview (what user sees on screen)
  await page.screenshot({ path: join(OUT_DIR, 'print-preview-screen.png'), fullPage: false });
  console.log('✅ Screen preview saved: C:\\Users\\sbsgt\\Desktop\\print-preview-screen.png');

  // Switch to print media mode
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(200);

  // Screenshot 2: Print media emulation
  await page.screenshot({ path: join(OUT_DIR, 'print-media-output.png'), fullPage: false });
  console.log('✅ Print media screenshot saved: C:\\Users\\sbsgt\\Desktop\\print-media-output.png');

  // Generate actual PDF (what Ctrl+P → Save as PDF produces)
  await page.pdf({
    path: join(OUT_DIR, 'print-actual-output.pdf'),
    format: 'A4',
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });
  console.log('✅ PDF saved: C:\\Users\\sbsgt\\Desktop\\print-actual-output.pdf');

  // Get element bounding box info
  const info = await page.evaluate(() => {
    const doc = document.querySelector('.print-document');
    if (!doc) return 'no doc';
    const docRect = doc.getBoundingClientRect();
    const result = [];
    const items = [
      'Document', '.print-document',
      'Header', '.doc-header',
      'Badge', '.doc-type-badge',
      'Parties', '.doc-parties',
      'Items Table', '.items-section',
      'Totals', '.doc-totals-wrap',
      'Notes', '.doc-notes',
      'General Note', '.doc-general-note',
      'Signatory', '.doc-signatory',
      'Company Info', '.doc-company-info',
      'Footer', '.print-page-footer',
    ];
    for (let i = 0; i < items.length; i += 2) {
      const el = document.querySelector(items[i+1]);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        result.push(`${items[i]}: top=${(r.top - docRect.top).toFixed(1)}px, bottom=${(r.bottom - docRect.top).toFixed(1)}px, height=${r.height.toFixed(1)}px, display=${cs.display}, pos=${cs.position}`);
      } else {
        result.push(`${items[i]} (${items[i+1]}): NOT FOUND`);
      }
    }
    return result.join('\n');
  });
  console.log('\n=== Print mode element positions ===');
  console.log(info);

  await browser.close();
  console.log('\n✅ Done! Files saved to your desktop.');
})();
