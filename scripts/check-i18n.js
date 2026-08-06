'use strict';

// Coverage check for the translation table: every data-t key in index.html and every
// t() key in page.js must exist in both languages. No table entry may sit unused.
// Run with: node scripts/check-i18n.js
//
// It also compares the two languages recursively, so a missing item inside phase, msg
// or one of the arrays is reported the same way as a missing top-level key.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'page.js'), 'utf8');

global.window = {};
require(path.join(root, 'i18n.js'));
const I18N = global.window.I18N;

// Every key path in one language, "phase.START" style for nested entries.
function paths(obj, prefix) {
  const out = [];
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...paths(v, p));
    else if (Array.isArray(v)) { out.push(p); v.forEach((_, i) => out.push(p + '[' + i + ']')); }
    else out.push(p);
  });
  return out;
}

const de = paths(I18N.de, '');
const en = paths(I18N.en, '');
const missingEn = de.filter(k => !en.includes(k));
const missingDe = en.filter(k => !de.includes(k));

const usedHtml = new Set();
const attr = /data-t="([^"]+)"/g;
let m;
while ((m = attr.exec(html)) !== null) usedHtml.add(m[1]);

const usedJs = new Set();
const call = /\bt\(\s*["']([A-Za-z0-9_]+)["']\s*\)/g;
while ((m = call.exec(app)) !== null) usedJs.add(m[1]);
// Keys reached through a variable appear as plain literals, in either quote style.
const literal = /["']([A-Za-z0-9_]+)["']/g;
const literals = new Set();
while ((m = literal.exec(app)) !== null) literals.add(m[1]);
// Keys the page assembles at run time, so they never stand there as a literal:
// okStock and the bad* family come from the verdict reason, as "bad" + Reason,
// and the arrays are read straight off window.I18N[lang].
const dynamic = new Set([
  'okStock', 'badUnreadable', 'badVersion', 'badRange', 'badSize', 'badContent',
  'featCommon', 'featKickExtra', 'dlgPoints', 'dlgPointsErase',
]);

const top = Object.keys(I18N.de);
const missingKeys = [...usedHtml, ...usedJs].filter(k => !top.includes(k));
const unused = top.filter(k => {
  if (dynamic.has(k)) return false;
  return !usedHtml.has(k) && !usedJs.has(k) && !literals.has(k);
});

let bad = 0;
function report(title, list) {
  if (!list.length) { console.log('ok   ' + title + ': none'); return; }
  bad += list.length;
  console.log('FAIL ' + title + ': ' + list.join(', '));
}

console.log('de entries: ' + de.length + '   en entries: ' + en.length);
console.log('data-t keys in index.html: ' + usedHtml.size + '   t() keys in page.js: ' + usedJs.size);
report('missing in en', missingEn);
report('missing in de', missingDe);
report('used but not in the table', missingKeys);
report('in the table but used nowhere', unused);
console.log(bad ? 'result: ' + bad + ' problem(s)' : 'result: clean');
process.exit(bad ? 1 : 0);
