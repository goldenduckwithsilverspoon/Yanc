/**
 * Self-host the web fonts each page loads from Google Fonts.
 *
 * Two reasons, one of them a correctness bug rather than a nicety:
 *
 * 1. A `<script defer>` does not execute until every pending stylesheet has
 *    resolved. The exports load two or three Google Fonts stylesheets in
 *    `<head>`, so on a network where those hang, the demo shell never boots
 *    and the page is dead — no chrome, no navigation, no wiring.
 * 2. It removes a third-party request from every page load.
 *
 * Text faces (Plus Jakarta Sans, JetBrains Mono, Inter) are downloaded with
 * their latin subsets. Material Symbols is requested as an `icon_names`
 * subset containing only the ligatures the demo actually uses, which turns a
 * multi-megabyte variable icon font into ~70 kB. Both are rewritten to local
 * URLs, so a built page makes no third-party requests at all.
 *
 * Run after scripts/build.py:
 *   node scripts/vendor-fonts.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'docs');
const FONT_DIR = path.join(DIST, 'assets', 'fonts');
const CSS_OUT = path.join(DIST, 'assets', 'fonts.css');
const CACHE = path.join(ROOT, '.font-cache');

// Chrome UA so Google Fonts serves woff2 rather than ttf.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Only these subsets — the demo is English + ₹.
const KEEP_SUBSETS = /\/\*\s*(latin|latin-ext)\s*\*\//;

const LINK_RE = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"[^>]*\/?>/g;
const ICON_USE_RE = /class="material-symbols-outlined[^"]*"[^>]*>\s*([a-z0-9_]+)\s*</g;
const ICON_AXES = 'opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
// Attribute order varies between exports, so match the tag then filter.
const PRECONNECT_RE = /<link\b[^>]*\/?>\s*/g;

/** hrefs come out of the HTML with `&amp;` — Google Fonts silently ignores
    the mangled params, which would drop every family after the first. */
function decodeHref(href) {
  return href.replace(/&amp;/g, '&');
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchBinary(url) {
  const key = crypto.createHash('sha1').update(url).digest('hex');
  const cached = path.join(CACHE, key);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, buf);
  return buf;
}

/** Split a Google Fonts stylesheet into `/* subset *\/ @font-face {...}` blocks. */
function faceBlocks(css) {
  const blocks = [];
  const re = /(\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]*\}/g;
  let m;
  while ((m = re.exec(css))) blocks.push(m[0]);
  return blocks;
}

fs.mkdirSync(FONT_DIR, { recursive: true });

const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));

// ---- collect every distinct text-font stylesheet across the pages --------

const textSheets = new Set();
const iconNames = new Set();
let usesIcons = false;

for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST, page), 'utf8');
  for (const m of html.matchAll(LINK_RE)) {
    if (/Material\+Symbols/.test(m[1])) usesIcons = true;
    else textSheets.add(m[1]);
  }
  for (const m of html.matchAll(ICON_USE_RE)) iconNames.add(m[1]);
}

// ---- download the faces and build one local stylesheet -------------------

const seenFiles = new Map();
let combined = '/* Self-hosted from Google Fonts by scripts/vendor-fonts.mjs */\n';
let faceCount = 0;

const seenBlocks = new Set();

for (const sheet of textSheets) {
  const css = await fetchText(decodeHref(sheet));
  for (const block of faceBlocks(css)) {
    if (!KEEP_SUBSETS.test(block)) continue;
    if (seenBlocks.has(block)) continue;
    seenBlocks.add(block);
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(block);
    if (!url) continue;

    let local = seenFiles.get(url[1]);
    if (!local) {
      const buf = await fetchBinary(url[1]);
      local = path.basename(new URL(url[1]).pathname).replace(/[^\w.-]/g, '_');
      // gstatic filenames are opaque hashes; prefix with the family for sanity.
      const family = /font-family:\s*'([^']+)'/.exec(block);
      local = `${(family ? family[1] : 'font').replace(/\s+/g, '-')}-${local}`;
      if (!local.endsWith('.woff2')) local += '.woff2';
      fs.writeFileSync(path.join(FONT_DIR, local), buf);
      seenFiles.set(url[1], local);
    }

    combined += block.replace(url[1], `fonts/${local}`) + '\n';
    faceCount += 1;
  }
}

// ---- icon subset ---------------------------------------------------------
// Requesting the icon font by `icon_names` returns a subset with only these
// ligatures — the difference between ~70 kB and several megabytes.

let iconNote = 'no icon font needed';
if (usesIcons && iconNames.size) {
  const names = [...iconNames].sort().join(',');
  const sheet = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${ICON_AXES}` +
                `&icon_names=${names}&display=block`;
  const css = await fetchText(sheet);
  const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(css);
  if (!url) throw new Error('icon subset returned no font URL');
  const buf = await fetchBinary(url[1]);
  const local = 'material-symbols-subset.woff2';
  fs.writeFileSync(path.join(FONT_DIR, local), buf);
  // Keep the class rules Google ships (sizing, ligature settings, axes).
  combined += css.replace(url[1], `fonts/${local}`) + '\n';
  iconNote = `${iconNames.size} icons subset to ${(buf.length / 1024).toFixed(0)} kB`;
}

fs.writeFileSync(CSS_OUT, combined);

// ---- rewrite the pages ---------------------------------------------------

const localLink = '<link rel="stylesheet" href="assets/fonts.css"/>';

for (const page of pages) {
  const filePath = path.join(DIST, page);
  let html = fs.readFileSync(filePath, 'utf8');
  if (!LINK_RE.test(html)) continue;
  LINK_RE.lastIndex = 0;

  // One local stylesheet replaces every Google Fonts link on the page —
  // text faces and the icon subset alike. Several exports ship the Material
  // Symbols link two or three times over; all of them collapse into this.
  let placedLocal = false;
  html = html.replace(LINK_RE, () => {
    if (placedLocal) return '';
    placedLocal = true;
    return localLink;
  });

  // Preconnects to hosts we no longer block on.
  html = html.replace(PRECONNECT_RE, (tag) =>
    /rel="preconnect"/.test(tag) && /fonts\.(googleapis|gstatic)\.com/.test(tag) ? '' : tag);

  fs.writeFileSync(filePath, html);
}

const bytes = fs.readdirSync(FONT_DIR).reduce((n, f) => n + fs.statSync(path.join(FONT_DIR, f)).size, 0);
console.log(
  `self-hosted ${fs.readdirSync(FONT_DIR).length} font files / ${faceCount} text faces ` +
  `(${(bytes / 1024).toFixed(0)} kB total); ${iconNote}`
);
