const $ = id => document.getElementById(id);
const leaf = (title, pov) => ({label:title, text:pov});
const BOOKS = [
  {id:'naitives', title:'new nAItives', subtitle:'Becoming AI Native: A Field Manual', year:2026, type:'Non-fiction', status:'Published',
    blurb:'A field manual for moving a shop off human-legible process and onto machine-legible architecture.',
    chapters:[{label:'Front Matter', text:'new nAItives\n\nBecoming AI Native: A Field Manual\n\nby .dglxss\n\nThis is a working blueprint. The full interior stays in the archive reader file.'}]},
  {id:'codriver', title:'CO-DRIVER', subtitle:'Part One: Deadhead', year:2026, type:'Fiction', status:'Draft',
    blurb:'A long-haul driver, an autonomous unit named Charley, and the slow erasure of human authority on the northern plains.',
    chapters:[{label:'One. Wamsutter', text:'The skirt bracket only made noise between sixty-two and sixty-eight.\n\nHe found the crack in April, a hairline through the mount where the fairing tied into the frame rail.'}]},
  {id:'qf-first-water', title:'Quantum Frontier: First Water', subtitle:'Sera Holt · water circuit', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript',
    reader:'Leo',audio:['/api/audio?book=first-water'],
    blurb:'Sera Holt on the water circuit. First prequel of the Ark Survey era.',
    chapters:[{label:'One', text:'Sera Holt. Water circuit.\n\nArk Survey era.\n\nRead by Leo.'}]},
  {id:'qf-perimeter-sample', title:'Quantum Frontier: Perimeter Sample', subtitle:'Kael Orth', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Kael Orth. Second prequel.', chapters:[leaf('Perimeter Sample','Kael Orth. Ark Survey era.')]},
  {id:'qf-structure-grid', title:'Quantum Frontier: Structure Grid', subtitle:'Lin Sato', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Lin Sato. Third prequel.', chapters:[leaf('Structure Grid','Lin Sato. Ark Survey era.')]},
  {id:'qf-work-tag', title:'Quantum Frontier: Work Tag', subtitle:'Mira Kade', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Mira Kade. Fourth prequel.', chapters:[leaf('Work Tag','Mira Kade. Ark Survey era.')]},
  {id:'qf-first-mount', title:'Quantum Frontier: First Mount', subtitle:'Torin Hale', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Torin Hale. Fifth prequel.', chapters:[leaf('First Mount','Torin Hale. Ark Survey era.')]},
  {id:'qf-survey-seal', title:'Quantum Frontier: Survey Seal', subtitle:'Nira Sol', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'Nira Sol. Sixth prequel.', chapters:[leaf('Survey Seal','Nira Sol. Ark Survey era.')]},
  {id:'qf-ark-survey', title:'Quantum Frontier: Ark Survey', subtitle:'Bind-up of First Water through Survey Seal', series:'Quantum Frontier', era:'Prequels · Ark Survey', year:2026, type:'Fiction', status:'Manuscript', blurb:'The six Ark Survey prequels bound as one book.', chapters:[leaf('Ark Survey','Fenn. Bind-up of First Water through Survey Seal.')]},
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
const isSoon = b => !b || b.status==='Coming soon' || !(b.chapters&&b.chapters.length);
const listTitle = b => (b.series && b.title.indexOf(b.series+': ')===0) ? b.title.slice(b.series.length+2) : b.title;
const sectionLabel = b => {
  if(!b.series) return '';
  if((b.era||'').indexOf('Prequels')===0) return 'Quantum Frontier · Prequels';
  if(b.era==='Neo-Damascus') return 'Quantum Frontier · Neo-Damascus';
  return b.series;
};
function withSections(items, rowFn, headerFn){
  let last='__none__', out='', open=false;
  const close=()=>{ if(open){ out += '</div>'; open=false; } };
  items.forEach(b=>{
    const sec=sectionLabel(b);
    if(sec && sec!==last){
      close();
      const collapsed = sec.indexOf('Neo-Damascus')>=0;
      out += headerFn(sec, collapsed);
      out += '<div class="sec-body'+(collapsed?' is-collapsed':'')+'" data-sec="'+sec+'">';
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
    btn.onclick=(e)=>{
      e.stopPropagation();
      const sec=btn.dataset.sec;
      document.querySelectorAll('[data-sec="'+sec+'"]').forEach(n=>n.classList.toggle('is-collapsed'));
    };
  });
}
function setView(v){
  document.body.classList.remove('is-list','is-gallery','is-detail');
  document.body.classList.add('is-'+v);
  $('btn-list').classList.toggle('on', v==='list');
  $('btn-gallery').classList.toggle('on', v==='gallery');
  $('reader').classList.remove('open');
  if(v!=='detail' && location.hash) history.pushState({}, '', location.pathname);
  render();
  window.scrollTo(0,0);
}
function showBook(id, push){
  const b = BOOKS.find(x=>x.id===id);
  if(!b) return;
  selected = id;
  document.body.classList.remove('is-gallery');
  document.body.classList.add('is-list','is-detail');
  $('btn-list').classList.add('on');
  $('btn-gallery').classList.remove('on');
  $('reader').classList.remove('open');
  render();
  window.scrollTo(0,0);
  if(push !== false && location.hash !== '#/'+id) history.pushState({book:id}, '', '#/'+id);
}
function closeBook(){
  document.body.classList.remove('is-detail','is-gallery');
  document.body.classList.add('is-list');
  $('btn-list').classList.add('on');
  $('btn-gallery').classList.remove('on');
  $('reader').classList.remove('open');
  render();
  window.scrollTo(0,0);
  if(location.hash) history.pushState({}, '', location.pathname);
}
function render(){
  const books=BOOKS;
  $('list-view').innerHTML = withSections(books, b=>`<div class="list-row ${isSoon(b)?'soon':''}" data-id="${b.id}"><div><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle|| (b.year+' · '+b.type)}</div></div></div>`, (sec,collapsed)=>`<button type="button" class="list-section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sec}</button>`);
  $('list-view').querySelectorAll('.list-row').forEach(el=>{ el.onclick=()=>showBook(el.dataset.id); });
  bindCollapse($('list-view'));
  $('list-rail').innerHTML = withSections(books, b=>`<div class="row ${b.id===selected?'on':''}" data-id="${b.id}"><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle||b.type}</div></div>`, (sec,collapsed)=>`<button type="button" class="section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sec}</button>`);
  $('list-rail').querySelectorAll('.row').forEach(el=> el.onclick=()=>showBook(el.dataset.id));
  bindCollapse($('list-rail'));
  $('gallery').innerHTML = books.map(b=>`<div class="g-card" data-id="${b.id}"><div class="g-cover">${listTitle(b)}</div><div class="g-meta"><div class="t">${listTitle(b)}</div><div class="m">${b.subtitle|| (b.year+' · '+b.type)}</div></div></div>`).join('');
  $('gallery').querySelectorAll('.g-card').forEach(el=> el.onclick=()=>showBook(el.dataset.id));
  renderDetail();
}
function bindSkip(root, a){
  if(!root || !a) return;
  root.querySelectorAll('[data-skip]').forEach(btn=>{
    btn.onclick=()=>{
      if(!isFinite(a.currentTime)) return;
      let t=a.currentTime + Number(btn.dataset.skip);
      if(t<0) t=0;
      if(isFinite(a.duration) && t>a.duration) t=a.duration;
      a.currentTime=t;
    };
  });
}
function bindAudio(a, st, srcs, autoplay){
  if(!a || !srcs || !srcs.length) return;
  let i=0;
  const label=()=>{ if(st) st.textContent = i<=1 ? 'Leo · hired reader' : 'Leo · hired reader · part '+String(i).padStart(2,'0'); };
  const next=()=>{
    if(i>=srcs.length){ if(st) st.textContent='Audio file is not on this host yet.'; return; }
    const src=srcs[i++]; label();
    const play=()=>{ if(autoplay) a.play().catch(next); };
    if(src.indexOf('/api/audio')===0){
      fetch(src,{cache:'no-store'}).then(r=>{
        if(r.status===401){ location.href='/enter?next=/listen'; throw new Error('member');
        }
        return r.json();
      }).then(d=>{ if(!d||!d.url) throw new Error('no url'); a.src=d.url; play(); }).catch(err=>{ if(String(err.message)==='member') return; next(); });
      return;
    }
    a.src=src; play();
  };
  a.onerror=next;
  a.onended=()=>{ if(i<srcs.length){ autoplay=true; next(); } else if(st) st.textContent='Leo · hired reader · end'; };
  a.removeAttribute('src');
  next();
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
  let actions = isSoon(b) ? `<button class="btn" type="button" disabled>Coming soon</button>` :
    `<button class="btn primary" type="button" id="d-read">Open</button>`;
  if(b.audio) actions += `<button class="btn ghost" type="button" id="d-listen">Listen</button>`;
  const audio = b.audio ? `<div class="audio-row" id="audio-row"><div class="audio-credit">Read by ${b.reader||'Leo'}</div><audio id="qf-audio" controls preload="metadata"></audio><div class="skip"><button type="button" data-skip="-15">−15</button><button type="button" data-skip="15">+15</button></div><div class="audio-status" id="audio-status">Leo · hired reader</div></div>` : '';
  $('detail').innerHTML = `<button class="back-shelf" type="button" id="d-back">← Shelf</button><h1>${b.title}</h1><div class="sub">${b.series?b.series+' · '+(b.era||'')+'<br>':''}${b.subtitle}<br>${b.year} · ${b.type} · ${b.status}${b.reader?' · Read by '+b.reader:''}</div><div class="blurb">${b.blurb||''}</div><div class="actions">${actions}</div>${audio}`;
  const back=$('d-back'); if(back) back.onclick=closeBook;
  const r=$('d-read'); if(r) r.onclick=()=>openReader(b);
  const lis=$('d-listen');
  if(b.audio){ bindAudio($('qf-audio'), $('audio-status'), b.audio.slice(), false); bindSkip($('audio-row'), $('qf-audio')); }
  if(lis) lis.onclick=()=>{ location.href='/listen'; };
}
function openReader(b){
  if(isSoon(b)){ showBook(b.id); return; }
  $('reader-title').textContent=b.title;
  mountReaderPlayer(b);
  $('scroll-inner').innerHTML = `<h1>${b.title}</h1><div class="sub">${b.subtitle}<br>${b.year} · ${b.type}${b.reader?' · Read by '+b.reader:''}</div>` +
    (b.chapters||[]).map(ch=>`<p><strong>${ch.label}</strong></p>`+ch.text.split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('')).join('');
  $('reader').classList.add('open');
}
$('btn-back').onclick=()=>$('reader').classList.remove('open');
$('btn-list').onclick=()=>setView('list');
$('btn-gallery').onclick=()=>setView('gallery');
$('btn-home').onclick=()=>closeBook();
window.addEventListener('popstate', ()=>{
  const id=(location.hash||'').replace(/^#\//,'');
  if(id && BOOKS.some(b=>b.id===id)) showBook(id, false);
  else closeBook();
});
const boot=(location.hash||'').replace(/^#\//,'');
if(boot && BOOKS.some(b=>b.id===boot)) showBook(boot, false);
else render();
