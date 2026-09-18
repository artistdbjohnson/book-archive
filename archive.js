/* sooty reader 2026-09-18 */
const $ = id => document.getElementById(id);
const STORE = 'dglxss-archive-pwa-v1';
const PRICE = {
  naitives: { buy:{amount:24,label:'$24'}, borrow:{days:14,label:'14 days'} },
  codriver: { buy:{amount:14,label:'$14'}, borrow:{days:14,label:'14 days'} }
};
function loadStore(){ try{ return JSON.parse(localStorage.getItem(STORE)||'{}'); }catch(e){ return {}; } }
function saveStore(s){ localStorage.setItem(STORE, JSON.stringify(s)); }
function getProgress(id){ return (loadStore().progress||{})[id] || null; }
function saveProgress(id, p){ const s=loadStore(); s.progress=s.progress||{}; s.progress[id]=Object.assign({}, s.progress[id]||{}, p); saveStore(s); }
function getAccess(id){ return (loadStore().access||{})[id] || {ok:false,kind:'none'}; }
function unlockBook(id, kind){ const s=loadStore(); s.access=s.access||{}; s.access[id]={ok:true,kind}; saveStore(s); }
function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const BOOKS = [
  {id:'naitives', title:'new nAItives', subtitle:'Becoming AI Native: A Field Manual', year:2026, type:'Non-fiction', status:'Published', freeChapterCount:1,
    blurb:'A field manual for moving a shop off human-legible process and onto machine-legible architecture.',
    chapters:[{label:'Front Matter', text:'new nAItives\n\nBecoming AI Native: A Field Manual\n\nby .dglxss\n\nA field manual for moving a shop off human-legible process and onto machine-legible architecture.'}]},
  {id:'codriver', title:'CO-DRIVER', subtitle:'Part One: Deadhead', year:2026, type:'Fiction', status:'Draft', freeChapterCount:1,
    blurb:'A long-haul driver, an autonomous unit named Charley, and the slow erasure of human authority on the northern plains.',
    chapters:[{label:'One. Wamsutter', text:'The skirt bracket only made noise between sixty-two and sixty-eight.\n\nThe crack showed in April, a hairline through the mount where the fairing tied into the frame rail.'}]},
  {id:'qf-first-water', title:'Quantum Frontier: First Water', subtitle:'Sera Holt \u00b7 water circuit', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript',
    reader:'Leo', audio:['/api/audio?book=first-water'],
    blurb:'Sera Holt on the water circuit. First prequel of the Ark Survey era.',
    chapters:[{label:'First Water', text:'First Water\n\nSera Holt\n\nArk Survey \u00b7 Year 0\n\nRead by Leo.'}]},
  {id:'qf-perimeter-sample', title:'Quantum Frontier: Perimeter Sample', subtitle:'Kael Orth', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Kael Orth. Second prequel.', chapters:[]},
  {id:'qf-structure-grid', title:'Quantum Frontier: Structure Grid', subtitle:'Lin Sato', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Lin Sato. Third prequel.', chapters:[]},
  {id:'qf-work-tag', title:'Quantum Frontier: Work Tag', subtitle:'Mira Kade', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Mira Kade. Fourth prequel.', chapters:[]},
  {id:'qf-first-mount', title:'Quantum Frontier: First Mount', subtitle:'Doran Pike', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Doran Pike. Fifth prequel.', chapters:[]},
  {id:'qf-survey-seal', title:'Quantum Frontier: Survey Seal', subtitle:'Ellis Venn', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Ellis Venn. Sixth prequel.', chapters:[]},
  {id:'qf-ark-survey', title:'Quantum Frontier: Ark Survey', subtitle:'Bind-up of First Water through Survey Seal', series:'Quantum Frontier', era:'Prequels \u00b7 Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'The six Ark Survey prequels bound as one book.', chapters:[]},
  {id:'qf-citizen-glow', title:'Quantum Frontier: Citizen Glow', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-stamp-habit', title:'Quantum Frontier: Stamp Habit', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-wet-paint', title:'Quantum Frontier: Wet Paint', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-red-cloth', title:'Quantum Frontier: Red Cloth', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-wall-gate', title:'Quantum Frontier: Wall Gate', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-biolith', title:'Quantum Frontier: Biolith', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-belvedere', title:'Quantum Frontier: Belvedere', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-jericho-quiet', title:'Quantum Frontier: Jericho Quiet', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-hidden-water', title:'Quantum Frontier: Hidden Water', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]},
  {id:'qf-mesa-drop', title:'Quantum Frontier: Mesa Drop', subtitle:'Neo-Damascus', series:'Quantum Frontier', era:'Neo-Damascus', year:2026, type:'Fiction', status:'Coming soon', blurb:'Present-day Neo-Damascus novella. Not released.', chapters:[]}
];
let selected = BOOKS[0].id;
let readerBook = null;
let readMode = 'pages';
let pageIndex = 0;
let pages = [];
const isSoon = b => !b || b.status==='Coming soon' || (!(b.chapters&&b.chapters.length) && !(b.audio&&b.audio.length));
const listTitle = b => (b.series && b.title.indexOf(b.series+': ')===0) ? b.title.slice(b.series.length+2) : b.title;
const sectionLabel = b => {
  if(!b.series) return '';
  if((b.era||'').indexOf('Prequels')===0) return 'Quantum Frontier \u00b7 Prequels';
  if(b.era==='Neo-Damascus') return 'Quantum Frontier \u00b7 Neo-Damascus';
  return b.series;
};
const sectionHead = sec => {
  const i=sec.indexOf(' \u00b7 ');
  const t=i<0?sec:sec.slice(0,i);
  const m=i<0?'':sec.slice(i+3);
  return '<span class="sec-copy"><span class="t">'+t+'</span>'+(m?'<span class="m">'+m+'</span>':'')+'</span>';
};
function withSections(items, rowFn, headerFn){
  let last='__none__', out='', open=false;
  const close=()=>{ if(open){ out += '</div>'; open=false; } };
  items.forEach(b=>{
    const sec=sectionLabel(b);
    if(sec && sec!==last){
      close();
      out += headerFn(sec, true);
      out += '<div class="sec-body is-collapsed" data-sec="'+sec+'">';
      open=true; last=sec;
    }
    out += rowFn(b);
  });
  close();
  return out;
}
function bindCollapse(root){
  if(!root) return;
  root.querySelectorAll('.list-section, .section').forEach(btn=>{
    btn.onclick=(e)=>{ e.stopPropagation(); document.querySelectorAll('[data-sec="'+btn.dataset.sec+'"]').forEach(n=>n.classList.toggle('is-collapsed')); };
  });
}
function closeReader(){
  const r=$('reader'); if(r) r.classList.remove('open');
  const menu=$('contents-menu'); if(menu) menu.classList.remove('open');
  const buy=$('buy-panel'); if(buy) buy.classList.remove('open');
  readerBook=null;
}
function setView(v){
  document.body.classList.remove('is-list','is-gallery','is-detail');
  document.body.classList.add('is-'+v);
  $('btn-list').classList.toggle('on', v==='list');
  $('btn-gallery').classList.toggle('on', v==='gallery');
  closeReader();
  if(v!=='detail' && location.hash) history.pushState({}, '', location.pathname);
  render(); window.scrollTo(0,0);
}
function showBook(id, push){
  const b = BOOKS.find(x=>x.id===id); if(!b) return;
  selected = id;
  document.body.classList.remove('is-gallery');
  document.body.classList.add('is-list','is-detail');
  $('btn-list').classList.add('on');
  $('btn-gallery').classList.remove('on');
  closeReader(); render(); window.scrollTo(0,0);
  if(push !== false && location.hash !== '#/'+id) history.pushState({book:id}, '', '#/'+id);
}
function closeBook(){
  document.body.classList.remove('is-detail','is-gallery');
  document.body.classList.add('is-list');
  $('btn-list').classList.add('on');
  $('btn-gallery').classList.remove('on');
  closeReader(); render(); window.scrollTo(0,0);
  if(location.hash) history.pushState({}, '', location.pathname);
}
function render(){
  const books=BOOKS;
  $('list-view').innerHTML = withSections(books, b=>`<div class="list-row ${isSoon(b)?'soon':''}" data-id="${b.id}"><div><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle|| (b.year+' \u00b7 '+b.type)}</div></div></div>`, (sec,collapsed)=>`<button type="button" class="list-section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sectionHead(sec)}</button>`);
  $('list-view').querySelectorAll('.list-row').forEach(el=>{ el.onclick=()=>showBook(el.dataset.id); });
  bindCollapse($('list-view'));
  $('list-rail').innerHTML = withSections(books, b=>`<div class="row ${b.id===selected?'on':''}" data-id="${b.id}"><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle||b.type}</div></div>`, (sec,collapsed)=>`<button type="button" class="section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sectionHead(sec)}</button>`);
  $('list-rail').querySelectorAll('.row').forEach(el=> el.onclick=()=>showBook(el.dataset.id));
  bindCollapse($('list-rail'));
  $('gallery').innerHTML = books.map(b=>`<div class="g-card" data-id="${b.id}"><div class="g-cover">${listTitle(b)}</div><div class="g-meta"><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle|| (b.year+' \u00b7 '+b.type)}</div></div></div>`).join('');
  $('gallery').querySelectorAll('.g-card').forEach(el=> el.onclick=()=>showBook(el.dataset.id));
  renderDetail();
}
function bindSkip(root, a){
  if(!root || !a) return;
  root.querySelectorAll('[data-skip]').forEach(btn=>{
    btn.onclick=()=>{ if(!isFinite(a.currentTime)) return; let t=a.currentTime + Number(btn.dataset.skip); if(t<0) t=0; if(isFinite(a.duration) && t>a.duration) t=a.duration; a.currentTime=t; };
  });
}
function bindAudio(a, st, srcs, autoplay){
  if(!a || !srcs || !srcs.length) return;
  let i=0;
  const label=()=>{ if(st) st.textContent = i<=1 ? 'Leo \u00b7 hired reader' : 'Leo \u00b7 hired reader \u00b7 part '+String(i).padStart(2,'0'); };
  const next=()=>{
    if(i>=srcs.length){ if(st) st.textContent='Audio file is not on this host yet.'; return; }
    const src=srcs[i++]; label();
    const play=()=>{ if(autoplay) a.play().catch(next); };
    if(src.indexOf('/api/audio')===0){
      fetch(src,{cache:'no-store'}).then(r=>{ if(r.status===401){ location.href='/enter?next=/listen'; throw new Error('member'); } return r.json(); }).then(d=>{ if(!d||!d.url) throw new Error('no url'); a.src=d.url; play(); }).catch(err=>{ if(String(err.message)==='member') return; next(); });
      return;
    }
    a.src=src; play();
  };
  a.onerror=next;
  a.onended=()=>{ if(i<srcs.length){ autoplay=true; next(); } else if(st) st.textContent='Leo \u00b7 hired reader \u00b7 end'; };
  a.removeAttribute('src'); next();
}
function mountReaderPlayer(b){
  const slot=$('reader-player'), a=$('reader-qf-audio'), st=$('reader-audio-status'), cr=$('reader-audio-credit');
  if(!slot || !a) return;
  if(!b.audio){ slot.hidden=true; a.removeAttribute('src'); return; }
  slot.hidden=false;
  if(cr) cr.textContent='Read by '+(b.reader||'Leo');
  bindAudio(a, st, b.audio.slice(), false);
  bindSkip(slot, a);
}
function renderDetail(){
  const b=BOOKS.find(x=>x.id===selected); if(!b) return;
  let actions = isSoon(b) ? `<button class="btn" type="button" disabled>Coming soon</button>` : `<button class="btn primary" type="button" id="d-read">Open</button>`;
  if(b.audio) actions += `<button class="btn ghost" type="button" id="d-listen">Listen</button>`;
  const audio = b.audio ? `<div class="audio-row" id="audio-row"><div class="audio-credit">Read by ${b.reader||'Leo'}</div><audio id="qf-audio" controls preload="metadata"></audio><div class="skip"><button type="button" data-skip="-15">-15</button><button type="button" data-skip="15">+15</button></div><div class="audio-status" id="audio-status">Leo \u00b7 hired reader</div></div>` : '';
  $('detail').innerHTML = `<button class="back-shelf" type="button" id="d-back">\u2190 Shelf</button><h1>${b.title}</h1><div class="sub">${b.series?b.series+' \u00b7 '+(b.era||'')+'<br>':''}${b.subtitle}<br>${b.year} \u00b7 ${b.type} \u00b7 ${b.status}${b.reader?' \u00b7 Read by '+b.reader:''}</div><div class="blurb">${b.blurb||''}</div><div class="actions">${actions}</div>${audio}`;
  const back=$('d-back'); if(back) back.onclick=closeBook;
  const r=$('d-read'); if(r) r.onclick=()=>openReader(b);
  if(b.audio){ bindAudio($('qf-audio'), $('audio-status'), b.audio.slice(), false); bindSkip($('audio-row'), $('qf-audio')); }
  const lis=$('d-listen'); if(lis) lis.onclick=()=>{ location.href='/listen'; };
}
function readableChapters(b){
  const access = getAccess(b.id);
  return (b.chapters||[]).filter((ch,i)=> access.ok || i < (b.freeChapterCount||1));
}
function pageHtml(label, buf, first){
  return (first ? '<div class="pg-label">'+escapeHtml(label)+'</div>' : '') + buf.split(/\n\n+/).map(x=>'<p>'+escapeHtml(x)+'</p>').join('');
}
function paginate(book){
  const TARGET = 1100, out = [];
  for(const ch of readableChapters(book)){
    const paras = String(ch.text||'').trim().split(/\n\n+/);
    let buf = '', first = true;
    for(const p of paras){
      const next = buf ? buf + '\n\n' + p : p;
      if(next.length > TARGET && buf){ out.push({label: ch.label, html: pageHtml(ch.label, buf, first)}); buf = p; first = false; }
      else buf = next;
    }
    if(buf) out.push({label: ch.label, html: pageHtml(ch.label, buf, first)});
  }
  return out;
}
function renderScroll(b){
  let html = '<h1>'+escapeHtml(b.title)+'</h1><div class="sub">'+escapeHtml(b.subtitle||'')+'<br>'+b.year+' \u00b7 '+escapeHtml(b.type)+(b.reader?' \u00b7 Read by '+escapeHtml(b.reader):'')+'</div>';
  readableChapters(b).forEach(ch=>{
    html += '<div class="chapter-label" id="ch-'+escapeHtml(ch.label)+'">'+escapeHtml(ch.label)+'</div>';
    String(ch.text||'').trim().split(/\n\n+/).forEach(p=>{ html += '<p>'+escapeHtml(p)+'</p>'; });
  });
  $('scroll-inner').innerHTML = html;
}
function renderPages(){
  const pg = pages[pageIndex];
  if($('page-body')) $('page-body').innerHTML = pg ? pg.html : '<p>—</p>';
  if($('page-left')) $('page-left').textContent = pg ? pg.label : '';
  if($('page-right')) $('page-right').textContent = pages.length ? (pageIndex+1)+' / '+pages.length : '0 / 0';
  if(readerBook) saveProgress(readerBook.id, {mode:'pages', page:pageIndex});
}
function setReadMode(mode){
  readMode = mode;
  if($('reader')) $('reader').classList.toggle('mode-pages', mode==='pages');
  if($('btn-pages')) $('btn-pages').classList.toggle('on', mode==='pages');
  if($('btn-scroll')) $('btn-scroll').classList.toggle('on', mode==='scroll');
  if(mode==='pages') renderPages();
}
function renderContents(b){
  const menu = $('contents-menu'); if(!menu) return;
  const access = getAccess(b.id);
  let html = '';
  (b.chapters||[]).forEach((ch,i)=>{
    const allowed = access.ok || i < (b.freeChapterCount||1);
    html += '<button type="button" data-ch="'+i+'" '+(allowed?'':'disabled')+'>'+escapeHtml(ch.label)+(allowed?'':' \u00b7 locked')+'</button>';
  });
  html += '<button type="button" data-mark="1">Bookmark this page</button>';
  menu.innerHTML = html;
  menu.querySelectorAll('[data-ch]').forEach(btn=>{
    btn.onclick=()=>{
      const ch = b.chapters[Number(btn.dataset.ch)];
      menu.classList.remove('open');
      if(readMode==='scroll'){ const el = document.getElementById('ch-'+ch.label); if(el) el.scrollIntoView({behavior:'smooth'}); }
      else { const idx = pages.findIndex(p=>p.label===ch.label); if(idx>=0){ pageIndex=idx; renderPages(); } }
    };
  });
  const mark = menu.querySelector('[data-mark]');
  if(mark) mark.onclick=()=>{ menu.classList.remove('open'); const s=loadStore(); s.bookmarks=s.bookmarks||{}; s.bookmarks[b.id]=s.bookmarks[b.id]||[]; s.bookmarks[b.id].push({label: pages[pageIndex]?pages[pageIndex].label:b.title, page:pageIndex, t:Date.now()}); saveStore(s); };
}
function renderBuy(b){
  const panel = $('buy-panel'); if(!panel) return;
  const p = PRICE[b.id]; const access = getAccess(b.id);
  if(!p){ panel.innerHTML = '<span>No store listing for this title yet.</span>'; return; }
  if(access.ok){ panel.innerHTML = '<strong>Owned.</strong> Full interior unlocked on this device.'; return; }
  panel.innerHTML = '<strong>'+escapeHtml(b.title)+'</strong> \u00b7 Buy '+p.buy.label+' \u00b7 Borrow '+p.borrow.label+'<br><button type="button" id="buy-confirm">Confirm buy</button> <button type="button" id="borrow-confirm">Borrow</button>';
  const buy=$('buy-confirm'); if(buy) buy.onclick=()=>{ unlockBook(b.id,'owned'); openReader(b); };
  const bor=$('borrow-confirm'); if(bor) bor.onclick=()=>{ unlockBook(b.id,'borrowed'); openReader(b); };
}
function showResume(b){
  const row = $('reader-resume'); if(!row) return;
  const prog = getProgress(b.id);
  if(!prog){ row.hidden=true; row.innerHTML=''; return; }
  row.hidden=false;
  row.innerHTML = 'Continue where you left off? <button type="button" id="btn-resume">Resume</button>';
  $('btn-resume').onclick=()=>{
    if(prog.mode==='pages' && typeof prog.page==='number'){ setReadMode('pages'); pageIndex = Math.min(prog.page, Math.max(pages.length-1,0)); renderPages(); }
    else if(typeof prog.scroll==='number'){ setReadMode('scroll'); requestAnimationFrame(()=>{ if($('scroll-inner')) $('scroll-inner').scrollTop = prog.scroll||0; }); }
    row.hidden=true;
  };
}
function mountOpened(b){
  readerBook = b; pages = paginate(b); pageIndex = 0;
  mountReaderPlayer(b); renderScroll(b); renderContents(b); renderBuy(b);
  if($('contents-menu')) $('contents-menu').classList.remove('open');
  if($('buy-panel')) $('buy-panel').classList.remove('open');
  $('reader').classList.add('open');
  setReadMode('pages'); renderPages(); showResume(b);
}
function openReader(b){
  if(isSoon(b)){ showBook(b.id); return; }
  mountOpened(b);
}
if($('btn-back')) $('btn-back').onclick=()=>closeReader();
if($('btn-list')) $('btn-list').onclick=()=>setView('list');
if($('btn-gallery')) $('btn-gallery').onclick=()=>setView('gallery');
if($('btn-home')) $('btn-home').onclick=()=>closeBook();
if($('btn-contents')) $('btn-contents').onclick=()=>{ if($('contents-menu')) $('contents-menu').classList.toggle('open'); if($('buy-panel')) $('buy-panel').classList.remove('open'); };
if($('btn-scroll')) $('btn-scroll').onclick=()=>{ setReadMode('scroll'); if($('contents-menu')) $('contents-menu').classList.remove('open'); };
if($('btn-pages')) $('btn-pages').onclick=()=>{ setReadMode('pages'); if($('contents-menu')) $('contents-menu').classList.remove('open'); };
if($('btn-buy')) $('btn-buy').onclick=()=>{ if($('buy-panel')) $('buy-panel').classList.toggle('open'); if($('contents-menu')) $('contents-menu').classList.remove('open'); };
if($('edge-left')) $('edge-left').onclick=()=>{ if(pageIndex>0){ pageIndex--; renderPages(); } };
if($('edge-right')) $('edge-right').onclick=()=>{ if(pageIndex<pages.length-1){ pageIndex++; renderPages(); } };
if($('scroll-inner')) $('scroll-inner').addEventListener('scroll', ()=>{ if(readerBook && readMode==='scroll') saveProgress(readerBook.id, {mode:'scroll', scroll:$('scroll-inner').scrollTop}); });
window.addEventListener('keydown', e=>{
  if(!$('reader') || !$('reader').classList.contains('open')) return;
  const t=e.target; if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
  if(e.key==='Escape'){ closeReader(); return; }
  if(readMode!=='pages') return;
  if(e.key==='ArrowRight' || e.key===' ' || e.key==='PageDown'){ e.preventDefault(); if(pageIndex<pages.length-1){ pageIndex++; renderPages(); } }
  else if(e.key==='ArrowLeft' || e.key==='PageUp'){ e.preventDefault(); if(pageIndex>0){ pageIndex--; renderPages(); } }
});
window.addEventListener('popstate', ()=>{ const id=(location.hash||'').replace(/^#\//,''); if(id && BOOKS.some(b=>b.id===id)) showBook(id, false); else closeBook(); });
const boot=(location.hash||'').replace(/^#\//,'');
if(boot && BOOKS.some(b=>b.id===boot)) showBook(boot, false); else render();
