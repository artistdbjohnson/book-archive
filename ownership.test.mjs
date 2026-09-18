import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx = { globalThis: {}, module: { exports: {} }, Date, Math, String, Number };
ctx.globalThis = ctx;
vm.runInNewContext(readFileSync(new URL('./ownership.js', import.meta.url), 'utf8'), ctx);
const S = ctx.SpineOwnership;

const naitives = { id: 'naitives', title: 'new nAItives', chapters: [{}, {}, {}], freeChapterCount: 1 };
const codriver = { id: 'codriver', title: 'CO-DRIVER', chapters: [{}], freeChapterCount: 1 };
const firstWater = {
  id: 'qf-first-water',
  title: 'Quantum Frontier: First Water',
  chapters: [{}],
  audio: ['/api/audio?book=first-water']
};
const soon = { id: 'qf-citizen-glow', title: 'Citizen Glow', status: 'Coming soon', chapters: [] };
const emptyMs = { id: 'qf-perimeter-sample', title: 'Perimeter Sample', status: 'Manuscript', chapters: [] };
const now = Date.UTC(2026, 8, 18);
const borrowUntil = now + 14 * 86400000;

function plain(v){ return v && typeof v==='object' ? JSON.parse(JSON.stringify(v)) : v; }
function chip(book, extra) {
  return plain(S.resolveChip(Object.assign({ book, member: false, access: { ok: false, kind: 'none' }, now }, extra)));
}
function line(book, extra) {
  return S.ownershipLine(Object.assign({ book, member: false, access: { ok: false, kind: 'none' }, now }, extra));
}
function flags(book, extra) {
  return plain(S.actionFlags(Object.assign({ book, member: false, access: { ok: false, kind: 'none' }, now }, extra)));
}

assert.deepEqual(chip(naitives), { state: 'locked', label: '$24' });
assert.deepEqual(chip(codriver), { state: 'locked', label: '$14' });
assert.deepEqual(chip(firstWater), { state: 'locked', label: 'Locked' });
assert.deepEqual(chip(firstWater, { member: true }), { state: 'member', label: 'Member' });
assert.deepEqual(chip(naitives, { member: true }), { state: 'locked', label: '$24' });
assert.deepEqual(chip(naitives, { access: { ok: true, kind: 'owned' } }), { state: 'owned', label: 'Owned' });
assert.deepEqual(chip(naitives, { access: { ok: true, kind: 'borrowed', until: borrowUntil } }), { state: 'borrowed', label: 'Borrowed · 14 d' });
assert.deepEqual(chip(naitives, { progress: { page: 11, pages: 29 } }), { state: 'progress', label: 'p. 12 / 29' });
assert.deepEqual(chip(soon), { state: 'soon', label: 'Soon' });
assert.deepEqual(chip(emptyMs), { state: 'soon', label: 'Soon' });

assert.equal(line(naitives), 'Buy to unlock full interior');
assert.equal(line(naitives, { access: { ok: true, kind: 'owned' } }), 'Owned');
assert.equal(line(naitives, { access: { ok: true, kind: 'borrowed', until: borrowUntil } }), 'Borrowed · ends ' + S.formatEnds(borrowUntil));
assert.equal(line(firstWater), 'Included with Archive membership');
assert.equal(line(firstWater, { member: true }), 'Archive member · included');
assert.equal(line(firstWater, { member: true, progress: { page: 0, pages: 4 } }), 'Archive member · included · Continue p. 1');
assert.equal(line(soon), 'Coming soon');

assert.deepEqual(flags(naitives), { soon: false, open: true, listen: false, buy: true, join: false, joinLink: true, order: false });
assert.deepEqual(flags(naitives, { access: { ok: true, kind: 'owned' } }), { soon: false, open: true, listen: false, buy: false, join: false, joinLink: false, order: false });
assert.deepEqual(flags(firstWater), { soon: false, open: true, listen: true, buy: false, join: true, joinLink: false, order: false });
assert.deepEqual(flags(firstWater, { member: true }), { soon: false, open: true, listen: true, buy: false, join: false, joinLink: false, order: false });
assert.deepEqual(flags(soon), { soon: true, open: false, listen: false, buy: false, join: false, joinLink: false, order: false });

assert.equal(S.buySheetModel({ book: naitives }).variant, 'alacarte');
assert.equal(S.buySheetModel({ book: naitives, access: { ok: true, kind: 'owned' } }).variant, 'entitled-owned');
assert.equal(S.buySheetModel({ book: firstWater }).variant, 'member-included');
assert.equal(S.buySheetModel({ book: firstWater, member: true }).variant, 'entitled-member');
assert.equal(S.buySheetModel({ book: emptyMs }).variant, 'none');
assert.equal(S.buySheetModel({ book: naitives }).buyLabel, 'Buy $24');
assert.equal(S.buySheetModel({ book: codriver }).buyLabel, 'Buy $14');

assert.equal(S.safeNext(null), '/');
assert.equal(S.safeNext('/listen'), '/listen');
assert.equal(S.safeNext('https://evil.example'), '/');
assert.equal(S.safeNext('//evil.example'), '/');

assert.equal(S.formatDuration(3852), '1:04:12');
assert.equal(S.isMemberIncluded(firstWater), true);
assert.equal(S.isMemberIncluded(naitives), false);
assert.equal(S.isAlaCarte(naitives), true);

console.log('ownership matrix ok');
