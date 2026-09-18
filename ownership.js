/* Spine shelf / ownership matrix — Codex hybrid lock 2026-09-18 */
(function (root) {
  const PRICE = {
    naitives: { buy: { amount: 24, label: '$24' }, borrow: { days: 14, label: '14 days' } },
    codriver: { buy: { amount: 14, label: '$14' }, borrow: { days: 14, label: '14 days' } }
  };
  const BORROW_DAYS = 14;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function isSoon(b) {
    return !b || b.status === 'Coming soon' || (!(b.chapters && b.chapters.length) && !(b.audio && b.audio.length));
  }
  function isAlaCarte(b) { return !!(b && PRICE[b.id]); }
  function isMemberIncluded(b) { return !!(b && !isSoon(b) && !isAlaCarte(b)); }
  function hasSampleText(b) { return !!(b && b.chapters && b.chapters.length); }
  function hasAudio(b) { return !!(b && b.audio && b.audio.length); }
  function freeChapterCount(b) {
    if (!b || !b.chapters || !b.chapters.length) return 0;
    return typeof b.freeChapterCount === 'number' ? b.freeChapterCount : 1;
  }

  function liveAccess(access, now) {
    const rec = access || { ok: false, kind: 'none' };
    const t = now == null ? Date.now() : now;
    if (rec.ok && rec.kind === 'borrowed' && rec.until && rec.until < t) {
      return { ok: false, kind: 'none', expired: true };
    }
    return rec;
  }

  function borrowDaysLeft(access, now) {
    const live = liveAccess(access, now);
    if (live.kind !== 'borrowed') return 0;
    if (!live.until) return BORROW_DAYS;
    const t = now == null ? Date.now() : now;
    return Math.max(0, Math.ceil((live.until - t) / 86400000));
  }

  function formatEnds(ts) {
    const d = new Date(ts);
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDuration(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(r);
    return m + ':' + pad2(r);
  }

  function progressLabel(book, progress) {
    if (!progress) return '';
    if (typeof progress.page === 'number' && progress.pages) {
      return 'p. ' + (progress.page + 1) + ' / ' + progress.pages;
    }
    if (typeof progress.page === 'number') return 'p. ' + (progress.page + 1);
    if (typeof progress.time === 'number' && progress.time > 0 && !hasSampleText(book)) {
      return formatDuration(progress.time);
    }
    return '';
  }

  function continueLabel(book, progress) {
    if (!progress) return '';
    if (typeof progress.page === 'number') return 'Continue p. ' + (progress.page + 1);
    if (typeof progress.time === 'number' && progress.time > 0 && !hasSampleText(book)) {
      return 'Continue ' + formatDuration(progress.time);
    }
    return '';
  }

  function resolveChip(input) {
    const book = input.book;
    const member = !!input.member;
    const access = liveAccess(input.access, input.now);
    const prog = progressLabel(book, input.progress);
    if (prog && !isSoon(book)) return { state: 'progress', label: prog };
    if (isSoon(book)) return { state: 'soon', label: 'Soon' };
    if (access.kind === 'borrowed') {
      return { state: 'borrowed', label: 'Borrowed · ' + borrowDaysLeft(access, input.now) + ' d' };
    }
    if (access.kind === 'owned') return { state: 'owned', label: 'Owned' };
    if (member && isMemberIncluded(book)) return { state: 'member', label: 'Member' };
    if (PRICE[book && book.id]) return { state: 'locked', label: PRICE[book.id].buy.label };
    return { state: 'locked', label: 'Locked' };
  }

  function ownershipLine(input) {
    const book = input.book;
    const member = !!input.member;
    const access = liveAccess(input.access, input.now);
    const extra = continueLabel(book, input.progress);
    const tail = extra ? ' · ' + extra : '';
    if (isSoon(book)) return 'Coming soon' + tail;
    if (member && isMemberIncluded(book)) return 'Archive member · included' + tail;
    if (access.kind === 'owned') return 'Owned' + tail;
    if (access.kind === 'borrowed') {
      const ends = access.until ? formatEnds(access.until) : formatEnds((input.now || Date.now()) + BORROW_DAYS * 86400000);
      return 'Borrowed · ends ' + ends + tail;
    }
    if (isAlaCarte(book)) return 'Buy to unlock full interior' + tail;
    if (isMemberIncluded(book)) return 'Included with Archive membership' + tail;
    const n = freeChapterCount(book);
    if (n > 0) return 'Sample · ' + n + ' chapter' + (n === 1 ? '' : 's') + ' free' + tail;
    return 'Coming soon' + tail;
  }

  function actionFlags(input) {
    const book = input.book;
    const member = !!input.member;
    const access = liveAccess(input.access, input.now);
    if (isSoon(book)) {
      return { soon: true, open: false, listen: false, buy: false, join: false, joinLink: false, order: false };
    }
    const listen = hasAudio(book);
    const open = hasSampleText(book);
    if (isAlaCarte(book)) {
      if (access.ok) return { soon: false, open: true, listen: false, buy: false, join: false, joinLink: false, order: false };
      return { soon: false, open: open, listen: false, buy: true, join: false, joinLink: true, order: false };
    }
    if (member) return { soon: false, open: open, listen: listen, buy: false, join: false, joinLink: false, order: false };
    return { soon: false, open: open, listen: listen, buy: false, join: true, joinLink: false, order: false };
  }

  function buySheetModel(input) {
    const book = input.book || {};
    const member = !!input.member;
    const access = liveAccess(input.access, input.now);
    const price = PRICE[book.id];
    if (isMemberIncluded(book)) {
      if (member || access.ok) return { variant: 'entitled-member', title: book.title };
      return { variant: 'member-included', title: book.title };
    }
    if (!price) return { variant: 'none', title: book.title };
    if (access.ok) return { variant: 'entitled-owned', title: book.title };
    return {
      variant: 'alacarte',
      title: book.title,
      buyLabel: 'Buy ' + price.buy.label,
      borrowLabel: 'Borrow ' + price.borrow.label,
      priceLabel: price.buy.label,
      days: price.borrow.days
    };
  }

  function safeNext(raw) {
    if (!raw) return '/';
    const next = String(raw);
    if (next.charAt(0) !== '/' || next.indexOf('//') === 0 || next.indexOf('\\') >= 0) return '/';
    return next;
  }

  const api = {
    PRICE,
    BORROW_DAYS,
    isSoon,
    isAlaCarte,
    isMemberIncluded,
    hasSampleText,
    hasAudio,
    freeChapterCount,
    liveAccess,
    borrowDaysLeft,
    formatEnds,
    formatDuration,
    progressLabel,
    continueLabel,
    resolveChip,
    ownershipLine,
    actionFlags,
    buySheetModel,
    safeNext
  };
  root.SpineOwnership = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
