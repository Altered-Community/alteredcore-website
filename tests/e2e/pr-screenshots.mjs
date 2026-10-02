#!/usr/bin/env node
// Screenshots of a pull request, from the e2e evidence (E2E_EVIDENCE_DIR):
//   node tests/e2e/pr-screenshots.mjs <pr> [--dir <evidence dir>] [--only a,b] [--no-push]
// Each pair desktop-<name>.png / mobile-<name>.png becomes one image <name>.png, desktop and mobile side by side
// under a « Desktop » / « Mobile » label. The images are committed under <pr>/ on the orphan branch
// pr-screenshots of origin (the other folders stay), then the Markdown to paste in the PR body is printed.
// --no-push only writes the images in <evidence dir>/pr-<pr>/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BRANCH = 'pr-screenshots';
const REPO = 'Altered-Community/alteredcore-website';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const noPush = args.includes('--no-push');
if (noPush) args.splice(args.indexOf('--no-push'), 1);
const dir = resolve(option('--dir') ?? process.env['E2E_EVIDENCE_DIR'] ?? 'evidence');
const only = option('--only')?.split(',');
const pr = args[0];
if (!/^\d+$/.test(pr ?? '')) {
  console.error('usage: node tests/e2e/pr-screenshots.mjs <pr> [--dir <evidence dir>] [--only a,b] [--no-push]');
  process.exit(1);
}

const names = readdirSync(dir)
  .filter((f) => /^desktop-.+\.png$/.test(f))
  .map((f) => f.slice('desktop-'.length, -'.png'.length))
  .filter((n) => readdirSync(dir).includes(`mobile-${n}.png`) && (!only || only.includes(n)))
  .sort();
if (!names.length) {
  console.error(`no desktop-<name>.png / mobile-<name>.png pair in ${dir}`);
  process.exit(1);
}

const out = join(dir, `pr-${pr}`);
mkdirSync(out, { recursive: true });
const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const name of names) {
  // Both screenshots at the desktop height (900 px), the mobile one scaled down from its 2x capture.
  await page.setContent(`<!doctype html>
    <style>
      body { margin: 0; background: #fff; font: 700 28px system-ui, sans-serif; color: #0c1a32; }
      main { display: inline-flex; gap: 32px; padding: 16px 32px 32px; }
      figure { margin: 0; display: flex; flex-direction: column; gap: 12px; }
      img { height: 900px; display: block; }
    </style>
    <main>
      <figure><figcaption>Desktop</figcaption><img src="${dataUrl(join(dir, `desktop-${name}.png`))}"></figure>
      <figure><figcaption>Mobile</figcaption><img src="${dataUrl(join(dir, `mobile-${name}.png`))}"></figure>
    </main>`);
  await page.locator('main').screenshot({ path: join(out, `${name}.png`) });
}
await browser.close();

if (noPush) {
  console.log(`written in ${out}: ${names.map((n) => `${n}.png`).join(', ')}`);
  process.exit(0);
}

// New commit on top of origin/pr-screenshots with <pr>/<name>.png added, through a temporary index (the
// working tree and the current branch are not touched).
const git = (gitArgs, env = {}) => execFileSync('git', gitArgs, { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
git(['fetch', '-q', 'origin', BRANCH]);
const tmp = mkdtempSync(join(tmpdir(), 'pr-screenshots-'));
const env = { GIT_INDEX_FILE: join(tmp, 'index') };
try {
  git(['read-tree', `origin/${BRANCH}`], env);
  for (const name of names) {
    const blob = git(['hash-object', '-w', join(out, `${name}.png`)]);
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${pr}/${name}.png`], env);
  }
  const tree = git(['write-tree'], env);
  const commit = git(['commit-tree', tree, '-p', `origin/${BRANCH}`, '-m', `Screenshots for #${pr}`]);
  git(['push', '-q', 'origin', `${commit}:refs/heads/${BRANCH}`]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`pushed ${names.length} image(s) to ${BRANCH}/${pr}/. Markdown for the PR body:\n`);
for (const name of names) {
  console.log(`**${name}**: …\n\n![${name}](https://github.com/${REPO}/blob/${BRANCH}/${pr}/${name}.png?raw=true)\n`);
}
