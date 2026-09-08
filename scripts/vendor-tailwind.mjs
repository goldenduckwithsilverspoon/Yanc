/**
 * Replace the Tailwind Play CDN in each built page with a compiled stylesheet.
 *
 * The wireframe exports load `https://cdn.tailwindcss.com` and configure it
 * with an inline `tailwind.config = {...}`. That makes the demo depend on a
 * third-party CDN at view time, compile every class in the browser, and log
 * Tailwind's "should not be used in production" warning.
 *
 * This step evaluates each page's own config, compiles exactly the classes
 * that page uses with the Tailwind CLI, writes the result next to the page,
 * and rewrites the page to link it. Per-page stylesheets are deliberate: the
 * exports ship four mutually incompatible colour systems, so one shared build
 * would collide.
 *
 * Run after scripts/build.py:
 *   node scripts/vendor-tailwind.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'docs');
const OUT_DIR = path.join(DIST, 'assets', 'tw');

const CDN_SCRIPT = /<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>\s*/g;
const CONFIG_BLOCK = /<script(?: id="tailwind-config")?>\s*tailwind\.config\s*=\s*([\s\S]*?);?\s*<\/script>\s*/;

const ENTRY = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';

/** Pull the page's own `tailwind.config = {...}` object out of its inline script. */
function extractConfig(html) {
  const match = CONFIG_BLOCK.exec(html);
  if (!match) return null;
  const sandbox = { value: null };
  vm.createContext(sandbox);
  // The config is a plain object literal authored by the export — evaluating
  // it here is how the browser would have consumed it anyway.
  vm.runInContext(`value = (${match[1]})`, sandbox, { timeout: 2000 });
  return { config: sandbox.value, raw: match[0] };
}

function compile(name, config, htmlPath) {
  // Inside the repo so `require('@tailwindcss/forms')` resolves from
  // node_modules; Tailwind loads the config file with jiti from its own path.
  const tmp = fs.mkdtempSync(path.join(ROOT, '.tw-'));
  const configPath = path.join(tmp, 'tailwind.config.cjs');
  const inputPath = path.join(tmp, 'in.css');
  const outputPath = path.join(OUT_DIR, `${name}.css`);

  const plugins = [
    "require('@tailwindcss/forms')",
    "require('@tailwindcss/container-queries')",
  ];

  fs.writeFileSync(
    configPath,
    'module.exports = Object.assign(' +
      JSON.stringify({ ...config, content: [htmlPath] }) +
      `, { plugins: [${plugins.join(', ')}] });\n`
  );
  fs.writeFileSync(inputPath, ENTRY);

  execFileSync(
    path.join(ROOT, 'node_modules', '.bin', 'tailwindcss'),
    ['-c', configPath, '-i', inputPath, '-o', outputPath, '--minify'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] }
  );

  fs.rmSync(tmp, { recursive: true, force: true });
  return outputPath;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));
let converted = 0;

for (const page of pages) {
  const filePath = path.join(DIST, page);
  let html = fs.readFileSync(filePath, 'utf8');
  if (!CDN_SCRIPT.test(html)) continue;
  CDN_SCRIPT.lastIndex = 0;

  const name = page.replace(/\.html$/, '');
  const found = extractConfig(html);
  const config = found ? found.config : {};

  // Compile against the page as it stands (before the CDN script is stripped)
  // so every utility class in the markup is seen.
  const cssPath = compile(name, config, filePath);

  html = html.replace(CDN_SCRIPT, '');
  if (found) html = html.replace(found.raw, '');

  const link = `<link rel="stylesheet" href="assets/tw/${name}.css"/>\n`;
  // Tailwind must come before the page's own <style> overrides and before the
  // shell stylesheet, matching the order the CDN script produced.
  html = html.replace(/(<meta content="width=device-width[^>]*>\s*)/, `$1${link}`);
  if (!html.includes(link)) html = html.replace('</head>', `${link}</head>`);

  fs.writeFileSync(filePath, html);
  const kb = (fs.statSync(cssPath).size / 1024).toFixed(1);
  console.log(`  ${page} -> assets/tw/${name}.css (${kb} kB)`);
  converted += 1;
}

console.log(`vendored Tailwind for ${converted} page${converted === 1 ? '' : 's'}`);
