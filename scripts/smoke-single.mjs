/**
 * Smoke test for the single-file bundle.
 *
 * The bundle renders each screen into a srcdoc iframe, so it exercises a
 * different navigation path than the static site. Walk the same journey and
 * confirm state still carries across screens.
 *
 *   node scripts/smoke-single.mjs
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'docs-single', 'yanc-connect-demo.html');
const SHOTS = path.join(ROOT, '.smoke-shots');

if (!fs.existsSync(FILE)) {
  console.error('bundle not found — run `node scripts/bundle-single.mjs` first');
  process.exit(1);
}

const problems = [];
let passes = 0;
function check(label, ok, detail = '') {
  if (ok) passes += 1;
  else problems.push(`${label}${detail ? ' — ' + detail : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${ok || !detail ? '' : ' — ' + detail}`);
}

// Served over http rather than file:// so the iframes share an origin with
// the page, which is what makes sessionStorage carry between screens.
const html = fs.readFileSync(FILE);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
});

await page.goto(base, { waitUntil: 'domcontentloaded' });

/** The screen currently rendered in the stage iframe. */
async function screen() {
  const handle = await page.waitForSelector('#stage');
  const frame = await handle.contentFrame();
  await frame.waitForSelector('.yanc-chrome', { timeout: 15000 });
  return frame;
}

let f = await screen();
check('bundle boots straight into the journey map',
  await f.locator('[data-yanc-screen="index"]').count() === 1);

// Journey map -> gateway, via a link that has no real URL to navigate to.
await f.click('a[href="gateway.html"] >> nth=0');
f = await screen();
check('map links route between screens inside the bundle',
  await f.locator('[data-yanc-screen="gateway"]').count() === 1);

await f.click('#role-member');
await f.click('#submit-btn');
await page.waitForTimeout(1200);
f = await screen();
check('signing in routes the member to the founder workspace',
  await f.locator('[data-yanc-screen="founder"]').count() === 1);
check('the persona carries into the frame',
  /Priya Nair/.test(await f.locator('[data-yanc-personatext]').innerText()));

// Deep link with a query string — there is no real location.search here.
await page.evaluate(() => window.YANC_SHELL.show('console.html?tab=bookings'));
f = await screen();
check('query parameters survive the frame shell',
  await f.locator('#view-bookings:not(.hidden)').count() === 1);

await page.evaluate(() => window.YANC_SHELL.show('console.html?tab=mentors'));
f = await screen();
await f.click('button:has-text("Schedule Call") >> nth=0');
await f.waitForSelector('#booking-modal:not(.hidden)');
await f.click('#btn-modal-checkout');
await f.waitForSelector('.yanc-toast', { timeout: 5000 });
check('booking confirms inside the bundle',
  /Booking confirmed/i.test(await f.locator('.yanc-toast').first().innerText()));

await page.evaluate(() => window.YANC_SHELL.show('mentor.html'));
f = await screen();
check('the booking carries to the mentor board across frames',
  await f.locator('.yanc-injected__row').count() >= 1);
await page.screenshot({ path: path.join(SHOTS, 'single-01-mentor.png') });

await f.fill('#escrowCode', '8491');
await f.click('#releaseBtn');
await page.waitForTimeout(400);
check('escrow release works in the bundle',
  /disbursed/i.test(await f.locator('.yanc-toast').last().innerText()));

await page.evaluate(() => window.YANC_SHELL.show('governance.html'));
f = await screen();
check('governance sees the release', await f.locator('.yanc-injected').count() >= 1);

// The address bar tracks the screen, so back should step the walkthrough.
check('the URL reflects the current screen', /#governance\.html/.test(page.url()), page.url());
await page.goBack();
f = await screen();
check('browser back steps to the previous screen',
  await f.locator('[data-yanc-screen="mentor"]').count() === 1);

// Everything the bundle ships must be inlined. The only remote URLs left are
// the exports' own headshots, which point at a Google CDN we cannot rehost —
// those are covered by the avatar fallback, checked below.
const externalCode = await page.evaluate(() => {
  const doc = document.getElementById('stage').contentDocument;
  return Array.from(doc.querySelectorAll('link[href], script[src]'))
    .map((n) => n.getAttribute('href') || n.getAttribute('src'))
    .filter((u) => /^https?:/.test(u));
});
check('no screen loads a remote stylesheet or script', externalCode.length === 0,
  externalCode.join(', '));

const externalImages = await page.evaluate(() => {
  const doc = document.getElementById('stage').contentDocument;
  return Array.from(doc.images)
    .map((n) => n.getAttribute('src'))
    .filter((u) => /^https?:/.test(u) && !/lh3\.googleusercontent\.com/.test(u));
});
check('the only remote images are the exports\' own headshots', externalImages.length === 0,
  externalImages.join(', '));

// With that host unreachable, no broken image may be left on screen.
await page.route('**://lh3.googleusercontent.com/**', (route) => route.abort());
await page.evaluate(() => window.YANC_SHELL.show('founder.html'));
f = await screen();
await page.waitForTimeout(700);
const broken = await page.evaluate(() => {
  const doc = document.getElementById('stage').contentDocument;
  return Array.from(doc.images).filter((i) => i.complete && i.naturalWidth === 0).length;
});
check('headshots fall back to initials when that host is unreachable', broken === 0,
  `broken=${broken}`);

const iconFont = await page.evaluate(() => {
  const doc = document.getElementById('stage').contentDocument;
  return /Material Symbols Outlined/.test(
    Array.from(doc.querySelectorAll('style')).map((s) => s.textContent).join(''));
});
check('the icon font is inlined into each screen', iconFont);

check('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' ;; '));

await browser.close();
server.close();

console.log(`\n${passes} passed, ${problems.length} failed`);
if (problems.length) {
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
