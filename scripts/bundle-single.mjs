/**
 * Bundle the built site into one self-contained HTML file.
 *
 * Some hosts take a single file rather than a directory. This inlines every
 * stylesheet, script, font and image from `docs/` and emits one page that
 * renders each screen into a same-origin `srcdoc` iframe.
 *
 * Iframes rather than one merged document on purpose: the exports ship four
 * mutually incompatible Tailwind colour systems and each sets its own `body`
 * background, so merging them into a single document would have them fight.
 * A srcdoc iframe keeps each screen's CSS in its own document while still
 * sharing the parent's origin — which is what lets `sessionStorage` carry the
 * demo state from one screen to the next exactly as it does on a static host.
 *
 *   node scripts/bundle-single.mjs   # -> docs-single/yanc-connect-demo.html
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'docs');
const OUT_DIR = path.join(ROOT, 'docs-single');
const OUT = path.join(OUT_DIR, 'yanc-connect-demo.html');

const ENTRY = 'index.html';

// Stylesheets every screen loads. Inlining these eleven times over is what
// pushed the first bundle past 16 MB (the self-hosted fonts alone are ~360 kB
// before base64), so they are stored once and spliced in at render time.
const SHARED = ['assets/fonts.css', 'assets/flow.css'];
const SHARED_MARKER = '<!--yanc-shared-css-->';

// The gallery thumbnails on the journey map are full-page screen captures.
// At bundle scale they only need to be legible as thumbnails.
const THUMB_WIDTH = 900;
const THUMBS = path.join(OUT_DIR, '.thumbs');

function shrinkImages() {
  fs.mkdirSync(THUMBS, { recursive: true });
  execFileSync('python3', ['-c', `
import sys, pathlib
from PIL import Image
src, dst, width = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), int(sys.argv[3])
for f in sorted(src.iterdir()):
    if f.suffix.lower() not in {'.png', '.jpg', '.jpeg'}:
        continue
    im = Image.open(f).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dst / (f.stem + '.jpg'), quality=82, optimize=True)
`, path.join(DIST, 'reference'), THUMBS, String(THUMB_WIDTH)], { stdio: ['ignore', 'ignore', 'pipe'] });
}

const MIME = {
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function dataUri(rel) {
  // Reference captures are served from the downscaled cache.
  let file = path.join(DIST, rel);
  if (rel.startsWith('reference/')) {
    const thumb = path.join(THUMBS, path.basename(rel).replace(/\.[^.]+$/, '.jpg'));
    if (fs.existsSync(thumb)) file = thumb;
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** Inline a stylesheet, resolving the url() references inside it. */
function inlineCss(rel) {
  let css = fs.readFileSync(path.join(DIST, rel), 'utf8');
  const dir = path.posix.dirname(rel);
  css = css.replace(/url\(([^)"']+)\)/g, (whole, ref) => {
    const clean = ref.trim().replace(/^["']|["']$/g, '');
    if (/^(data:|https?:)/.test(clean)) return whole;
    const target = path.posix.normalize(path.posix.join(dir, clean));
    if (!fs.existsSync(path.join(DIST, target))) return whole;
    return `url(${dataUri(target)})`;
  });
  return css;
}

/** Turn one built page into a standalone document string. */
function inlinePage(file) {
  let html = fs.readFileSync(path.join(DIST, file), 'utf8');

  let sharedPlaced = false;
  html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, (tag) => {
    const href = /href="([^"]+)"/.exec(tag);
    if (!href || /^https?:/.test(href[1])) return tag;
    if (SHARED.includes(href[1])) {
      if (sharedPlaced) return '';
      sharedPlaced = true;
      return SHARED_MARKER;
    }
    return `<style>${inlineCss(href[1])}</style>`;
  });

  html = html.replace(/<link[^>]+rel="icon"[^>]*>/g, '');

  html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
    if (/^https?:/.test(src)) return tag;
    const js = fs.readFileSync(path.join(DIST, src), 'utf8');
    return `<script>${js}</script>`;
  });

  html = html.replace(/src="((?!https?:|data:)[^"]+\.(?:png|jpe?g|svg))"/g, (tag, src) =>
    fs.existsSync(path.join(DIST, src)) ? `src="${dataUri(src)}"` : tag);

  return html;
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
shrinkImages();

const sharedCss = SHARED.map(inlineCss).join('\n');

const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));
const screens = {};
for (const page of pages) screens[page] = inlinePage(page);

// A screen's own inline scripts contain "</script>", which would close the
// wrapper block early; escape it and undo that when reading the block back.
const blocks = pages
  .map((p) => `<script type="text/html" data-screen="${p}">\n${screens[p].replace(/<\/script/g, '<\\/script')}\n</script>`)
  .join('\n');

const shell = `<title>YANC Connect Walkthrough</title>
<style>
  html, body { height: 100%; margin: 0; background: #f8fafc; }
  #stage { display: block; width: 100%; height: 100vh; border: 0; }
  #boot {
    position: fixed; inset: 0; display: grid; place-items: center;
    font: 600 14px/1.4 "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #5b6b7f; background: #f8fafc;
  }
</style>

<div id="boot">Loading the YANC Connect demo…</div>
<iframe id="stage" title="YANC 1-on-1 Connect demo"></iframe>

${blocks}

<script type="text/css" data-shared>${sharedCss.replace(/<\/script/g, '<\\/script')}</script>

<script>
(function () {
  var SCREENS = {};
  Array.prototype.forEach.call(document.querySelectorAll('script[data-screen]'), function (el) {
    SCREENS[el.getAttribute('data-screen')] = el.textContent.replace(/<\\\\\\/script/g, '</script');
    el.remove();
  });

  var sharedEl = document.querySelector('script[data-shared]');
  var SHARED_CSS = sharedEl ? '<style>' + sharedEl.textContent + '</style>' : '';
  if (sharedEl) sharedEl.remove();

  var stage = document.getElementById('stage');
  var boot = document.getElementById('boot');
  var search = '';

  function split(href) {
    var hash = href.indexOf('#');
    if (hash > -1) href = href.slice(0, hash);
    var q = href.indexOf('?');
    return q > -1 ? { file: href.slice(0, q), search: href.slice(q) } : { file: href, search: '' };
  }

  window.YANC_SHELL = {
    has: function (href) { return Object.prototype.hasOwnProperty.call(SCREENS, split(href).file); },
    search: function () { return search; },
    show: function (href) {
      var parts = split(href);
      if (!SCREENS[parts.file]) return;
      search = parts.search;
      // Reflect the screen in the address bar so a view is linkable and the
      // browser's back button steps through the walkthrough.
      if (location.hash.slice(1) !== parts.file + parts.search) {
        history.pushState(null, '', '#' + parts.file + parts.search);
      }
      stage.srcdoc = SCREENS[parts.file].replace('${SHARED_MARKER}', SHARED_CSS);
      if (boot) { boot.remove(); boot = null; }
    }
  };

  window.addEventListener('popstate', function () { fromHash(); });

  function fromHash() {
    var want = decodeURIComponent(location.hash.slice(1));
    var parts = split(want);
    window.YANC_SHELL.show(SCREENS[parts.file] ? want : '${ENTRY}');
  }

  fromHash();
})();
</script>
`;

fs.writeFileSync(OUT, shell);
fs.rmSync(THUMBS, { recursive: true, force: true });

console.log(
  `bundled ${pages.length} screens into ${path.relative(ROOT, OUT)} ` +
  `(${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`
);
