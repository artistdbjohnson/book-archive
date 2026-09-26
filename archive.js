/* listen reader — white paper karaoke. shelf chrome unchanged. */
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
const TYPE_SIZE_PX = { s:'17px', m:'20px', l:'23px' };
const SPEEDS = { 0.75:1, 1:1, 1.25:1, 1.5:1 };
function getTypePrefs(){
  const t=loadStore().type||{};
  const speed = SPEEDS[Number(t.speed)] ? Number(t.speed) : 1;
  return { size: TYPE_SIZE_PX[t.size] ? t.size : 'm', speed: speed };
}
function applyTypePrefs(){
  const t=getTypePrefs();
  const r=$('reader');
  if(!r) return;
  r.style.fontSize = TYPE_SIZE_PX[t.size];
  r.dataset.size=t.size;
  document.querySelectorAll('#edit-sheet [data-size]').forEach(b=>b.classList.toggle('on', b.dataset.size===t.size));
  document.querySelectorAll('#edit-sheet [data-speed]').forEach(b=>b.classList.toggle('on', Number(b.dataset.speed)===t.speed));
}
function saveTypePrefs(partial){
  const s=loadStore();
  s.type=Object.assign({}, s.type||{}, getTypePrefs(), partial);
  saveStore(s);
  applyTypePrefs();
  if(readerBook) afterLayout(()=>placeListen(true));
}
function closeSheets(){
  const edit=$('edit-sheet'); if(edit) edit.classList.remove('open');
  const ch=$('chapter-sheet'); if(ch) ch.classList.remove('open');
  const ed=$('btn-edit'); if(ed) ed.setAttribute('aria-expanded','false');
  const cb=$('btn-chapter'); if(cb) cb.setAttribute('aria-expanded','false');
}
function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const BOOKS = [
  {id:'naitives', title:'new nAItives', subtitle:'Becoming AI Native: A Field Manual', year:2026, type:'Non-fiction', status:'Published', freeChapterCount:1,
    blurb:'A field manual for moving a shop off human-legible process and onto machine-legible architecture.',
    chapters:[
      {label:'Front Matter', text:'new nAItives\n\nBecoming AI Native: A Field Manual\n\nby .dglxss\n\nA field manual for moving a shop off human-legible process and onto machine-legible architecture.'},
      {label:'Chapter 1 – The Shift', text:'The shop moved off the whiteboard and onto a machine that could keep the same argument overnight.\n\nThe book exists because the parts that failed are in here too.'},
      {label:'Chapter 2 – The Remove-the-Test', text:'The test that certified a human had understood the system was the first thing to go.'}
    ]},
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
const listen = { words:[], paras:[], index:0, playing:false, finished:false, timer:null, drag:0, y:0, prevEl:null, prevPara:null };
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
  clearTimeout(listen.timer);
  listen.playing=false;
  if(readerBook) saveListenProgress();
  const r=$('reader'); if(r) r.classList.remove('open','is-reading');
  document.body.classList.remove('reader-open');
  closeSheets();
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
function chapterEntries(book){
  const access = getAccess(book.id);
  return (book.chapters||[]).map((ch,i)=>({
    ch: ch,
    i: i,
    allowed: !!(access.ok || i < (book.freeChapterCount||1))
  }));
}
function buildListen(book){
  const words=[], paras=[];
  chapterEntries(book).forEach(entry=>{
    if(!entry.allowed) return;
    String(entry.ch.text||'').trim().split(/\n\n+/).filter(Boolean).forEach(block=>{
      const tokens=block.match(/\S+/g)||[];
      if(!tokens.length) return;
      const pi=paras.length;
      tokens.forEach(text=>{
        words.push({text:text, i:words.length, pi:pi, chapterIndex:entry.i});
      });
      paras.push({pi:pi, chapterIndex:entry.i});
    });
  });
  return {words:words, paras:paras};
}
function afterLayout(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
function chapterLabel(index){
  return 'chapter '+String(index+1).padStart(2,'0');
}
function saveListenProgress(){
  if(!readerBook || !listen.words.length) return;
  const w=listen.words[Math.min(listen.index, listen.words.length-1)];
  saveProgress(readerBook.id, {mode:'listen', word:listen.index, chapter:w?w.chapterIndex:0});
}
function setListenTitle(b){
  const name=$('listen-name'), by=$('listen-by');
  if(name) name.textContent=b.title||'';
  if(by) by.textContent=b.subtitle ? ' \u2014 '+b.subtitle : '';
}
function renderTrack(){
  const track=$('listen-track');
  if(!track) return;
  listen.prevEl=null;
  listen.prevPara=null;
  if(!listen.paras.length){
    track.innerHTML='<p class="listen-p">\u2014</p>';
    return;
  }
  const byPara={};
  listen.words.forEach(w=>{
    (byPara[w.pi]=byPara[w.pi]||[]).push(w);
  });
  track.innerHTML=listen.paras.map(p=>{
    const inner=(byPara[p.pi]||[]).map(w=>'<span class="w" data-i="'+w.i+'">'+escapeHtml(w.text)+'</span>').join(' ');
    return '<p class="listen-p" data-pi="'+p.pi+'">'+inner+'</p>';
  }).join('');
}
function paintListen(){
  const w=listen.words[listen.index];
  const el=w ? document.querySelector('#listen-track .w[data-i="'+w.i+'"]') : null;
  if(listen.prevPara && (!w || listen.prevPara.dataset.pi!==String(w.pi))) listen.prevPara.classList.remove('is-active');
  if(listen.prevEl && listen.prevEl!==el) listen.prevEl.classList.remove('is-now');
  if(el){
    el.classList.add('is-now');
    const p=el.parentElement;
    if(p) p.classList.add('is-active');
    listen.prevEl=el;
    listen.prevPara=p;
  }
  const ch=$('btn-chapter');
  if(ch && w) ch.textContent=chapterLabel(w.chapterIndex);
  const fill=$('listen-progress-fill');
  if(fill){
    const max=Math.max(listen.words.length-1, 1);
    const t=listen.words.length ? listen.index/max : 0;
    fill.style.width=(t*100)+'%';
  }
  const play=$('btn-play');
  if(play) play.disabled=!listen.words.length;
}
function placeListen(immediate){
  const track=$('listen-track'), vp=$('listen-viewport');
  if(!track || !vp) return;
  const el=track.querySelector('.w.is-now') || track.querySelector('.w');
  if(!el) return;
  const prev=listen.y||0;
  const drag=listen.drag||0;
  track.style.transition='none';
  track.style.transform='translateY('+prev+'px)';
  const vpRect=vp.getBoundingClientRect();
  const elRect=el.getBoundingClientRect();
  if(!vpRect.height) return;
  const target=vpRect.top + vpRect.height*0.34 + drag;
  const y=prev + (target - elRect.top);
  if(!immediate){
    track.getBoundingClientRect();
    track.style.transition='transform .48s cubic-bezier(.22,.61,.36,1)';
  }
  track.style.transform='translateY('+y+'px)';
  listen.y=y;
}
function riseListen(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const track=$('listen-track');
  if(!track) return;
  const y=listen.y||0;
  track.style.transition='none';
  track.style.transform='translateY('+(y+28)+'px)';
  track.getBoundingClientRect();
  track.style.transition='transform .58s cubic-bezier(.22,.61,.36,1)';
  track.style.transform='translateY('+y+'px)';
}
function wordMs(text){
  const speed=getTypePrefs().speed||1;
  const base=340 + Math.min(String(text||'').length, 14)*26;
  return Math.round(Math.min(860, Math.max(320, base)) / speed);
}
function scheduleListen(){
  clearTimeout(listen.timer);
  if(!listen.playing) return;
  const w=listen.words[listen.index];
  if(!w){ finishListen(); return; }
  listen.timer=setTimeout(()=>{
    if(!listen.playing) return;
    if(listen.index>=listen.words.length-1){ finishListen(); return; }
    listen.index+=1;
    paintListen();
    placeListen(false);
    saveListenProgress();
    scheduleListen();
  }, wordMs(w.text));
}
function setPlayLabel(playing){
  const btn=$('btn-play');
  if(!btn) return;
  btn.textContent=playing?'pause':'play';
  btn.setAttribute('aria-pressed', playing?'true':'false');
}
function playListen(){
  if(!listen.words.length) return;
  if(listen.finished){
    listen.finished=false;
    listen.index=0;
    paintListen();
  }
  listen.playing=true;
  listen.drag=0;
  const root=$('reader');
  if(root) root.classList.add('is-reading');
  setPlayLabel(true);
  closeSheets();
  placeListen(true);
  riseListen();
  scheduleListen();
  saveListenProgress();
}
function pauseListen(){
  listen.playing=false;
  listen.drag=0;
  clearTimeout(listen.timer);
  const root=$('reader');
  if(root) root.classList.remove('is-reading');
  setPlayLabel(false);
  saveListenProgress();
}
function finishListen(){
  listen.playing=false;
  listen.finished=true;
  listen.drag=0;
  clearTimeout(listen.timer);
  const root=$('reader');
  if(root) root.classList.remove('is-reading');
  setPlayLabel(false);
  saveListenProgress();
}
function seekListen(index){
  if(!listen.words.length) return;
  listen.finished=false;
  listen.index=Math.max(0, Math.min(listen.words.length-1, index|0));
  paintListen();
  const reading=$('reader') && $('reader').classList.contains('is-reading');
  placeListen(!reading);
  if(listen.playing) scheduleListen();
  saveListenProgress();
}
function renderChapterSheet(){
  const sheet=$('chapter-sheet');
  const b=readerBook;
  if(!sheet || !b) return;
  const current=listen.words[listen.index];
  let html='';
  chapterEntries(b).forEach(entry=>{
    const label=chapterLabel(entry.i);
    const on=current && current.chapterIndex===entry.i;
    if(!entry.allowed) html+='<button type="button" disabled>'+label+' \u00b7 locked</button>';
    else html+='<button type="button" data-ch="'+entry.i+'"'+(on?' class="on"':'')+'>'+label+'</button>';
  });
  const access=getAccess(b.id);
  const price=PRICE[b.id];
  if(price && !access.ok){
    html+='<div class="listen-sheet-rule"></div>';
    html+='<button type="button" data-unlock="owned">buy '+escapeHtml(price.buy.label)+'</button>';
    html+='<button type="button" data-unlock="borrowed">borrow '+escapeHtml(price.borrow.label)+'</button>';
  }
  sheet.innerHTML=html;
}
function jumpChapter(chapterIndex){
  const idx=listen.words.findIndex(w=>w.chapterIndex===chapterIndex);
  if(idx<0) return;
  seekListen(idx);
}
function reloadListen(keepChapter){
  const b=readerBook;
  if(!b) return;
  const built=buildListen(b);
  listen.words=built.words;
  listen.paras=built.paras;
  let idx=0;
  if(typeof keepChapter==='number'){
    const found=listen.words.findIndex(w=>w.chapterIndex===keepChapter);
    if(found>=0) idx=found;
  }
  listen.index=idx;
  listen.finished=false;
  renderTrack();
  paintListen();
  afterLayout(()=>placeListen(true));
  saveListenProgress();
}
function mountOpened(b){
  clearTimeout(listen.timer);
  listen.playing=false;
  listen.finished=false;
  listen.drag=0;
  listen.y=0;
  readerBook=b;
  const built=buildListen(b);
  listen.words=built.words;
  listen.paras=built.paras;
  const prog=getProgress(b.id);
  let idx=0;
  if(prog && typeof prog.word==='number' && isFinite(prog.word)) idx=prog.word|0;
  if(idx<0) idx=0;
  if(idx>=listen.words.length) idx=Math.max(0, listen.words.length-1);
  listen.index=idx;
  applyTypePrefs();
  setListenTitle(b);
  renderTrack();
  paintListen();
  setPlayLabel(false);
  const root=$('reader');
  root.classList.remove('is-reading');
  root.classList.add('open');
  document.body.classList.add('reader-open');
  closeSheets();
  const go=()=>{ if(readerBook===b) placeListen(true); };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>afterLayout(go));
  else afterLayout(go);
}
function openReader(b){
  if(isSoon(b)){ showBook(b.id); return; }
  mountOpened(b);
}
function toggleSheet(id, btnId){
  const sheet=$(id), btn=$(btnId);
  if(!sheet) return;
  const willOpen=!sheet.classList.contains('open');
  closeSheets();
  if(willOpen){
    if(id==='chapter-sheet') renderChapterSheet();
    sheet.classList.add('open');
    if(btn) btn.setAttribute('aria-expanded','true');
  }
}
function bindListenDrag(){
  const vp=$('listen-viewport');
  if(!vp || vp.dataset.bound) return;
  vp.dataset.bound='1';
  let active=false, startY=0, startDrag=0;
  vp.addEventListener('pointerdown', e=>{
    if(!$('reader') || !$('reader').classList.contains('is-reading')) return;
    if(e.target.closest && e.target.closest('button, .listen-sheet')) return;
    active=true;
    startY=e.clientY;
    startDrag=listen.drag||0;
    try{ vp.setPointerCapture(e.pointerId); }catch(err){}
  });
  vp.addEventListener('pointermove', e=>{
    if(!active) return;
    const next=startDrag+(e.clientY-startY);
    listen.drag=Math.max(-160, Math.min(160, next));
    placeListen(true);
  });
  const end=()=>{
    if(!active) return;
    active=false;
    if(listen.playing){ listen.drag=0; placeListen(false); }
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
}
function mountListenMark(){
  const mark=$('listen-mark');
  if(!mark || mark.textContent) return;
  mark.textContent=[
    '          \\    |    /',
    '           \\   |   /',
    '        \u00b7 \u00b7 \\  |  / \u00b7 \u00b7',
    '             \\ | /',
    '              \\|/',
    '          \u2014\u2014\u2014 + \u2014\u2014\u2014',
    '              /|\\',
    '             / | \\',
    '            /  |  \\',
    '           /   |   \\',
    '',
    '      \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014',
    '     ~ ~ ~ ~ ~ ~ ~ ~',
    '    _ _ _ _ _ _ _ _ _'
  ].join('\n');
}
if($('btn-library')) $('btn-library').onclick=()=>closeReader();
if($('btn-list')) $('btn-list').onclick=()=>setView('list');
if($('btn-gallery')) $('btn-gallery').onclick=()=>setView('gallery');
if($('btn-home')) $('btn-home').onclick=()=>closeBook();
if($('btn-play')) $('btn-play').onclick=()=>{ if(listen.playing) pauseListen(); else playListen(); };
if($('btn-edit')) $('btn-edit').onclick=()=>toggleSheet('edit-sheet','btn-edit');
if($('btn-chapter')) $('btn-chapter').onclick=()=>toggleSheet('chapter-sheet','btn-chapter');
if($('edit-sheet')) $('edit-sheet').addEventListener('click', e=>{
  const btn=e.target.closest('button'); if(!btn) return;
  e.stopPropagation();
  if(btn.dataset.size) saveTypePrefs({size:btn.dataset.size});
  else if(btn.dataset.speed){
    saveTypePrefs({speed:Number(btn.dataset.speed)});
    if(listen.playing) scheduleListen();
  }
});
if($('chapter-sheet')) $('chapter-sheet').addEventListener('click', e=>{
  const btn=e.target.closest('button'); if(!btn) return;
  e.stopPropagation();
  if(btn.dataset.ch!=null && btn.dataset.ch!==''){
    jumpChapter(Number(btn.dataset.ch));
    closeSheets();
  } else if(btn.dataset.unlock && readerBook){
    const keep=listen.words[listen.index]?listen.words[listen.index].chapterIndex:0;
    unlockBook(readerBook.id, btn.dataset.unlock);
    reloadListen(keep);
    renderChapterSheet();
  }
});
if($('listen-progress')) $('listen-progress').addEventListener('click', e=>{
  if(!listen.words.length) return;
  if($('reader') && $('reader').classList.contains('is-reading')) return;
  const rect=e.currentTarget.getBoundingClientRect();
  const t=rect.width ? (e.clientX-rect.left)/rect.width : 0;
  seekListen(Math.round(Math.min(1, Math.max(0, t))*(listen.words.length-1)));
});
if($('reader')) $('reader').addEventListener('click', e=>{
  if(e.target.closest && e.target.closest('#btn-edit, #btn-chapter, #btn-play, #btn-library, .listen-sheet, #listen-progress')) return;
  closeSheets();
});
window.addEventListener('keydown', e=>{
  if(!$('reader') || !$('reader').classList.contains('open')) return;
  const t=e.target;
  if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
  if(e.key==='Escape'){
    const edit=$('edit-sheet'), ch=$('chapter-sheet');
    if((edit && edit.classList.contains('open')) || (ch && ch.classList.contains('open'))){ closeSheets(); return; }
    closeReader();
    return;
  }
  if(e.key===' ' || e.code==='Space'){
    if(t && t.closest && t.closest('button')) return;
    e.preventDefault();
    if(listen.playing) pauseListen(); else playListen();
  }
});
window.addEventListener('resize', ()=>{ if(readerBook && $('reader') && $('reader').classList.contains('open')) placeListen(true); });
window.addEventListener('popstate', ()=>{ const id=(location.hash||'').replace(/^#\//,''); if(id && BOOKS.some(b=>b.id===id)) showBook(id, false); else closeBook(); });
bindListenDrag();
mountListenMark();
applyTypePrefs();
const boot=(location.hash||'').replace(/^#\//,'');
if(boot && BOOKS.some(b=>b.id===boot)) showBook(boot, false); else render();
