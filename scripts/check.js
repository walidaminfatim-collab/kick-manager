'use strict';
// Offline project checks: JS syntax, relative imports, Manifest V3 sanity, EN/AR translation parity.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
let failures = 0;
const fail = (m) => { failures++; console.error('  ✗', m); };
const ok = (m) => console.log('  ✓', m);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(root);
const js = files.filter((f) => f.endsWith('.js'));

console.log('JavaScript syntax');
for (const f of js) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  r.status === 0 ? null : fail(`${path.relative(root, f)}\n${r.stderr}`);
}
if (!failures) ok(`${js.length} files parse`);

console.log('Relative imports / script references');
const before = failures;
for (const f of js) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/require\((['"])(\.{1,2}\/[^'"]+)\1\)/g)) {
    const base = path.resolve(path.dirname(f), m[2]);
    const cands = [base, base + '.js', base + '.json', path.join(base, 'index.js')];
    if (!cands.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) fail(`${path.relative(root, f)} -> ${m[2]} not found`);
  }
  for (const m of src.matchAll(/importScripts\(([^)]*)\)/g)) {
    for (const s of m[1].matchAll(/['"]([^'"]+)['"]/g)) if (!fs.existsSync(path.resolve(path.dirname(f), s[1]))) fail(`${path.relative(root, f)} importScripts ${s[1]} missing`);
  }
}
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(https?:|data:)/.test(m[1])) continue;
    if (!fs.existsSync(path.resolve(path.dirname(f), m[1]))) fail(`${path.relative(root, f)} references missing ${m[1]}`);
  }
}
if (failures === before) ok('all internal imports resolve');

console.log('Chrome Manifest V3');
const mfPath = path.join(root, 'extension/manifest.json');
try {
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.manifest_version === 3 ? ok('manifest_version 3') : fail('manifest_version must be 3');
  const refs = [mf.action?.default_popup, mf.options_page, mf.background?.service_worker, ...Object.values(mf.icons || {}), ...Object.values(mf.action?.default_icon || {})];
  refs.filter(Boolean).forEach((r) => (fs.existsSync(path.join(root, 'extension', r)) ? null : fail(`manifest references missing file ${r}`)));
  ok('manifest file references exist');
  const cfg = fs.readFileSync(path.join(root, 'extension/config.js'), 'utf8').match(/BACKEND_URL:\s*'([^']+)'/);
  if (cfg) {
    const origin = new URL(cfg[1]).origin + '/*';
    (mf.host_permissions || []).includes(origin) ? ok(`host_permissions covers BACKEND_URL (${origin})`) : fail(`host_permissions must include ${origin}`);
  }
  if (JSON.stringify(mf).includes('unsafe-eval')) fail('unsafe-eval is not allowed');
} catch (e) { fail('manifest.json: ' + e.message); }

console.log('Translations (en/ar)');
{
  global.globalThis.chrome = {};
  const code = fs.readFileSync(path.join(root, 'extension/i18n.js'), 'utf8');
  const sandbox = {}; new Function('globalThis', code)(sandbox);
  const { en, ar } = sandbox.KM.dictionaries;
  const missingAr = Object.keys(en).filter((k) => !(k in ar)), missingEn = Object.keys(ar).filter((k) => !(k in en));
  missingAr.length || missingEn.length ? fail(`missing keys ar:[${missingAr}] en:[${missingEn}]`) : ok(`${Object.keys(en).length} keys in both languages`);
  const used = new Set();
  for (const f of files.filter((x) => /extension\/.*\.(js|html)$/.test(x) && !x.endsWith('i18n.js'))) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\bt\('([a-z_]+)'\)|data-i18n(?:-placeholder)?="([a-z_]+)"/g)) used.add(m[1] || m[2]);
    for (const m of s.matchAll(/\bt\("([a-z_]+)"\)/g)) used.add(m[1]);
    for (const m of s.matchAll(/confirmAsk\('([a-z_]+)'\)/g)) used.add(m[1]);
  }
  const undefinedKeys = [...used].filter((k) => !(k in en));
  undefinedKeys.length ? fail(`used but undefined translation keys: ${undefinedKeys}`) : ok('every used key is defined');
}

console.log(failures ? `\n${failures} problem(s) found` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
