/**
 * End-to-end smoke test for the YANC Connect user-flow demo.
 *
 * Serves ./docs, then walks the journey the way a reviewer would:
 * sign in at the gateway, book a mentor in the console, watch the booking
 * surface on the founder and mentor screens, release escrow, and resolve
 * the dispute in governance. Fails on any console error, page error,
 * failed same-origin request, dead nav link, or missing carried state.
 *
 *   node scripts/smoke.mjs
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'docs');
const SHOTS = path.join(ROOT, '.smoke-shots');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let file = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const problems = [];
const passed = [];

function check(label, ok, detail = '') {
  if (ok) passed.push(label);
  else problems.push(`${label}${detail ? ' — ' + detail : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${ok || !detail ? '' : ' — ' + detail}`);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`serving docs at ${base}\n`);

fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.setDefaultNavigationTimeout(20000);
const page = await ctx.newPage();

const consoleErrors = [];
const requestFailures = [];

page.on('console', (m) => {
  // "Failed to load resource" for a third-party host is the network, not the
  // demo — the avatar fallback below is what covers that case.
  if (m.type() !== 'error') return;
  if (/Failed to load resource/.test(m.text())) return;
  consoleErrors.push(`${page.url().replace(base, '')}: ${m.text()}`);
});
page.on('pageerror', (e) => consoleErrors.push(`${page.url().replace(base, '')}: ${e.message}`));
page.on('requestfailed', (r) => {
  // Only same-origin assets matter; third-party blocking is environmental.
  // ERR_ABORTED is a request the browser cancelled because we navigated away
  // (favicons in particular), not a missing file — the 4xx check below is the
  // one that would catch a genuinely absent asset.
  if (!r.url().startsWith(base)) return;
  const why = r.failure()?.errorText || '';
  if (why === 'net::ERR_ABORTED') return;
  requestFailures.push(`${r.url().replace(base, '')}: ${why}`);
});
page.on('response', (r) => {
  if (r.url().startsWith(base) && r.status() >= 400) requestFailures.push(`${r.url().replace(base, '')}: HTTP ${r.status()}`);
});

const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });

async function open(pathname) {
  await page.goto(base + pathname, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.yanc-chrome', { timeout: 8000 });
}

// ---------------------------------------------------------------- pages load

const PAGES = [
  'index.html', 'gateway.html', 'founder.html', 'console.html', 'mentor.html',
  'governance.html', 'architecture.html', 'journey.html',
  'wireframe-lofi.html', 'wireframe-hifi.html', 'wireframe-architecture.html',
];

console.log('— every page loads with the demo shell —');
for (const p of PAGES) {
  try {
    await open('/' + p);
    const hasChrome = await page.locator('.yanc-chrome').count();
    check(`${p} renders with chrome`, hasChrome === 1);
  } catch (e) {
    check(`${p} renders with chrome`, false, e.message.split('\n')[0]);
  }
}

// ------------------------------------------------------- no dead nav links

console.log('\n— navigation targets resolve —');
const targets = new Set();
for (const p of PAGES) {
  await open('/' + p);
  const hrefs = await page.$$eval('a[href]', (as) =>
    as.map((a) => a.getAttribute('href')).filter((h) => h && !/^(#|https?:|mailto:)/.test(h))
  );
  hrefs.forEach((h) => targets.add(h.split('#')[0].split('?')[0]));
}
for (const t of targets) {
  const exists = fs.existsSync(path.join(DIST, t));
  check(`link target ${t} exists`, exists);
}

// --------------------------------------------------------- the journey walk

console.log('\n— walking the journey —');

// Step 1: gateway, sign in as the member persona.
await open('/gateway.html?persona=member');
await shot('01-gateway');
check('gateway preselects the member persona',
  await page.locator('#role-member.bg-surface-container-lowest').count() === 1);
await page.click('#submit-btn');
await page.waitForURL(/founder\.html/, { timeout: 15000, waitUntil: 'commit' });
check('gateway signs in and routes the member to the founder workspace', true);

// Step 2: founder workspace knows who is signed in.
await page.waitForSelector('.yanc-chrome', { timeout: 8000 });
const persona = await page.locator('[data-yanc-personatext]').innerText();
check('chrome shows the signed-in persona', /Priya Nair/.test(persona), persona);
await shot('02-founder');

// Nav that used to be href="#" now goes somewhere.
const advisoryHref = await page.$$eval('a', (as) => {
  const hit = as.find((a) => a.textContent.trim().toLowerCase() === 'advisory board');
  return hit ? hit.getAttribute('href') : null;
});
check('founder nav "Advisory Board" is wired', advisoryHref === 'mentor.html', String(advisoryHref));

// Step 3: console — book a mentor.
await open('/console.html?tab=mentors');
check('console applies the member role from session',
  await page.locator('#role-member.bg-\\[\\#ff5c35\\]').count() === 1 ||
  (await page.locator('#credit-badge').innerText()).includes('Credits'));
await page.click('button:has-text("Schedule Call") >> nth=0');
await page.waitForSelector('#booking-modal:not(.hidden)', { timeout: 5000 });
await shot('03-console-booking-modal');
const modalTitle = await page.locator('#modal-mentor-name').innerText();
check('booking modal opens with the mentor name', /Book Slot:\s*\S/.test(modalTitle), modalTitle);

await page.click('#btn-modal-checkout');
await page.waitForSelector('.yanc-toast', { timeout: 5000 });
const toastText = await page.locator('.yanc-toast').first().innerText();
check('confirming the booking shows a non-blocking confirmation',
  /Booking confirmed/i.test(toastText), toastText.replace(/\n/g, ' | '));
check('booking closes the modal', await page.locator('#booking-modal.hidden').count() === 1);
check('booking switches to the bookings tab',
  await page.locator('#view-bookings:not(.hidden)').count() === 1);
await shot('04-console-booked');

const booked = await page.evaluate(() => window.YANC.read().bookings.length);
check('booking is recorded in session state', booked === 1, `bookings=${booked}`);
const credits = await page.evaluate(() => window.YANC.read().credits);
check('credits were spent', credits < 4, `credits=${credits}`);

// The vault tab used to blank the workspace — the shell builds the view.
await page.click('#tab-nav-vault');
await page.waitForTimeout(200);
check('vault tab renders a view instead of blanking',
  await page.locator('#view-vault:not(.hidden)').count() === 1);
check('vault view has document rows',
  await page.locator('#view-vault .yanc-vault__table tbody tr').count() >= 3);
await shot('05-console-vault');

// Step 4: the mentor sees the booking and releases escrow.
await open('/mentor.html');
check('mentor board shows the inbound booking from this session',
  await page.locator('.yanc-injected__row').count() >= 1);
await shot('06-mentor');

await page.click('#releaseBtn');
await page.waitForSelector('.yanc-toast', { timeout: 5000 });
check('releasing escrow without a code is refused',
  /4-digit/i.test(await page.locator('.yanc-toast').first().innerText()));

await page.fill('#escrowCode', '8491');
await page.click('#releaseBtn');
await page.waitForTimeout(300);
const releaseToast = await page.locator('.yanc-toast').last().innerText();
check('releasing escrow with the code succeeds', /disbursed/i.test(releaseToast),
  releaseToast.replace(/\n/g, ' | '));
check('escrow release is recorded', await page.evaluate(() => window.YANC.read().escrowReleased) === true);
await shot('07-mentor-released');

// Step 5: governance reflects it and can resolve the dispute.
await open('/governance.html');
check('governance shows the escrow release from this session',
  await page.locator('.yanc-injected').count() >= 1);
await page.click('button:has-text("50% Partial Refund")');
await page.waitForTimeout(300);
check('dispute remediation is recorded',
  await page.evaluate(() => window.YANC.read().disputeResolution) === '50% partial refund');
check('an audit entry is written', await page.locator('.yanc-audit').count() >= 1);
await shot('08-governance-resolved');

await page.click('button:has-text("Approve") >> nth=0');
await page.waitForTimeout(250);
check('approving an advisor writes a second audit entry',
  await page.locator('.yanc-audit').count() >= 2);

// ------------------------------------------------------------- chrome works

console.log('\n— demo chrome —');
await open('/console.html');
await page.click('[data-yanc-act="menu"]');
await page.waitForTimeout(150);
check('screen menu opens', await page.locator('.yanc-menu:not([hidden])').count() === 1);
check('screen menu lists every screen',
  await page.locator('.yanc-menu__item').count() === PAGES.length);

await page.click('[data-yanc-act="reset"]');
await page.waitForURL(/index\.html/, { timeout: 15000, waitUntil: 'commit' });
await page.waitForSelector('.yanc-chrome', { timeout: 10000 });
check('reset returns to the journey map and clears state',
  await page.evaluate(() => window.YANC.read().bookings.length) === 0);

// ------------------------------------------------------------- responsive

console.log('\n— responsive —');
await page.setViewportSize({ width: 390, height: 844 });
await open('/index.html');
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('journey map does not scroll horizontally on mobile', overflow <= 1, `overflow=${overflow}px`);
await shot('09-mobile-index');

await open('/gateway.html');
const overflow2 = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('gateway does not scroll horizontally on mobile', overflow2 <= 1, `overflow=${overflow2}px`);

// ---------------------------------------------------- graceful degradation

console.log('\n— degradation —');

// The exports point their headshots at ephemeral Google CDN URLs. Simulate
// that host being unreachable and confirm no broken images are left behind.
const blocked = await ctx.newPage();
await blocked.route('**://lh3.googleusercontent.com/**', (route) => route.abort());
await blocked.goto(base + '/founder.html', { waitUntil: 'domcontentloaded' });
await blocked.waitForSelector('.yanc-chrome', { timeout: 10000 });
await blocked.waitForTimeout(600);
const broken = await blocked.evaluate(() =>
  Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length);
check('no broken images when the avatar CDN is unreachable', broken === 0, `broken=${broken}`);
const fellBack = await blocked.evaluate(() =>
  document.querySelectorAll('img[data-yanc-fallback]').length);
check('avatars fall back to generated initials', fellBack > 0, `replaced=${fellBack}`);
await blocked.screenshot({ path: path.join(SHOTS, '10-avatar-fallback.png') });
await blocked.close();

// Every asset the built pages reference must actually exist in dist.
console.log('\n— assets —');
const assetRefs = new Set();
for (const p of PAGES) {
  const html = fs.readFileSync(path.join(DIST, p), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="((?!https?:|data:|mailto:|#)[^"]+)"/g)) {
    assetRefs.add(m[1].split('#')[0].split('?')[0]);
  }
}
const missing = [...assetRefs].filter((a) => !fs.existsSync(path.join(DIST, a)));
check(`all ${assetRefs.size} referenced assets exist`, missing.length === 0, missing.join(', '));

const fontCss = path.join(DIST, 'assets', 'fonts.css');
check('web fonts are self-hosted', fs.existsSync(fontCss) &&
  !/https:\/\/fonts\.gstatic\.com/.test(fs.readFileSync(fontCss, 'utf8')));
check('no page still loads the Tailwind CDN',
  PAGES.every((p) => !fs.readFileSync(path.join(DIST, p), 'utf8').includes('cdn.tailwindcss.com')));

// ------------------------------------------------------------------ report

console.log('\n— runtime errors —');
check('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 8).join(' ;; '));
check('no failed same-origin requests', requestFailures.length === 0, requestFailures.slice(0, 8).join(' ;; '));

await browser.close();
server.close();

console.log(`\n${passed.length} passed, ${problems.length} failed`);
if (problems.length) {
  console.log('\nfailures:');
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log(`screenshots in ${path.relative(ROOT, SHOTS)}/`);
