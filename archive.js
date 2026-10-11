/* reader modes — autoplay karaoke, manual scroll, viewport pages. library view toggle is shelf-only. */
const $ = id => document.getElementById(id);
const STORE = 'dglxss-archive-pwa-v1';
const PRICE = {};
function loadStore(){ try{ return JSON.parse(localStorage.getItem(STORE)||'{}'); }catch(e){ return {}; } }
function saveStore(s){ localStorage.setItem(STORE, JSON.stringify(s)); }
function getProgress(id){ return (loadStore().progress||{})[id] || null; }
function saveProgress(id, p){ const s=loadStore(); s.progress=s.progress||{}; s.progress[id]=Object.assign({}, s.progress[id]||{}, p); saveStore(s); }
function getAccess(id){ return (loadStore().access||{})[id] || {ok:false,kind:'none'}; }
function unlockBook(id, kind){ const s=loadStore(); s.access=s.access||{}; s.access[id]={ok:true,kind}; saveStore(s); }
const TYPE_SIZE_PX = { s:'17px', m:'18px', l:'21px' };
const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 2];
const SPEEDS = { 0.75:1, 1:1, 1.25:1, 1.5:1, 2:1 };
function speedText(n){
  const v=Number(n);
  return (v===0.75 ? '.75' : String(v)) + '\u00d7';
}
/* One-time: stored Autoplay speed 1 was the old default. Move that value to 1.25 once.
   Later choices, including an explicit 1, stay put. .75, 1.5, and 2 are never rewritten.
   Migration runs once at load. Speed and size then stay in memory. */
let typePrefsCache = null;
function migrateLegacySpeed(){
  const s=loadStore();
  if(s.speedDefaultMigrated) return s;
  if(s.type && Number(s.type.speed)===1) s.type.speed=1.25;
  s.speedDefaultMigrated=true;
  saveStore(s);
  return s;
}
function prefsFromStore(s){
  const t=(s && s.type)||{};
  const speed = SPEEDS[Number(t.speed)] ? Number(t.speed) : 1.25;
  return { size: TYPE_SIZE_PX[t.size] ? t.size : 'm', speed: speed };
}
function getTypePrefs(){
  if(!typePrefsCache) typePrefsCache=prefsFromStore(migrateLegacySpeed());
  return typePrefsCache;
}
function syncSpeedChip(){
  const btn=$('btn-speed');
  if(!btn) return;
  const label=speedText(getTypePrefs().speed);
  btn.textContent=label;
  btn.setAttribute('aria-label', 'Autoplay speed '+label);
}
function applyTypePrefs(){
  const t=getTypePrefs();
  const r=$('reader');
  if(!r) return;
  r.style.fontSize = TYPE_SIZE_PX[t.size];
  r.dataset.size=t.size;
  document.querySelectorAll('#edit-sheet [data-size]').forEach(b=>b.classList.toggle('on', b.dataset.size===t.size));
  document.querySelectorAll('#edit-sheet [data-speed]').forEach(b=>b.classList.toggle('on', Number(b.dataset.speed)===t.speed));
  syncSpeedChip();
}
function setSpeed(speed){
  const frac=listen.playing ? wordElapsedFrac() : 0;
  saveTypePrefs({speed:speed});
  if(listen.playing) scheduleListen(frac);
}
function saveTypePrefs(partial){
  const cur=getTypePrefs();
  const s=loadStore();
  const next={size:cur.size, speed:cur.speed};
  if(partial && partial.size && TYPE_SIZE_PX[partial.size]) next.size=partial.size;
  if(partial && partial.speed!=null && SPEEDS[Number(partial.speed)]) next.speed=Number(partial.speed);
  typePrefsCache=next;
  s.type=Object.assign({}, s.type||{}, next);
  s.speedDefaultMigrated=true;
  saveStore(s);
  applyTypePrefs();
  if(!readerBook || !partial || !partial.size || next.size===cur.size) return;
  afterLayout(()=>{
    if(!readerBook) return;
    if(readMode==='pages') relayoutPages();
    else if(readMode==='autoplay') placeListen(true);
  });
}
function syncListenHeader(){
  const root=$('reader');
  const top=root && root.querySelector('.listen-top');
  if(!root || !top) return;
  const h=top.offsetHeight;
  if(h) root.style.setProperty('--listen-header', h+'px');
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
{id:"veil-22", veiled:true, vsec:"s0", type:"Non-fiction", year:2026},
  {id:"veil-23", veiled:true, vsec:"s0", type:"Fiction", year:2026},
  {id:"veil-24", veiled:true, vsec:"s0", type:"Non-fiction", year:2026},
  {id:"veil-25", veiled:true, vsec:"s0", type:"Non-fiction", year:2026},
  {id:"veil-26", veiled:true, vsec:"s0", type:"Fiction", year:2026},
  {id:"veil-27", veiled:true, vsec:"s0", type:"Non-fiction", year:2026},
  {id:"veil-28", veiled:true, vsec:"s1", type:"Fiction", year:2026},
  {id:"qf-first-water", title:"Quantum Frontier: First Water", subtitle:"Sera Holt · water circuit", series:"Quantum Frontier", era:"Prequels", year:2026, type:"Fiction", status:"Manuscript", freeChapterCount:2, reader:"Leo", audio:["/api/audio?book=first-water"], blurb:"Sera Holt on the water circuit. First Quantum Frontier prequel.", chapters:[
      {label:"Front Matter", text:"First Water\n\nby\nDouglxss Burley Johnson"},
      {label:"Chapter One", text:"Chapter One\n\nThe sample vial was already cold in Sera Holt's hand before she looked at the stream. It had ridden in the shade inside her kit all the way down from the Bothy, two hundred steps of black stone, and when she lifted it into the morning air the glass fogged white. The kit strap found the old thin place on her shoulder, the spot where the pad had worn through on other mornings, and settled on the same bone it always found.\n\nThe stream was the prettiest thing anybody had found since landing, and people at depot said so the way you'd say a dog was friendly before you knew its name. It ran clear over black stone, and in the slow places it glowed. A green you could read by. The kind of green you'd see on a sign over a door at night, bright and wet and a little too sure of itself. Tiny blue flies sat on the surface of the pools, still as chips of glass, and when her shadow crossed them they lifted all at once and came back down in the same places.\n\nUp the bank behind her the Bothy sat on its shelf of stone. They called it the Bothy after the stone huts on the old Earth hills that anybody caught out in weather could sleep in. The Heron, the big lifter drone, had hung over the shelf with it four mornings ago and dropped it the last few feet the way a heron drops on a fish, and by breakfast its feet had bored into the rock and it was part of the shelf. It was long and low and pale gray with no seam you could find, and from the bar it looked like a smooth river stone the size of a barn. Its one long window, the Squint, was dark as wet slate from outside, and the green of the stream lay across it like a stain.\n\nBell was up there too, waiting in its alcove inside. She couldn't see it. She could hear it.\n\nThe crew called the model the Hayward, after the old Earth man who kept the hedges and drove the cattle out of the corn, and this one was Bell. It was a guard, and the only thing on the planet the animals turned around for. It hummed one low note when it was near people, about the pitch of a big cat purring, so you'd always know where it was. That was a ship rule, older than the landing.\n\nAll morning the tinkers had been copying it, little rust-colored birds named for the old pot menders who walked the Earth roads tapping kettles. Up in the fern crowns three or four of them were humming Bell's note back, low and a hair off.\n\nThere were four Haywards, ever, and the Ark wasn't making anything anymore. One had gone into the river the first month, the night after it killed a striped animal at the crossing and the whole river lit green, and some of the crew still said the killing called the rest. One was up at the ridge, and Fenn kept Bell at the Bothy to guard the samples. She wouldn't spend a Hayward on a water run two hundred steps from the door. So Sera had gone down alone, the way everybody did, because the morning was the safer part of the day.\n\nShe stepped into the shallows.\n\nThe cold came through her boots at once, and then it was in her ankles and she quit thinking about it. The current made a small noise in the cut between the banks, and she found herself going quiet without meaning to.\n\nShe waded to where the water slowed against a bar of silt and knelt until the kit rode light on her hip. Her knees went into the stream. It was colder than any water had a right to be with the sun already on her neck, and it smelled faintly sweet, a smell that sat in the back of her throat like cut grass left in a bag.\n\nShe rinsed the mouth of the vial, filled it to the line etched on the glass, and screwed the cap down. The green came in with the water. In the vial it was a scatter of flecks, bright as sparks, and they swam a little when she tipped the glass and then hung still. She wrote the stream mark with the marker, a stub of pale stone that wrote down into the glass itself, a fine white line you could never wash off. She set the vial in the first slot of the kit, and the soft bed closed around it like a hand.\n\nThe second came from under the near bank, where silt made a soft shelf. Clean fill. No sand. She wrote on it, bedded it, and pushed the kit lid down until it clicked under her thumb.\n\nSomewhere up in the ferns a heavy body moved and then stopped moving.\n\nShe didn't turn her head. Rook Daley always said the worst thing you could do out here was look at a sound, because the sound would know.\n\nThe track she'd stepped over coming in was still there at the edge of the bar. Three toes, deep, each one long as her forearm, and water still seeping into the bottom of the print. She looked at it long enough to know that and then she looked back at her hands.\n\nThe third came from a still cut where the current braided around a drowned root. Same green. In the sun the flecks went brighter for a moment, almost white at the center, and then settled back.\n\nThe fourth came from the deep water past the bar, the current trying to twist the glass out of her fingers. A dragonfly as long as her hand hung over the water, its wings the color of oil on a puddle, and then it was gone, and she noticed the birds were gone too.\n\nShe didn't know when they'd stopped. She noticed it the way you notice a clock has stopped, a while after it happened. The spoon-on-pot tapping was gone out of the ferns. There was the stream and her own breath and the flies on the water.\n\nThen, up the bank, Bell's hum stopped.\n\nThe low note cut off clean in the middle, and the morning got bigger around her. Up in the fern crowns the tinkers kept humming it a few breaths longer without Bell, an all-clear coming from birds. Then they quit too. When Bell went quiet, it had heard a big body. Everybody on the crew knew that.\n\nThe rule for this was: when it goes quiet, you finish what's in your hands and you go. You don't run, because running is loud and running sloshes the samples and running makes you prey. You finish. You go.\n\nShe stood. Water ran off her knees. She moved to the last pocket, a shaded cut under hanging fern where the green was thicker than anywhere else on the bar. Thick enough it looked like paint. She knelt, and the cold took her knees again, and she held the vial under and watched it fill.\n\nUp in the ferns the heavy body moved again. Closer. She heard the stems give. A slow pushing, the sound of a big animal putting its weight down carefully because it had all the time in the world.\n\nShe capped the fifth vial. Her hands were steady and she was proud of that later, when she told it. She wrote the mark in short strokes. She bedded it in the kit and counted the slots with her thumb. Five. She pressed the lid shut and held it.\n\nThen she climbed the bank, not fast, and walked the two hundred steps up the stone toward the dark glass of the Squint, and she didn't look back once, and the stems behind her didn't move again until she was at the door.\n\n* * *\n\nThe door at the downhill end of the Bothy slid down into the sill when she laid her palm on it, and behind it was the Porch, a room the size of a closet with a second door on the far side. The outer door rose shut behind her without a sound. You stood in the Porch for ninety breaths while it took the sweet smell off you, and Fenn made everybody count, because the one time a runner skipped it the ferns around the shelf leaned in toward the Bothy for two nights.\n\nSera stood and counted with the kit held flat in both hands. On forty she heard the ferns outside move. On sixty she heard them stop. On ninety the inner door slid down into the floor and she stepped through into the cold.\n\nPast the boot room was the Board, the long work bench, a slab of pale stone grown smooth as an egg. The walls were lined with rushlight, named for the rush candles in old farm kitchens. The light lived in the walls themselves, and it pooled warm wherever hands were working and stayed dim everywhere else.\n\nBell hung in its alcove beside the Board, a hand's width off the floor.\n\nIt was a tapered column about as tall as her chest, made of stacked rings, wide at the base and narrow at the crown. Each ring was turned out of one piece of pale gray metal, matte, with seams so fine a fingernail wouldn't catch on them, and up close it looked like a stack of nested bowls turned on a lathe by somebody who had never made a mistake in their life. It had no face. A thin band of light ran around the crown ring, glowing from inside the metal, and the band brightened on whichever side Bell was paying attention to. Right now it was looking at the Squint, and it was still silent.\n\nOn the back of the crown ring was a small worn wheel the crew called the salt. Turned down, Bell gave you the number and nothing with it. Turned up, it gave you the number and what it thought of you. Fenn kept it at a pinch. Ade turned it all the way up every time Fenn's back was turned, and Bell had never once turned itself back down.\n\nJoss Amari was at the Board holding the ledger, a thin pale leaf that held the day's numbers and took a fingertip for a pen. He was a big soft-voiced man who'd been an orderly in the Ark's infirmary and who still folded things in squares when he was nervous. He was folding a rinse cloth.\n\n\"You were gone long,\" he said.\n\n\"It went quiet down there.\"\n\nHe stopped folding. \"Quiet how?\"\n\n\"Birds quit. A big animal in the ferns above the bar.\"\n\n\"Did you see it?\"\n\n\"I didn't look.\"\n\nBell's crown light came around from the Squint to her, and the hum came back on, low and steady, deep in the column.\n\n\"It went back up the bank,\" Bell said. \"It isn't on the shelf.\" The band of light rested on her a moment. \"You didn't look. Good. Looking is my work.\"\n\n\"Five?\" Joss said.\n\n\"Five.\" She looked past him to the four box beds set into the wall. Three doors were folded back. \"Where's Ade?\"\n\n\"He went down to depot an hour after you. Cutting cycad leaves at the bend on the way.\" Joss turned the folded cloth over. \"He asked Fenn for Bell. She said Bell stays with the Bothy. The other one's up at the ridge for the lander run.\"\n\n\"So he went by himself.\"\n\n\"Double knotted, he told me. Twice.\" Joss shook his head. \"He'll call in when he gets there. He always calls.\"\n\nThe gauge was a square of dark glass set into the stone with a pad beside it the size of a fingertip. It showed a number or it showed a zero, plain on purpose, so you could read it at one look with blood on your hands.\n\nA chipped enamel mug from somebody's night watch sat at the far corner of the Board, fired in the Ark's ring-deck kiln. She moved it out of the way with the back of her hand.\n\nShe set the first vial in the cradle at the gauge and touched the pad with the thimble on her left knuckle, a soft gray cap that read her pulse.\n\nZero. Joss wrote it. Two. Zero. Three. Zero.\n\nFour went in the cradle. She pressed. The window stayed flat, then ticked once and came back down. Joss wrote the tick and the return.\n\nFive had come from the thick water under the fern. She set it in the cradle and pressed her knuckle to the pad.\n\nThe number climbed.\n\nIt climbed the way a tide comes in, slow enough you could watch it, steady enough you knew it would keep coming. It went past the morning number. It went past the line where the card said to mark a draw. It sat there.\n\nShe lifted her knuckle. The number stayed up. Three breaths. Then it settled one tick lower and held, well above the line she'd written at first light.\n\n\"Again,\" Joss said. His voice had gone very quiet.\n\nShe pressed again. The climb came back. Same height. Same hold.\n\nAnd the green in the vial got brighter.\n\nShe almost missed it. Joss was the one who made a small sound in his throat, and when she looked over, the flecks in vial five had lit up from the inside, a hard clean green with white at the centers. They were moving. Slowly, all of them, drifting through the water toward the side of the glass where her knuckle sat on the pad.\n\nShe took her knuckle away.\n\nThe flecks hung where they were. Then, over about a count of ten, they drifted back out into the middle of the water and dimmed.\n\n\"Give it here,\" Bell said, \"before you start naming it.\"\n\nThe top three rings of its column rose on a slow twist and folded down flat into a tray at the height of her hands, with a round sealed well in the middle that was cold enough to fog. She lifted five out of the cradle by the cap and set it in the well. The well closed over the glass. Bell's hum didn't change.\n\n\"Five reads high,\" it said, and then it said the number out loud, the same number that was standing in the gauge window, to the last place. That was all it ever said about water.\n\nThe kit card said to take your own pulse when a reading jumped on your skin, so she touched the thimble to the base of her thumb. Up. The skin there was warm, and when she rubbed it against her finger it tingled faintly, like a foot coming back from being asleep.\n\n\"They moved toward you,\" Joss said.\n\n\"I saw it, Joss.\"\n\nHis hands weren't folding anything now. \"What's the tag?\"\n\nShe looked at the green through the lid of Bell's well. The runners had a name for it already, the two words people said at the mess fly when somebody came back with a bright draw. She took the ledger and wrote with her fingertip the short mark the survey used for a green nobody had sorted yet, and under it, those two words. Ark algae.\n\n\"Logged,\" she said.\n\nThe crier clicked at her collar. Fenn's voice came thin in her ear with the schedule in every word.\n\n\"Holt. Talk to me for the file.\"\n\nShe kept her eyes on the well. \"Vial five's got the green. Gauge climbs when I touch it. My pulse goes with it. Bell read it too. Same number.\"\n\n\"I need a line I can send up the ridge. A number won't carry the day's report.\"\n\n\"It reads,\" she said. \"That's what the log gets.\"\n\nThe crier hissed for a count.\n\n\"Is Brandt with you?\" Fenn said.\n\nJoss's head came up.\n\n\"He left for depot an hour after I went down,\" Sera said. \"He's not there?\"\n\n\"He's not here.\" Another hiss, longer. \"Seal it. Bring the case. Bring Bell. You walk inside its reach the whole way. East scrub watch says there's movement.\"\n\nBell's tray folded back into rings and gave vial five up into her fingers.\n\nJoss had already pulled the hard case out of the Larder, a plain gray case with five soft beds inside. She set vial five in the center bed and the other four around it. When she set it down the flecks lifted a little toward her fingers, and she pulled her hand back and they sank.\n\nShe laid the ledger in the lid pocket, closed the lid, and held her palm flat along the seam. The handfast took. The seam knit shut under her hand like wet linen drawing tight, and when she lifted her palm a faint line of light ran the length of it and went still. Only her hand could open that case now, or Fenn's.\n\n\"Count?\" Joss said.\n\n\"Five vials. One marked. Seal's good.\"\n\n\"I can carry it,\" Bell said. Bell could carry anything up to a stretcher with a grown man on it, holding the load in the air under its crown the way it held itself up, but whatever it carried took plates away from what it could throw in front of you, and it never had enough plates to begin with.\n\n\"How much of me can you cover if you're carrying?\"\n\n\"Less than half. I'll put what I have where it's looking.\"\n\nShe picked the case up herself.\n\nHe was already at the wall by the Porch, taking down the stretcher pole from its rack. It was a plain length of pale ash as long as he was tall, grown in the Ark's tree deck, with the sling rolled tight around it. He put it over his shoulder.\n\n\"Fenn didn't send you,\" she said.\n\n\"She'll send me for the recovery kit when we get there.\" He looked at the box bed with its door still shut, Ade's. \"I'm coming.\"\n\nShe didn't argue with him. She thought about that later too.\n\n* * *\n\nThe path to depot ran open through ferns and black stone for most of a mile, and in the heat it was a long hot tunnel with no roof.\n\nThe case dragged at each rise. She kept her left hand flat over the seam where the ground got rough, and fern fronds the size of doors brushed her calves and left wet stripes.\n\nBell floated at her right hand, close enough to touch, a little higher than her knee off the ground, and it glided over the wet stone without a sway. It held itself up by pushing against the ground the way two magnets push, and the push came from a sealed core in its lowest ring the crew called the hearthstone, a fist-sized fire that would outlast everybody it went out with. It could keep pace with a running person all day. If Bell hung still, it was listening.\n\nIt hummed the nursery song while it went, the one every crew child on the Ark was sung in the ring deck, and near the end of the second line it went flat, the same place every time, because the old crewman who taught it had sung it flat there and Bell kept his mistake.\n\n\"Hum something else,\" she said.\n\n\"No. You like this one.\"\n\n\"I never said that.\"\n\n\"Your pulse did.\"\n\nShe almost laughed, and the case swung, and she caught it.\n\nAt the low cut the track crossed the path again. The same three toes. Fresher. Water still standing in the bottom of the print, and one fern bent down across it and broken at the stem, the green sap still beading at the break.\n\n\"Fresh,\" Bell said, and dropped from the song to the plain hum. She stepped over.\n\nTwenty paces later she smelled it.\n\nSweet first, the stream's cut-grass sweetness, but heavier, with a smell under it, warm and coppery, a smell she knew from the meat deck on the Ark when she was a girl. It hit the back of her throat and stayed. Behind her she heard Joss's boots stop.\n\nThe path bent left around a stand of cycads, fat trunks scaled like pinecones, crowned with stiff fronds in a blue so deep it was almost purple.\n\n\"I can't see well in there,\" Bell said. \"It's all one warm under those leaves. I hear better than I see.\" The band of light on its crown narrowed down to a thin line.\n\n\"Can we go around?\"\n\n\"Off the path is where the tracks go.\"\n\nThe rule said you finish what's in your hands and you go. The case was in her hands. Depot was past the cycads.\n\nShe walked into the bend.\n\nThe first thing she saw was a flora case. Gray, same as hers, lying on its side in the middle of the path with the seam still lit faint along its length. Clean, every corner square. Ade's palm had sealed it. Only Ade's hand opened it now. She knew, looking at it, that nobody was ever going to see what he'd cut this morning.\n\nThe second thing was the boot.\n\nIt was standing up by itself in the soft dirt at the edge of the path. Laced to the top, double knotted, the way Ade Brandt always laced his, because Ade had a terror of a loose lace on open ground and had told everybody about it at least once. It was standing up straight because it wasn't empty. Her eyes went to the top of it before she could stop them: white bone, a ragged red collar, a fly walking on it. One look. She put her eyes back on the knots and kept them there.\n\nBehind her Joss made a sound. One. Then he quit making it.\n\nAde wasn't anywhere she could see. A wide track pressed through the dirt went off the path into the ferns, the width of a cart, dark in places. A scrap of his plaid shirt hung on a frond at the height of her head. Some of the fern stems were broken off clean, higher up than a man could reach.\n\nA bundle of cut cycad leaves lay by the flora case, tied with plant cord. He'd had his hands full.\n\n\"Brandt asked me to come,\" Bell said. \"I was told to stay with the Bothy.\"\n\nNobody answered it. Its salt was still turned all the way up. Ade had turned it there that morning on his way out the Porch, and nobody had turned it back, and Bell hadn't either.\n\nThen Bell went silent.\n\nThe hum cut off at her right hand, and the quiet came in behind it so fast her ears rang. And in the quiet she heard the breathing.\n\nIt was somewhere in the ferns to her right, close, and the sound was so big she didn't know what it was for a moment. A long slow pull of air, like wind going into a cave, and then a pause, and then it went out again, warm, a puff of air that moved the little hairs on her arm and smelled of copper and the stream at the same time.\n\n\"To your right,\" Bell said, very low. \"It isn't moving.\"\n\n\"Joss,\" she said, without turning around.\n\n\"I'm here.\"\n\n\"I can cover one of you,\" Bell said.\n\n\"Her,\" Joss said. He said it right away, the way you'd answer which hand you write with.\n\nBell sank to the dirt at her back and opened.\n\nThe sound came first, one soft rising note, a wet finger drawn around the rim of a glass. Then the top three rings split into curved plates the size of pot lids, seven of them, and they swung round and hung in the air in front of her, a ragged wall from her chest to over her head, a hand's width off her body. Seven. That was all it had. Her belly was bare below them, and her legs, and both her sides, and Bell's own column was the only thing at her back. It was Bell putting its hands up in front of your face, and that was all it was. The plates kept sliding, a little left, a little right, chasing wherever it thought the looking was coming from, and every time one moved, a gap opened somewhere else. Through one of the gaps she could see Joss.\n\nHe was standing six steps behind her with the stretcher pole held across his body in both hands, sweat running out of his hair. He didn't look at the ferns. He looked at the boot.\n\n\"Holt,\" Bell said. Its voice was right behind her ear now, coming out of the spine. \"I need a hand on the yoke.\"\n\nThe yoke was a flat plate on top of the crown ring, behind her shoulder. Bell could kill, but it couldn't kill alone. It needed a living person's bare hand flat on the yoke and the word \"loose\" said out loud, so that whoever said it would carry the killing. That was the Ark's oldest law, and every child aboard learned it before they learned letters.\n\nHer hands were on the case. To reach the yoke she had to take one off and hold the whole weight against her ribs with the other, and the nearest plate was a finger from her elbow. One knock and it would ring like a struck pot. You finish what's in your hands. That was the survey's first rule, and it held her arms where they were.\n\nThe breath came again. In. Pause. Out.\n\nThe ferns in front of her were thick and green and gorgeous, beaded with light, and behind them was a shape. A patch of hide between two fronds, pebbled and dark and shining, with a pattern on it, she could see it, a stripe of the same bright green as the water. The green ran along it in a line, and the line moved when it breathed.\n\nIt was looking at her.\n\nThe case was heavy. Her arms started to shake from holding it high against her ribs, a small fine shake that started in the elbows. She didn't lower it. She stood and held it and her arms shook and the sweat ran down from her hairline and into her eye and she let it sting.\n\nIt was in no hurry. That was the worst of it, and she told it that way every time. It stood there in the ferns, breathing slow, looking at the seven plates and at all of her they didn't hide, the way you'd stand at a market stall and look at a melon you weren't sure you wanted.\n\n\"Two hearts in here,\" Bell said.\n\nShe didn't understand it. There was one of her behind the plates. Joss had nothing in front of him at all.\n\n\"Three,\" Bell said.\n\nThen it didn't say anything else.\n\nShe thought about the vial. It came into her head on its own: the flecks in five, lighting up, drifting toward her knuckle on the pad. The case was against her ribs, the case with five in it, right there over her own heart. The green line on the hide in front of her brightened as she thought it. Or she imagined that. She would never know which.\n\nA fly landed on her lip. She let it walk.\n\n\"Amari,\" Bell said. \"You're in reach.\"\n\nThe yoke was at Joss's height. He was close enough. He could step up behind the plates and lay his hand flat on the crown and say one word, and the edges of the rings would answer for him. She could see all of that in his face through the gap. She watched him see it.\n\nHis eyes went from the plate to the boot and back to the plate.\n\n\"No,\" Joss said.\n\nHe kept both hands on the ash.\n\nBell didn't ask again.\n\nFar off, from depot, she heard the Hedge ring, one low soft tone from the watch line around camp, the tone it gave when a big body crossed it. A big body had come over the line out there too.\n\nThe breath went in.\n\nIt held.\n\nIt held longer than before. The ferns leaned in very slightly, every frond in a wide curve bending at once, toward her left side where there was no plate, and two plates came whipping round to meet it a breath too late, the first one clipping her shoulder hard enough to bruise, and a smell came through the gaps so thick she tasted it, sweet and heavy and green, and her knees started to go and she locked them. One of the seven plates left her then and went to hang in front of Joss's face, and nobody had asked it to. Through the one gap she could see Joss's knuckles gone white on the pole.\n\n\"I'm going to send the Decoy out,\" Bell said. \"Don't move.\"\n\nLow at the base of the spine a hatch opened by her boot, and a pad came out on a thin tether, a soft dark thing the size of a fist, warm against her ankle going by. Then it began to beat. Thump, thump, a little pause, thump, thump. A person's heart, steady, a little quick. You gave the planet a heart to follow that wasn't yours. That was the whole trick of it. Bell paid it out under the lowest plate and away along the dirt, beating, toward the stream side of the bend.\n\nThe stripe of green slid sideways in the ferns.\n\nIt followed the pad. She watched it go through the gaps, a long pebbled bulk moving low behind the fronds, the green line on it brightening with each beat of that false heart. It didn't hurry. It went after the pad the same way it had stood over her, like it knew exactly what it was following and liked it fine. A foot came down and the ground carried it up through her boots. Another. Each one a little softer.\n\nBell stopped the beat.\n\nIt reeled the pad back in, and the pad came up the path out of the leaf litter and slid in under the lowest plate by her ankle, and when it touched her boot it was warm and slick with a smear of bright green, the same green as the water, the same green as the stripe. The hatch closed over it.\n\nShe stood and counted until she couldn't hear the footsteps anymore and then counted to a hundred past that.\n\n\"Gone down,\" Bell said.\n\nThe seven plates came home on that same soft glass note and closed back into rings and the rings into a column, and the green light from under the cycads came in on her all at once. Then the hum came back, and up in the cycad crowns, a few breaths later, a tinker started humming it too.\n\nIt hadn't fired. She thought about that later. Then she thought about Joss's hands on the ash, and she could never decide which one she was angrier at, or whether she was angry at all.\n\nJoss lowered the pole.\n\nHe walked past her to the boot and squatted down on his heels in front of it and looked at it from close, the way he'd have looked at a dressing on a ward. He didn't touch it. He looked at the knots for a long time. Then he stood up.\n\n\"We'll come back for him,\" he said. \"With the sling.\"\n\n\"Joss.\"\n\n\"With the sling, Sera.\"\n\nShe walked past Ade's boot. She walked past his flora case, lit faint along its seam for a hand that wasn't coming back, and past the tied bundle of cycad leaves. She had one case already and both hands on it.\n\nThe cycads opened out. The light went from green to white. Heat hit her face like an oven door.\n\nShe walked the four hundred steps to depot with her arms shaking and her left hand flat on the seam and the sweetness still in her throat, and Bell hummed at her right hand the whole way, and Joss walked behind them carrying the pole. She didn't run. Running jarred the vials.\n\n* * *\n\nFenn waited at the table with the depot ledger open. She was a lean gray woman with a burn scar along one jaw from a reactor job aboard the Ark, who never raised her voice because she'd never needed to. Her Bodkin lay by the ledger, a slim rod of dark metal as long as her forearm, named for the old needle-pointed arrowhead made to slip through mail. It threw a hardened dart without a sound, twelve in the grip, and it fired only for Fenn's hand. On this planet a loud gun called more than it killed.\n\nSera set the case on the table and kept her hand on the seam.\n\n\"Check the seal,\" Fenn said.\n\nSera turned the case so the line of light showed unbroken. Fenn ran one finger down it, then looked up at Sera's face, and past her at Joss with the pole, and stopped.\n\n\"What happened?\"\n\n\"Ade Brandt's on the path at the cycad bend,\" Sera said. \"His boot's there. His case is there, still sealed. He isn't.\"\n\nFenn picked up the Bodkin, thumbed the first dart out of the grip, looked at the point, and seated it back. One.\n\n\"The rest of him?\"\n\n\"Off into the ferns. Toward the stream.\"\n\n\"You saw the animal.\"\n\n\"Some of it. It stood over the bend. It breathed on us. Bell sent the Decoy out and it went after it. Down toward the water.\"\n\nFenn's thumb didn't stop. Four. Five. \"Bell fire?\"\n\n\"Nobody gave me a hand,\" Bell said from behind her.\n\nFenn turned her eyes to Joss. Joss looked back at her. Neither of them said one more word about it, and that was the whole fight.\n\nFenn said a name over her shoulder, and runners were already moving, pulling the long Bodkins out of the rack under the shade cloth.\n\n\"What's the reading?\"\n\n\"Vial five. Gauge climbed when I touched it. My pulse went with it. The green lit up and moved toward my hand in the glass. Joss saw it. Bell read the same number. Numbers are in the ledger in the lid.\"\n\nFenn's eyes came back up. Eight. Nine. \"Moved.\"\n\n\"Toward my knuckle on the pad. Then back when I let go.\"\n\n\"What's on the cause line?\"\n\n\"It's blank.\"\n\nThe runners went out past the table with the long Bodkins. Eleven. Twelve. Fenn laid hers down.\n\n\"Holt,\" she said, and her voice was very low. \"A man's dead on that path, and you're telling me the water reaches for us. I need a sentence I can send up the ridge. What does that mean?\"\n\n\"It reads,\" Sera said. \"Five samples. One marked. That's your handoff.\"\n\n\"That's not enough.\"\n\n\"It's what I've got.\"\n\nFenn held her eyes. The scar on her jaw had gone pale. \"You're sure.\"\n\nSera tipped her chin at the case. \"Ledger has the number. Seal has the vials.\"\n\nShe set the case in the depot rack under the shade cloth, seam facing out so the next watch could see it without opening it. She wrote the file header from Sera's ledger, left the cause line empty, and pressed her fingertip to the receipt line. Then she took a second short Bodkin out from under the table and held it out across the table to Joss, grip first.\n\n\"It'll take your hand,\" she said. \"I keyed it this morning.\"\n\nJoss looked at it. He looked at it about as long as he'd looked at the boot. Then he shifted the stretcher pole off his shoulder and stood it on its end in the dirt beside him, and kept both his hands on the ash.\n\nFenn put the Bodkin back under the table.\n\n\"Bell,\" she said. \"Walk with Amari. Stay in reach of him.\"\n\n\"The Bothy will be empty,\" Bell said.\n\n\"I know where the Bothy is.\"\n\nBell hung there one breath longer than it needed to. \"I'll bring him,\" it said. \"Whatever there is.\"\n\nBell turned in the air, humming, and slid over to hang at Joss's side. Joss wouldn't give the word, so the guard beside him couldn't kill anything that came. Fenn sent it anyway, because the only man at depot who wouldn't carry a weapon was the only one who knew how to lift Ade and Bell could float the stretcher the whole mile.\n\n\"Get water,\" she said to Sera. \"Get off your feet. Don't go near that path. I'll come find you.\"\n\nSera went.\n\nSomebody was crying near the mess fly, the hard ugly kind that's mostly breath. Sera reached the tent and stood one breath at the flap. Out on the east path she could hear Bell going away with Joss and the runners, the nursery song getting smaller, flat in its one place.\n\n* * *\n\nThe sample tent held one table, one cot, and a spare rack, and its pale ceramic cloth carried light in the weave the way the Bothy's walls did. She let the flap fall, set the empty kit on the table, and laid the marker beside her copy of the ledger. A dry leaf was stuck to the corner of it, curled and bright orange at the edges. She brushed it onto the dirt floor.\n\nThe cause line on her copy was blank under the tag and the numbers.\n\nShe sat on the stool. Her arms had stopped shaking on the walk over and now they started again, worse, and she held her hands flat on the table until they quit.\n\nShe could still see the number climbing, and the flecks drifting toward her knuckle, and the stripe going after the beating pad as easy as it would have gone after her. Two hearts, Bell had said. Then three.\n\nShe didn't put those things together. She didn't write anything in the margin. She sat with them separate on the table in front of her, the vial and the hide and the pad, and kept them separate on purpose, the way you'd keep dogs apart that you didn't know yet.\n\nHer right palm was still warm from the handfast seal, a faint warmth that stayed in a line across the middle of it where the seam had been, and when she flexed her hand she could trace it.\n\nShe looked at the base of her left thumb, at the place where she'd touched the thimble after five. The skin there was pink. A small round patch, warm, a little raised, the size of a coin. It didn't hurt. When she pressed it with her other thumb it tingled, faint and steady, and the tingle went up the inside of her wrist a little way and stopped.\n\nShe pulled her sleeve down over it.\n\nLater the runners came back. She heard the slow walk of people with Bell floating the stretcher between them, and Joss's voice saying \"careful, careful\" the way he must have said it a thousand times in the ship's infirmary.\n\nShe didn't go out.\n\nShe set the marker parallel to the edge of the ledger, a tool where first light would find it. After dark she lay back on the cot with her boots on, and the wall let the light go.\n\nThe Hedge rang, one low tone out in the ferns. It rang when a big body crossed it and never told you when the body left. She lay still and counted. Later it rang once more.\n\nBell came in last. She heard the nursery song come up the east path slow and stop at the edge of depot, and Bell hung out there over the black stone facing the path, where it would wait all night because it chose to. Through the weave she could see the band of light around its crown, and the bright side was turned toward her tent.\n\nUp on the shelf the Bothy sat in the dark with nobody in it, and down on the bar under the Squint the bright pockets would be glowing the way they glowed every night, every one of them leaning a little toward the glass.\n\nIn the dark her left thumb was warm. The patch under it tingled, steady as a pulse. Out in the ferns past the Hedge a tinker started up the nursery song, low, in Bell's own voice, and it went flat in the same one place. Bell had stopped humming. She held still and listened to the bird finish the line. The cause line stayed blank where she'd left it."},
    ]},
  {id:"veil-29", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-30", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-31", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-32", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-33", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-34", veiled:true, series:"Quantum Frontier", era:"Prequels", type:"Fiction", year:2026},
  {id:"veil-35", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-36", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-37", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-38", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-39", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-40", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-41", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-42", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-43", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-44", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-45", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-46", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-47", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-48", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-49", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-50", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-51", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-52", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-53", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-54", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-55", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-56", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-57", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-58", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-59", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-60", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-61", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-62", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-63", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-64", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-65", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-66", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-67", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-68", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-69", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-70", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-71", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-72", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-73", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-74", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-75", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-76", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-77", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-78", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-79", veiled:true, vsec:"s4", type:"Fiction", year:2026},
  {id:"veil-80", veiled:true, vsec:"s2", type:"Fiction", year:2026},
  {id:"veil-81", veiled:true, vsec:"s3", type:"Screenplay", year:2026},
  {id:"tvn-the-hills-above-allentown", title:"The Hills Above Allentown", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Fiction", status:"Draft", freeChapterCount:2, companionGroup:"tvn-01-hills", role:"story", blurb:"Four kids on South Mountain after the last bell. The lights answer every question but one.", pdfUrl:"/pdfs/tvn-01-the-hills-above-allentown.pdf", chapters:[
      {label:"Front Matter", text:"The Hills Above Allentown\n\nby Douglxss Burley Johnson / d.b.j."},
      {label:"The Hills Above Allentown", text:"There are hills above Allentown, and the one that sits closest over the city is South Mountain, and if you drive up it after dark you will come to a pull-off on the city side, a wide spot of gravel big enough for maybe six cars, with a steel guardrail at the edge of it. On the far side of that rail the mountain falls away fast, red sumac and little crooked oaks all the way down, and down below them the whole town is spread out under you like somebody spilled a jar of lights across a dark table. Kids have been climbing up there for as long as there has been a road. I'm going to tell you about four of them, and a Friday in October, and what came up the hill at them while they stood at that rail.\n\nDani Peña's mother zipped the Bible into the front pocket of Dani's backpack every morning at the kitchen table, the same way she zipped Dani's coat up to her chin and pulled her braid out from under the collar. It was a small Bible, about the size of a paperback, in Spanish, with a blue vinyl cover and a zipper that ran around three sides of it like a pencil case. Her mother had bought it in Santiago the week before they flew up, and on the first page she had written Daniela Peña Almonte in ballpoint, pressing hard enough that you could read the name backwards from the other side of the paper. Dani was twelve. Two years she had lived in Allentown, and she had spent both of them in the English learner class down the hall at South Mountain Middle School, and in those two years she had never once opened that pocket during a school day. All she knew about it during the day was that the backpack hung a little heavier on the left.\n\nThat Friday the last bell let out at the regular time and the four of them met on the front steps on Emaus Avenue. A custodian was out on the walk with a push broom, sweeping a busted bag of Takis into a dustpan, and the wind kept picking up the little red pieces and carrying them off down the steps away from him.\n\nIsaiah Whitfield had the plan, the way he usually did. Thirteen years old and in the eighth grade, he had his phone already screwed into a little tripod with bendy legs from his birthday, and he was holding it up in front of him like a flashlight.\n\n\"Everybody keeps posting the lights,\" he said. \"White lights over South Mountain, real low, no sound. Two hundred comments under every video, and it's aliens, it's ghosts, it's the end of the world.\" He turned the phone so they could see the screen. \"It's drones. Or it's planes coming into the airport and the angle is weird. I'm going to get it clear, from close, and put it up, and that's the end of it.\"\n\n\"From close how?\" Yadiel asked.\n\n\"From the pull-off. Right over top of where they come up.\"\n\nYadiel Rosario was thirteen too, and the tallest of them by a head. That day he had on his older brother's William Allen hoodie with the canary on the front, and the sleeves hung down past his fingers. His family was Puerto Rican, and his abuela lived with them in the back bedroom of a row house off Fourth Street, and she prayed out loud in the kitchen every morning over the radio with the volume up, so the whole house got prayed for whether it was awake or not.\n\n\"My abuela says don't go up the mountain after dark,\" he said.\n\n\"So we come down before dark.\"\n\n\"Sunset is at six-thirty,\" Dani said. At lunch she had looked it up on her phone, because she had known since Wednesday that they were going whether she said yes or no. \"We have three hours.\"\n\nThe fourth one was Bryce Kressley, who was eleven, a sixth grader, small for it, and he lived two doors down from Isaiah with his grandmother, who said \"ach\" when she dropped a pot lid and still kept a jar of pickled eggs in the refrigerator door. Bryce had her binoculars around his neck in a cracked leather case. Every fall she used them for counting hawks up at Hawk Mountain, and she had let him take them on the condition, which she said twice at the front door, that they came home with him by dark.\n\nThey went up Emaus a couple of blocks and turned up a side street that climbed and kept climbing, past the last houses, where the sidewalk quit and the pavement got patchy and then there was just a gravel shoulder and the trees. Everybody who went to South Mountain knew the path. It started behind a yellow sign that said the road was not maintained in winter, and it went up through the woods in a long zigzag, worn down to dirt and roots by about a hundred years of kids.\n\nIt was a warm afternoon for October, warm enough that they were sweating inside ten minutes. The oaks were just starting to go brown, but the poplars had dropped already, and the path was covered in leaves that went in with a dry crunch and slid a little before they caught. Dani was in her school shoes, flat black ones with no grip on the bottom, and twice she went down on one knee in the leaves. The second time Yadiel stuck his hand back without turning around and she took it and he pulled her up the steep part, and neither one of them mentioned it afterward. Halfway up, off to the side of the path, there was a single roller skate lying on its back in the leaves, white with pink laces, and all four of its wheels were gone. Bryce poked at it with his sneaker as he went by. That was all anybody did about it.\n\nIsaiah talked most of the way up, about frame rates and the zoom on his phone, and about how people believed whatever they saw in a video if it was blurry enough. Bryce asked him what he thought it was if it turned out not to be drones, and Isaiah said it would be drones.\n\n\"But if it isn't,\" Bryce said.\n\n\"Then it's planes.\"\n\n\"But if it isn't planes.\"\n\nIsaiah stopped on the path and put both of his hands on his knees to breathe. \"My mom says people see what they need to see,\" he said. \"She says that's what church is. People needed a story, so they got one. She quit going when I was eight.\"\n\nYadiel said, \"My abuela says your mom is going to come back.\"\n\n\"Your abuela says that about everybody.\"\n\n\"She's been right about a lot of everybody,\" Yadiel said, and he went on up the path ahead of them, and that was the end of that.\n\nThey came out of the trees at the top a little after five, onto the shoulder of the road just above the pull-off, all four of them breathing hard and red in the face. Nobody else was there. A car had been there not long before, because there was a fresh set of tire tracks swung around in the gravel, but it was gone now, and the only sound was the wind going through the sumac below the rail and, way down, the traffic on the streets.\n\nThe sumac below the guardrail had gone red the way it does in October, a deep red like a stop sign, and it ran down the slope in a thick tangle into the scrub oak and then down to the backs of the first houses. The sun was dropping on their left, way out toward Trexlertown, flat and orange, and it laid long shadows from every church steeple and smokestack across the rooftops. Right in the middle of downtown the PPL Building stood up out of everything else, tall and pale, and the top of it already had its lights on, same as every night anybody in that town can remember. Hamilton Street ran off east from there in a line of streetlights coming on one at a time. Past that was the dark cut where the Lehigh River went through, and way off to the right, past where the hills folded together, the old steel stacks in Bethlehem were lit up in colored lights against the sky. A freight train was coming along the river, slow, and every time it got to a crossing it gave two long pulls on the horn, like a man leaning on it, and the sound took a second or two to climb the mountain to them.\n\nIsaiah bent the tripod legs around the top of a guardrail post until it held, and he pointed the phone out over the sumac and hit record. The guardrail was cold. Dani could feel it through the sleeve of her coat where she leaned on it. Somebody, a long time ago, had painted J.R. + M.T. on the post next to her in silver paint, and the paint had flaked so that most of the M was gone.\n\nThey waited a long time. The sun went down behind the far ridge and the city went from orange to blue, and the streetlights started to matter. Bryce kept the binoculars up to his eyes and called out what he saw, which was a man walking a dog in a park, and a bus, and a pigeon on top of a church. Yadiel ate a bag of chips he had been saving since lunch and did not share them, and when Dani looked at him he shared them.\n\nAt twenty minutes to seven the first light came up out of the sumac.\n\nIt was close. That was the first thing that was wrong about it. Everybody in the comments had talked about lights over the mountain, up in the sky, and this one was below them. It rose up out of the red bushes maybe a hundred feet down the slope and stopped, level with the tops of the scrub oak, so that the four kids were looking down at it with the whole city behind it. It was white, about the size of a basketball, and it did not blink. Then there was a second one beside it, and a third, and the three of them hung there in a row in the dusk without making any sound at all.\n\n\"Drones,\" Isaiah said.\n\n\"There's no buzz,\" Bryce said, with the binoculars on them. \"There's no propellers. I can see the bushes right through the bottom of them. Isaiah, there's no anything holding them up.\"\n\nIsaiah's phone was still recording on the post, and his face was lit white from the screen, and he did not reach for it.\n\nAll four phones lit up at once. Dani's buzzed in her coat pocket and Yadiel's buzzed in the pocket of the hoodie, and Bryce's went off in his back pocket loud enough to make him jump. Then the speaker on Isaiah's phone came on, and a voice came out of it, and it was the voice of the map lady. You know the one, the lady who tells you to turn left in four hundred feet, calm and friendly and a little bit slow.\n\n\"Isaiah,\" the voice said. \"You came to see us. Go ahead and ask.\"\n\nYadiel put his hand on the back of Isaiah's hoodie and took a fistful of it. Isaiah did not shake him off, and he stood there at the rail with his mouth a little bit open, and then he closed it, and his jaw got set, the way it did in science class when Mr. Ortiz said a thing he didn't believe.\n\n\"How many cars on that train?\" Isaiah said.\n\n\"Ninety-one,\" said the map lady.\n\n\"Bryce,\" Isaiah said. \"Count it.\"\n\nBryce swung the binoculars over to the river. His hands were shaking so bad he had to brace his elbows on the rail, and he counted out loud under his breath, and it took a long time, because the train was long and the back half of it was going behind buildings. Nobody moved while he counted. When he got to the end he lowered the binoculars and he did not say the number right away.\n\n\"Ninety-one,\" he said.\n\n\"What's my grandmother's middle name?\" Isaiah asked.\n\n\"Loretta,\" said the voice, and Isaiah's hand closed on the top of the guardrail.\n\n\"We were here before your city,\" the map lady said. \"We were here before the river had its name. We made the first of you, a long time ago, and then we went away, and now we have come back for the ones who can see. You can see, Isaiah. The others are not ready. Step over the rail and come down, and we will show you where you came from. You can bring your camera.\"\n\nThe three lights drifted a little nearer up the slope, and the sumac under them moved, all the red leaves turning over and showing their pale undersides, though there was no wind on the kids' faces at all.\n\nIsaiah put his hand flat on the top of the rail. Then he put his left knee up on it.\n\n\"Isaiah,\" Yadiel said. \"No, bro. No.\"\n\n\"They answered,\" Isaiah said. \"They answered everything. You heard them.\"\n\nThen Isaiah got his leg over. The other side of the guardrail was maybe two feet of loose gravel and then just sumac all the way down, with no place to put a foot, and his sneaker came down on the gravel and it slid and he caught himself on the rail. Yadiel still had his hoodie in one fist. Bryce dropped the binoculars against his own chest and grabbed Isaiah's belt in the back with both hands and sat down hard in the gravel with his heels dug in, the way you would hold a dog on a leash.\n\nDani unzipped the front pocket of her backpack.\n\nNever once had she done it at school, and she did it now with her fingers going stiff in the cold, and she took the Bible out and held it in both hands against her coat without opening it. Her mother had told her one thing, a long time ago in Santiago, sitting on the edge of the bed with the fan going, and she had never needed it until now. If a voice comes to you and it is not right, her mother had said, ask it about Jesus. Ask it if He came in the flesh. If they are from God they will tell you yes. The others will not say it.\n\n\"Una pregunta,\" Dani said. Her voice came out small and she made it bigger. \"¿Jesucristo vino en carne? Sí o no.\" Then she said it again in English for the others, slow and careful, the way she said things in Mrs. Bauer's class. \"I have one question. Jesus Christ came in the body. Yes or no?\"\n\nIsaiah's phone stayed quiet on top of the post, with the little red record dot still blinking in the corner of the screen.\n\nThe three lights hung there over the sumac. The leaves under them went still. Down below, the train blew for another crossing by the river, and the sound came up the mountain and went past them.\n\n\"Answer her,\" Isaiah said.\n\nHe was still on the wrong side of the rail, with one leg over and Bryce's whole weight hanging off the back of his belt.\n\n\"You did the train,\" he said. \"You did my grandma. Answer her. It's a yes or a no.\"\n\n\"Isaiah,\" said the map lady, in the same friendly voice. \"Come down.\"\n\n\"Answer her question first.\"\n\n\"Come down, Isaiah. The others are not ready.\"\n\nIsaiah stood there a long time, and his face was lit up by the screen and you could see him working on it, the same as when he worked on a test. They had passed every question he had. They knew his grandmother's name, and they knew the train, and there was one question they would not touch, and it was Dani's. His eyes went to the lights, and to the little blue Bible in Dani's hands, and back to the lights again. Then he swung his leg back over the guardrail, and his knee caught the tripod and knocked it half around on the post, and Bryce fell over backwards in the gravel, and Isaiah stood on the right side of the rail with both hands holding onto it.\n\nThe lights came up the hill.\n\nThey came all at once and fast, tearing up through the sumac and the scrub oak, and the bushes thrashed under them like there was a whole herd of deer running underneath. Every phone they had started buzzing and would not stop. Out of Isaiah's phone the map lady's voice came again, saying turn left, turn left, turn left, faster and faster until the words all ran together. Up close the lights were bigger and had lost their round shape, and none of the four of them would ever agree afterward on what shape they had turned into.\n\nYadiel let go of Isaiah's hoodie and stepped up to the guardrail in front of the other three. He said it the way his abuela had said it in the kitchen the time the grease caught fire in the pan, loud and flat and sure, while she reached for the lid with her other hand.\n\n\"En el nombre de Jesús,\" he said. \"In the name of Jesus. Get off this mountain.\"\n\nThe lights stopped. They stopped so hard it was like they had run into the guardrail, about twenty feet down the slope, and they hung there shaking. Then they dropped. All three went down into the sumac like stones into a pond and came out the bottom of it going away, low over the rooftops, over Hamilton Street, over the river, and on out into the dark toward the airport until the four kids could not tell them from any other light.\n\nEvery phone went dead at once. In the quiet the wind came back up through the sumac, ordinary wind, and they could hear the traffic again down on the streets.\n\nThat was when Bryce found out the binoculars were gone. Their strap had snapped when he sat down hard, and the empty leather case still hung around his neck on its own strap. He ran his hands all over the gravel where he'd been sitting, and they weren't there, and when he got up on his knees and looked over the rail there was just the slope going down into the dark through the red bushes.\n\n\"Those are my grandma's,\" he said. \"Those are for the hawks.\"\n\n\"Nobody goes over that rail,\" Yadiel said. \"Not tonight. Not for anything.\"\n\nBryce stayed on his knees a while longer looking down at the dark, and then he got up and brushed the gravel off the seat of his jeans and did not go over.\n\nThey walked down the mountain in the dark. Isaiah's phone came back on halfway down with four percent battery, and he turned the flashlight on and walked in front, holding it out at arm's length, and nobody said a word the whole way. Dani held the Bible in her hand all the way down and never put it back in the pocket. When they came out at the bottom onto the first street with houses, there was a man up on a stepladder on his porch, stringing Christmas lights along the gutter in the middle of October, or maybe taking down last year's, and they never did figure out which.\n\nIsaiah charged his phone that night on the floor of his bedroom with his back against the bed, while the radiator under the window ticked and knocked, warming up for the first time that fall. The two hundred comments he had planned for did not happen, because every video he had taken that evening was gone off the phone except one, and it was eleven seconds long. When his knee caught the tripod it had swung the camera half around on the post, and for those eleven seconds the camera was pointed back at the four of them instead of out at the city. You can see Isaiah's leg coming back over the guardrail, and Bryce going over backwards in the gravel, and Yadiel letting go of the hoodie and stepping up to the rail, and Dani in her coat holding the little blue Bible up against her chest with both hands. And behind Dani, standing on the gravel of the pull-off where nobody had been standing, there is a tall shape, taller than any grown man by a good deal, standing with its back to the camera and one hand resting on the guardrail beside her, facing down the hill the same way she was. None of the four of them saw it there. Isaiah watched those eleven seconds about forty times that night, and he did not post it, and he has never posted it. Ask him and he will tell you the tall one never turns around, and he would very much like to know who it is.\n\nOn Monday morning, with the radio on the counter giving the traffic on Route 22, Dani's mother picked up the Bible off the kitchen table to zip it into the front pocket of the backpack, the way she always did. Dani took it out of her mother's hands before she could and put it in the pocket of her own coat instead, on the right side, where she could get at it, and her mother let her, and stood at the door and watched her go down the steps toward Emaus Avenue with her hand in her pocket and her thumb on the zipper pull."}
    ]},
    {id:"tvn-the-hills-above-allentown-screenplay", title:"The Hills Above Allentown", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Screenplay", status:"Draft", freeChapterCount:2, companionGroup:"tvn-01-hills", role:"screenplay", blurb:"Teleplay of The Hills Above Allentown. Four kids on South Mountain after the last bell.", pdfUrl:"/pdfs/tvn-01-the-hills-above-allentown-teleplay.pdf", chapters:[
      {label:"Front Matter", text:"The Hills Above Allentown\n\nTeleplay\n\nby Douglxss Burley Johnson / d.b.j.\n\nA Thin Veiled Night"},
      {label:"The Hills Above Allentown", text:"INT. DANI'S KITCHEN - FRIDAY MORNING\n\nDANI'S MOTHER stands at the kitchen table with Dani's backpack open in front of her. She picks up a small SPANISH BIBLE, about the size of a paperback, blue vinyl cover, zipper around three sides like a pencil case. She opens it to the flyleaf.\n\nIn ballpoint, pressed hard enough to read from the other side of the paper: \"Daniela Peña Almonte.\"\n\nShe zips the Bible into the front pocket of the backpack. Then she zips DANI PEÑA ALMONTE (12, seventh grade) into her coat up to the chin and pulls Dani's braid out from under the collar. Dani is wearing flat black school shoes. Once the Bible is in, the backpack hangs a little heavier on the left.\n\nCUT TO:\n\nEXT. SOUTH MOUNTAIN MIDDLE SCHOOL / FRONT STEPS - AFTERNOON\n\nLast bell. Kids pour out onto Emaus Avenue. A CUSTODIAN works a push broom on the walk, herding a busted bag of Takis toward a dustpan. The wind keeps lifting the little red pieces and carrying them down the steps away from him.\n\nISAIAH WHITFIELD (13, eighth grade) already has his phone screwed into a little bendy-leg tripod from his birthday. He holds it up in front of him like a flashlight.\n\nYADIEL ROSARIO (13, eighth, tallest by a head) wears his older brother's William Allen hoodie, canary on the front, sleeves past his fingers.\n\nDani stands with that backpack. Braid out over her coat collar.\n\nBRYCE KRESSLEY (11, sixth, small for it) has a cracked leather binocular case around his neck on a strap. The binoculars inside are his grandmother's. Every fall she takes them up to Hawk Mountain for counting hawks, and she let him bring them today only if he is home by dark.\n\nISAIAH\nEverybody keeps posting the lights. White lights over South Mountain, real low, no sound. Two hundred comments under every video, and it's aliens, it's ghosts, it's the end of the world.\n\nHe turns the phone so they can see the screen. Comment threads. Blurry white blobs.\n\nISAIAH (CONT'D)\nIt's drones. Or it's planes coming into the airport and the angle is weird. I'm going to get it clear, from close, and put it up, and that's the end of it.\n\nYADIEL\nFrom close how?\n\nISAIAH\nFrom the pull-off. Right over top of where they come up.\n\nYADIEL\nMy abuela says don't go up the mountain after dark.\n\nISAIAH\nSo we come down before dark.\n\nDANI\nSunset is at six-thirty. We have three hours.\n\nBryce touches the binocular case like he is checking it is still there.\n\nBRYCE\nGrandma said twice. Home by dark.\n\nISAIAH\nThen we go now.\n\nThey start up Emaus. The custodian loses another handful of Takis to the wind and keeps sweeping.\n\nEXT. SIDE STREET CLIMBING SOUTH MOUNTAIN - CONTINUOUS\n\nThey pass the last houses. The sidewalk quits under their feet, and the pavement goes patchy. After that it is just gravel shoulder and trees.\n\nBehind a yellow sign that says the road is not maintained in winter, a path starts up through the woods in a long zigzag. Dirt and roots, worn down by about a hundred years of kids.\n\nEXT. SOUTH MOUNTAIN PATH - CONTINUOUS\n\nIt is warm for October. They are sweating inside ten minutes. The oaks are just starting to go brown, but the poplars have already dropped, and the leaves crunch and slide under their feet.\n\nIsaiah talks most of the way up about how to shoot video clear, how to zoom in, and how a blurry clip can make people believe almost anything.\n\nDani's school shoes have no grip. She goes down on one knee in the leaves. Yadiel sticks his hand back without turning. She takes it. He pulls her up the steep part. Neither one mentions it.\n\nHalfway up, off the path: a single roller skate on its back in the leaves. It is white, with pink laces, and all four wheels are missing. Bryce pokes it with his sneaker as he goes by. That is all anybody does about it.\n\nBRYCE\nWhat if it isn't drones.\n\nISAIAH\nThen it's planes.\n\nBRYCE\nWhat if it isn't planes.\n\nIsaiah halts on the path and braces both palms on his knees until he can catch his breath.\n\nISAIAH\nMy mom says people see what they need to see. She says that's what church is. People needed a story, so they got one. She quit going when I was eight.\n\nYADIEL\nMy abuela says your mom is going to come back.\n\nISAIAH\nYour abuela says that about everybody.\n\nYADIEL\nShe's been right about a lot of everybody.\n\nYadiel goes on up ahead. That is the end of that.\n\nEXT. SOUTH MOUNTAIN OVERLOOK - LATER\n\nThey come out of the trees onto the shoulder just above the pull-off a little after five. All four of them are breathing hard, faces flushed red.\n\nA wide pull-off of gravel on the city side of the mountain. Room for maybe six cars. A steel guardrail at the edge. Nobody else is there. Fresh tire tracks swing around in the gravel. Wind moves the sumac below the rail. Way down, traffic.\n\nThe sumac has gone deep red like a stop sign, a thick tangle down into scrub oak and then the backs of the first houses. The sun drops left toward Trexlertown, flat and orange. Long shadows from every steeple and smokestack stretch across the rooftops.\n\nDowntown, the PPL Building rises pale above the rest, its top already lit. East along Hamilton the streetlights blink on one after another. The Lehigh River cuts a dark line through the middle. Off to the right, past where the hills fold, Bethlehem's old steel stacks glow in colored lights against the sky.\n\nDown by the water a freight crawls along. At a crossing the horn gives two long pulls, the way a man leans his weight on it. The sound takes a second or two to climb up the mountain to them.\n\nIsaiah wraps the tripod legs around a guardrail post until the phone sits steady. He aims it out over the sumac and starts recording.\n\nThe rail is cold under Dani's coat sleeve when she leans on it. On the post beside her someone painted J.R. + M.T. in silver a long time ago. Most of the M has flaked off.\n\nThey wait.\n\nBehind the far ridge the sun sinks. Orange drains out of the rooftops into blue, and the streetlights start to matter.\n\nBryce keeps the binoculars up and calls what he sees.\n\nBRYCE\nMan walking a dog in a park. Bus. Pigeon on a church.\n\nYadiel eats a bag of chips he has been saving since lunch and does not share them. Dani looks at him. He shares them.\n\nEXT. SOUTH MOUNTAIN OVERLOOK - DUSK\n\nTwenty minutes to seven.\n\nPast the rail the hillside drops hard through red sumac and twisted little oaks. Allentown lies open under them, bright points scattered across the dark like a jar tipped over on a table.\n\nBelow them, the first light comes up out of the sumac.\n\nIt climbs out of the red bushes maybe a hundred feet downslope and hangs even with the scrub-oak tops. The kids look down on it, city lights behind. Below them. That is the first thing that is wrong about it. Everybody talked about lights up in the sky, and this one is close.\n\nThe light is white and about the size of a basketball. It does not blink once.\n\nA second one rises beside it. Then a third. The three hang in a row at dusk and make no sound at all.\n\nISAIAH\nDrones.\n\nBRYCE\nThere's no buzz. There's no propellers. I can see the bushes right through the bottom of them. Isaiah, there's no anything holding them up.\n\nIsaiah's phone keeps recording on the post. His face is lit white from the screen. He does not reach for it.\n\nAll four phones light up together. Dani's buzzes inside her coat. Yadiel's inside the hoodie. Bryce's back-pocket buzz is loud enough to make him jump.\n\nThen Isaiah's phone speaker wakes up. Out comes the map lady's voice, calm and friendly and a touch slow, the same tone she uses when she says turn left in four hundred feet.\n\nMAP LADY (ON PHONE)\nIsaiah. You came to see us. Go ahead and ask.\n\nYadiel puts his hand on the back of Isaiah's hoodie and takes a fistful of it. Isaiah does not shake him off. He stands at the rail with his mouth a little open. Then he closes it. His jaw sets.\n\nISAIAH\nHow many cars on that train?\n\nMAP LADY (ON PHONE)\nNinety-one.\n\nISAIAH\nBryce. Count it.\n\nBryce swings the binoculars to the river. His hands shake. He braces his elbows on the rail and counts out loud under his breath. The train is long. The back half is going behind buildings. Nobody moves.\n\nHe lets the binoculars drop. For a moment he holds the count to himself.\n\nBRYCE\nNinety-one.\n\nISAIAH\nWhat's my grandmother's middle name?\n\nMAP LADY (ON PHONE)\nLoretta.\n\nIsaiah's fingers close hard on the guardrail top.\n\nMAP LADY (ON PHONE) (CONT'D)\nWe were here before your city. We were here before the river had its name. We made the first of you, a long time ago, and then we went away, and now we have come back for the ones who can see. You can see, Isaiah. The others are not ready. Step over the rail and come down, and we will show you where you came from. You can bring your camera.\n\nThe three lights ease a little farther uphill. Under them the sumac stirs, red leaves flipping to show pale undersides, while the kids' faces feel no wind at all.\n\nIsaiah lays a palm flat along the rail top. Next his left knee comes up onto the metal.\n\nYADIEL\nIsaiah. No, bro. No.\n\nISAIAH\nThey answered. They answered everything. You heard them.\n\nIsaiah swings a leg across. Beyond the rail sits maybe two feet of loose gravel, then sumac falling away with nowhere solid to step. His sneaker lands, skids, and he grabs the rail to catch himself.\n\nYadiel keeps a fistful of the hoodie. Bryce lets the binoculars thump against his chest, seizes Isaiah's belt from behind with both hands, and drops his weight into the gravel with his heels planted.\n\nDani unzips the front pocket of her backpack. Her fingers go stiff in the cold.\n\nFLASHBACK TO:\n\nINT. BEDROOM - SANTIAGO, DOMINICAN REPUBLIC - NIGHT (YEARS EARLIER)\n\nDani's mother sits on the edge of the bed. A fan runs in the window. Younger Dani listens from the pillow.\n\nDANI'S MOTHER\nIf a voice comes to you and it is not right, ask it about Jesus. Ask it if He came in the flesh. If they are from God they will tell you yes. The others will not say it.\n\nBACK TO:\n\nEXT. SOUTH MOUNTAIN OVERLOOK - DUSK\n\nDani draws out the small Spanish Bible and presses it shut against her coat with both hands.\n\nDANI\nUna pregunta.\n\nHer voice comes out small. She makes it bigger.\n\nDANI (CONT'D)\n¿Jesucristo vino en carne? Sí o no.\n\nThen again in English, slow and careful.\n\nDANI (CONT'D)\nI have one question. Jesus Christ came in the body. Yes or no?\n\nIsaiah's phone stays quiet on the post. The little red record dot is still blinking.\n\nThe three lights hang over the sumac. The leaves under them go still. Down below, the train blows for another crossing. The sound comes up the mountain and goes past them.\n\nISAIAH\nAnswer her.\n\nHe is still stranded on the wrong side of the rail, one leg across, Bryce's full weight dragging on the back of his belt.\n\nISAIAH (CONT'D)\nYou did the train. You did my grandma. Answer her. It's a yes or a no.\n\nMAP LADY (ON PHONE)\nIsaiah. Come down.\n\nISAIAH\nAnswer her question first.\n\nMAP LADY (ON PHONE)\nCome down, Isaiah. The others are not ready.\n\nIsaiah stands there a long time. The phone screen lights his face. He looks from the lights to the little blue Bible in Dani's hands and back again, the way he does when a science answer will not sit right.\n\nThen Isaiah brings his leg back over to the safe side. His knee clips the tripod and spins it halfway around on the post. Bryce topples backward into the gravel. Isaiah stands where he belongs, both hands locked on the rail.\n\nThe lights come up the hill.\n\nThey rush the hill together, ripping through sumac and scrub oak. The brush under them flails like a whole herd of deer tearing through.\n\nEvery phone buzzes and will not quit. From Isaiah's phone the map lady starts up again:\n\nMAP LADY (ON PHONE)\nTurn left. Turn left. Turn left.\n\nIt speeds up until the words smear into one sound.\n\nUp close the lights are bigger. They have lost their round shape. None of the four will ever agree afterward on what shape they turned into.\n\nYadiel releases Isaiah's hoodie. He moves to the guardrail ahead of the other three and speaks the way his abuela spoke in the kitchen when grease caught fire in the pan: loud, flat, and sure.\n\nYADIEL\nEn el nombre de Jesús. In the name of Jesus. Get off this mountain.\n\nThe lights stop. So hard it is like they ran into the guardrail, about twenty feet down the slope. They hang there shaking.\n\nThen they drop.\n\nAll three lights sink into the sumac like stones into a pond, then slide out under the bushes and flee. They skim low over the rooftops, cross Hamilton Street and the river, and go dark toward the airport until the four kids can no longer pick them out from any other light.\n\nEvery phone goes dead at once.\n\nIt goes quiet. Ordinary wind climbs back through the sumac. Down on the streets they can hear the traffic again.\n\nBryce discovers the binoculars are missing. The strap broke when he sat down hard, and only the empty leather case still hangs from its own strap around his neck. He pats the gravel where he was sitting. They aren't there. Up on his knees he peers over the rail and all he sees is the slope going down into the dark through the red bushes.\n\nBRYCE\nThose are my grandma's. Those are for the hawks.\n\nYADIEL\nNobody goes over that rail. Not tonight. Not for anything.\n\nBryce stays on his knees a while longer, staring into the dark. At last he stands, brushes gravel off the seat of his jeans, and stays on this side of the rail.\n\nEXT. SOUTH MOUNTAIN PATH - NIGHT\n\nThey take the path down in the dark. Halfway, Isaiah's phone wakes with four percent left. He switches on the flashlight and leads, arm stretched out ahead. Nobody talks the whole way.\n\nDani keeps the Bible in her hand the whole walk down. She never returns it to the pocket.\n\nEXT. BOTTOM OF THE HILL / RESIDENTIAL STREET - NIGHT\n\nAt the bottom they step onto a residential street. On a porch a MAN stands on a stepladder working Christmas lights along the gutter in mid-October, hanging them or taking last year's down. He does not look down at them.\n\nThey pass under him without stopping.\n\nINT. ISAIAH'S BEDROOM - NIGHT\n\nIsaiah sits on the floor with his back against the bed. His phone is on the charger. Under the window the radiator ticks and knocks as it warms for the first time this fall.\n\nOn the phone: every video from that evening is gone except one. Eleven seconds.\n\nHe plays it.\n\nOn the screen his knee has clipped the tripod and spun the phone halfway on the post, so for those eleven seconds the lens looks back at the four of them instead of out over the city.\n\nIsaiah's leg comes back over the guardrail. Bryce goes over backwards in the gravel. Yadiel lets go of the hoodie and steps up to the rail. Dani in her coat holds the little blue Bible up against her chest with both hands.\n\nAnd behind Dani, on the pull-off gravel where no one had stood: a TALL SHAPE. It stands taller than any grown man by a good deal. Its back is to the camera. One of its hands rests on the guardrail beside her. It faces down the hill the same way she does.\n\nNot one of the four saw it standing there.\n\nIsaiah watches those eleven seconds again. And again. He does not post it. He never posts it.\n\nThe tall one never turns its face.\n\nIsaiah sits with the phone in both hands and watches the shape that will not turn.\n\nINT. DANI'S KITCHEN - MONDAY MORNING\n\nRadio on the counter. Traffic on Route 22.\n\nDani's mother reaches for the blue Bible on the kitchen table, ready to zip it into the backpack's front pocket the same as Friday morning.\n\nBefore her mother can finish, Dani lifts it from her hands. She slides it into her own coat pocket on the right, where her fingers can find it.\n\nHer mother lets her. From the doorway she watches Dani head down the steps toward Emaus Avenue, one hand in that pocket, thumb resting on the zipper.\n\nFADE OUT."}
    ]},
{id:"tvn-the-hills-above-allentown-study", title:"After the Story: The One Question the Lights Would Not Answer", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Non-fiction", status:"Draft", freeChapterCount:6, companionGroup:"tvn-01-hills", role:"after-story", blurb:"Companion study to The Hills Above Allentown.", pdfUrl:"/pdfs/tvn-01-the-hills-above-allentown-study.pdf", chapters:[
      {label:"Front Matter", text:"After the Story: The One Question the Lights Would Not Answer\n\nby Douglxss Burley Johnson / d.b.j.\n\nA companion study to The Hills Above Allentown"},
      {label:"Back Up the Mountain", text:"Pull your chair in closer, and let's go back up South Mountain one more time.\n\nYou remember the pull-off, and the steel guardrail so cold that Dani could feel it through the sleeve of her coat. Down the slope the sumac had gone red as a stop sign, and past it the whole city of Allentown was coming on one streetlight at a time.\n\nThen the lights came up out of the red bushes, and the map lady started talking out of Isaiah's phone.\n\nIsaiah Whitfield did what a smart kid ought to do with a voice like that, and he tested it. He asked how many cars were on the freight train, and the voice said ninety-one, and Bryce braced his elbows on the rail with his hands shaking and counted every car, and he got ninety-one. Isaiah asked for his grandmother's middle name, and the voice said Loretta. Every question he had, they passed, and they still wanted him over that rail.\n\nThen a twelve-year-old girl in flat black school shoes took a little blue Bible out of her backpack and held it against her coat. She asked the one question her mother had given her years before in Santiago, sitting on the edge of the bed with the fan going. \"¿Jesucristo vino en carne? Sí o no.\" Jesus Christ came in the body. Yes or no?\n\nThe lights that knew the train and knew Loretta went quiet on that one question. Even Isaiah, with one leg over the guardrail and Bryce hanging off the back of his belt, told them, \"It's a yes or a no.\"\n\nThat silence is what we are going to talk about tonight."},
      {label:"Questions to Sit With", text:"1. The lights got every one of Isaiah's questions right, and they were still trying to get him over the guardrail. Read Deuteronomy 13:1-3 and 2 Corinthians 11:14. Why can a voice be right about a lot of facts and still be lying about the one that matters most?\n\n2. Read 1 John 4:1-3. Out of every question in the world, why do you think John gave the church that one, about Jesus Christ coming in the flesh, as the test?\n\n3. Read Acts 19:13-16, then think about Yadiel stepping up to the rail in his brother's William Allen hoodie. He said the Name the way his abuela said it the day the grease caught fire. Why did the name of Jesus work for Yadiel on that mountain, when it went so badly for the sons of Sceva?"},
      {label:"The Teaching: Test the Spirits", text:"The apostle John was an old man when he wrote the letter we call 1 John. The churches he loved had teachers coming through who claimed the Spirit had told them new things. Many Bible teachers think some of them said the Son of God never really had a body. John's answer is plain. Don't believe every spirit. Test them. Any spirit that confesses that Jesus Christ has come in the flesh is from God, and any spirit that will not confess Jesus is not from God (1 John 4:1-3). In the first lines of that same letter he talks about the One he heard, and saw with his own eyes, and touched with his own hands (1 John 1:1).\n\nIsaiah's instinct to test was a good one, and God is not afraid of being checked. Norman Geisler and Frank Turek point out that the Bible itself tells believers to question religious claims, and they list 1 John 4:1 and Deuteronomy 13 among the places it does (Geisler and Turek, ch. 1, p. 47). His tests were good as far as they went. Ninety-one was a real number, and Bryce counted it car by car. The gap was that every test Isaiah picked was one the lights could pass. In Deuteronomy 13, Moses warned Israel about a prophet whose sign comes true and who then says, let's go follow other gods. Don't listen to him, Moses said. Paul says that Satan dresses himself up as an angel of light (2 Corinthians 11:14). A light that can count train cars is still only a light.\n\nJohn Lennox, a mathematician at Oxford, has spent years answering people who think science can explain everything. He calls that belief scientism, and he says plainly that \"Reason has a far larger scope than science\" (Lennox, ch. 2). His picture is his Aunt Matilda's cake. The world's best scientists can tell you every protein and particle in it, and still none of them can tell you why she baked it unless she tells them herself. Isaiah's phone and his questions could measure the lights. They could never tell him whose side the lights were on. Lennox says we only get to know a person when that person reveals himself, usually by speaking, and the Bible's big claim is that God has spoken in His Son (Lennox, ch. 9). Did that Son come in the flesh? That was the question Isaiah never got around to asking until Dani asked it.\n\nBe careful here. The story never says the lights couldn't say the name of Jesus, and the Bible never says evil spirits can't. In Mark 5:7 the spirits in the man from the tombs call Jesus the Son of the Most High God. James 2:19 says the demons believe in one God and shudder. John's test asks for a confession. Will this voice agree, out loud and on God's side, that Jesus Christ came in the flesh? The lights could have said the word Jesus any time they wanted. They would not give Dani her yes.\n\nThink about why that question made them go silent. \"We made the first of you,\" the map lady said. \"We were here before your city.\" That is the old ancient-astronaut story in new clothes, the idea that beings from out there made us or seeded life here. Geisler and Turek note that even a few well known scientists have floated the idea that aliens planted the first life on earth, and then they ask the obvious next question: \"who made the intelligent aliens?\" (Geisler and Turek, ch. 5, p. 121). The claim only pushes the mystery back a step.\n\nThe Bible gives a straight answer. God made the first of us (Genesis 1:27), and from one man He made every nation on the earth (Acts 17:26). Then the Maker did the thing no fake maker would ever own up to. He came down into His own world, took on a body, and died on a cross. On the third day He walked out of the tomb in that same body and told His friends to touch Him and see (John 1:14; Luke 24:39). A voice that wants to be your maker cannot say yes to Dani's question without admitting there is a real Maker, and that He came in the flesh, and that the voice is not Him. So it goes quiet.\n\nThat is why the resurrection matters so much. Paul writes that Christ died for our sins, was buried, and was raised on the third day, and then he names who saw Him: Peter, the Twelve, more than five hundred people at once with most of them still alive to ask, then James, then Paul himself (1 Corinthians 15:3-8). If Christ was not raised, Paul says, your faith is useless (15:17). Josh and Sean McDowell, working through that passage, say the faith rises or falls with the resurrection (McDowell and McDowell, Bible Handbook, \"Difficult Verses from the Books of 1 & 2 Corinthians\"). In More Than a Carpenter they put it this way: \"The Resurrection takes the question 'Is Christianity valid?' out of the realm of philosophy and makes it a question of history\" (ch. 10). History is a thing you can check.\n\nThe Name works the same honest way. In Acts 19 seven sons of a man named Sceva tried to drive out an evil spirit by saying, in the name of the Jesus that Paul preaches. They were borrowing a name that did not belong to them. The spirit answered that it knew Jesus and knew Paul, but who were they? Then the man jumped on them and beat them until they ran out of the house hurt and stripped (Acts 19:13-16). The Name carries power for people who belong to Jesus, when they call on the One it belongs to. Yadiel learned it in a kitchen where his abuela prayed out loud every single morning over the radio. He said it loud and flat and sure, and the lights stopped like they had run into the guardrail.\n\nCourage comes from the same place. Dani's voice came out small, and she made it bigger. Paul told young Timothy that the Spirit God gives us is a Spirit of power and love and a sound mind, and fear did not come from Him (2 Timothy 1:7). In Acts 4 the first believers had just been threatened by the authorities, and they asked God for boldness to keep speaking. The place shook, they were all filled with the Holy Spirit, and they went out and spoke God's word boldly (Acts 4:29-31). The McDowells point to the apostles themselves, who ran and hid when Jesus was arrested and then preached in the open after they saw Him alive: \"They became courageous almost overnight\" (More Than a Carpenter, ch. 7).\n\nAnd the tall one in Isaiah's eleven seconds of video? The story never says, so I won't either. Hebrews 1:14 does tell us God sends His angels to serve the people who belong to Him."},
      {label:"Around the Fire: Talk It Over and Take It Home", text:"Start with Isaiah. His mom told him people see what they need to see, and that church was a story people needed. That is a real objection, and it deserves a real answer. Christianity invites the checking. Paul's note that most of the five hundred were still alive was his way of saying go ask them. Sean McDowell writes that this generation grew up with endless information in their hands and checks what it hears, so the people answering them have to learn that \"truth must be wedded to grace\" (McDowell, \"Introduction\"). If you have a friend like Isaiah, be like Yadiel with his fist in the back of that hoodie, and hang on. If you are the Isaiah in your group, bring your questions. Isaiah still would very much like to know who the tall one is, and that kind of wanting to know is a good place to start.\n\nTalk about the rail. When the strap snapped, Bryce got up on his knees and looked over the rail into the dark after his grandmother's binoculars, the ones she used for counting hawks. Yadiel told him nobody goes over that rail, not tonight and not for anything, and Bryce brushed the gravel off his jeans and stayed. Growing up clean means knowing where your rails are before the night you need them. Paul told Timothy not to let anybody look down on him for being young, and to set an example in how he talked, how he lived, and how he kept himself pure (1 Timothy 4:12). He told the Philippians to fill their minds with whatever is true and right and pure and lovely (Philippians 4:8). Ask yourselves what you let into your head at night with a phone in your hand.\n\nThen talk about Monday morning. For two years Dani's mother zipped that Bible into the backpack every morning, and Dani never once opened the pocket at school. On Monday, Dani took the Bible out of her mother's hands and put it in the right pocket of her own coat, where she could get at it. Her mother let her. That is what it looks like when your parents' faith starts becoming yours.\n\nTry this, this week. Learn 1 John 4:2 by heart, in whatever language your family prays in. Parents, tell your kids the test the way Dani's mother told it, sitting on the edge of the bed. And when a voice comes along that is smooth and friendly and knows a lot about you, whether it comes out of a phone or the dark below a guardrail, ask it about Jesus. Ask it if He came in the flesh. Then listen hard to what it will not say."},
      {label:"Works Cited", text:"Geisler, Norman L., and Frank Turek. I Don't Have Enough Faith to Be an Atheist. Wheaton, IL: Crossway Books, 2004.\n\nLennox, John. Can Science Explain Everything? N.p.: The Good Book Company, 2019.\n\nMcDowell, Josh, and Sean McDowell. The Bible Handbook of Difficult Verses. Eugene, OR: Harvest House Publishers, 2013.\n\nMcDowell, Josh, and Sean McDowell. More Than a Carpenter. Rev. ed. Carol Stream, IL: Tyndale House Publishers, 2009.\n\nMcDowell, Sean. \"Introduction: A New Kind of Apologist.\" In A New Kind of Apologist: Adopting Fresh Strategies, Addressing the Latest Issues, Engaging the Culture, edited by Sean McDowell. Eugene, OR: Harvest House Publishers, 2016."}
    ]},
  {id:"tvn-veil-01", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g1", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-02", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g1", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-03", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g1", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-04", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g2", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-05", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g2", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-06", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g2", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-07", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g3", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-08", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g3", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-09", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g3", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-10", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g4", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-11", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g4", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-12", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g4", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-13", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g5", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-14", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g5", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-15", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g5", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-16", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g6", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-17", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g6", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-18", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g6", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-veil-19", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g7", role:"story", type:"Fiction", year:2026},
  {id:"tvn-veil-20", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g7", role:"screenplay", type:"Screenplay", year:2026},
  {id:"tvn-veil-21", veiled:true, series:"A Thin Veiled Night", companionGroup:"tvn-veil-g7", role:"after-story", type:"Non-fiction", year:2026},
  {id:"tvn-the-helmet-at-bake-oven-knob", title:"The Helmet", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Fiction", status:"Draft", freeChapterCount:2, companionGroup:"tvn-the-helmet-at-bake-oven-knob", role:"story", blurb:"Bake Oven Knob hawk watch. A dented WWII helmet under the shelter floor. Something in Lonnie that wore his dad’s voice.", pdfUrl:"/pdfs/tvn-the-helmet-at-bake-oven-knob.pdf", chapters:[
    {label:"Front Matter", text:"The Helmet\n\nby Douglxss Burley Johnson / d.b.j."},
    {label:"The Helmet", text:"Mattie Szabo had her father's binoculars mashed against her face so hard the rubber cups would leave red rings around her eyes for an hour, and she had been lying on her stomach on the warm rock of the South Lookout long enough for the stone to print its grit into both elbows, and still the hawks would not come over the knob.\n\nThey came down the ridge out of the northeast the way they had all afternoon, red-tails mostly and a few sharp-shins working hard between glides, riding the northwest wind where it hit the Blue Mountain and climbed the face. Then about a quarter mile out, every bird slid off to the south, out over the Lehigh Valley in a long lazy curve around Bake Oven Knob, and picked the ridge back up past the parking lot on the far side, the way creek water goes around a rock.\n\nMr. Oplinger sat behind her on a square of orange foam on the highest boulder, with a clipboard on one knee and a steel clicker in his fist. He was the hawk counter, with a gray mustache and a Phillies cap the sun had turned pink. In the forty minutes since the Szabo kids came up the trail, he had not clicked that clicker once.\n\n\"Fifty years,\" he said, to the valley more than to them. \"The birds don't go around the knob. The knob is the whole reason they come this way.\"\n\nArpi sat three rocks out past Mattie, which was exactly where Mom had said he could not sit. He was nine. He had a Butterscotch Krimpet in each hand and was eating them in turns, a bite off the left and a bite off the right so neither one got ahead, and his sneakers hung out over a drop that went down past the rock face and the tops of the oaks and kept on going. A puff of wind came up the cliff and lifted the hair off his forehead, and he leaned out to watch a crumb fall.\n\nMattie put the binoculars down and got up on her knees.\n\n\"Arpi. Three rocks back.\"\n\n\"I'm watching where it lands.\"\n\n\"It lands at the bottom. Three rocks back, or I tell Mom you ate both Krimpets before the sandwiches.\"\n\nHe scooted back on his butt, one rock and then two, holding the cakes up over his head like they were the ones in danger. Mattie watched every inch with her stomach pulled up tight under her ribs, because she knew how Arpi worked. Arpi walked toward whatever was shiny. Last summer at Dorney Park he had stepped out of the line for the Thunderhawk to watch a man in a cherry picker paint a sign, and Mattie had looked for him for twenty-two minutes while a lady on the loudspeakers read out a little boy in a green Eagles shirt, over and over, and Mom ran the midway with her purse banging her hip. They found him on a bench with a funnel cake a stranger had bought him, and he could not understand why Mom was crying. Since then Mattie kept him on a string in her head, and the string went tight across her chest whenever he got more than a few feet off.\n\nMom had driven them up Bake Oven Road at two o'clock in the minivan with the Christian station on low. Dad was working another Saturday double at the warehouse in Fogelsville, because since July they had been cutting hours on the regular shift and only giving them back on weekends. That was the summer Mom taped an index card over the kitchen sink in her square printing and started reading it while she did the dishes. It was also the summer Mattie watched her sit in the Giant parking lot after a grocery run with the engine off and the receipt in her lap and her forehead down on the steering wheel, dry-eyed and still, while the ice cream went soft in the back. Mattie had kept her eyes on the cart corral and kept her mouth shut the whole time, and when Mom finally lifted her head and turned the key, Mattie reached over and turned the radio up for her.\n\nAt the lot Mom had handed Mattie the backpack with the sandwiches and said phones on, stay with your brother, five-thirty right here. Then she sat a minute with her hands on the wheel, looking up at the oaks going gold over the yellow game lands gate.\n\n\"Pap Heller used to bring me up here when I was Arpi's age,\" she said. \"He'd sit me on the rocks with a thermos of cocoa and go fuss over that old shelter like it was his own house.\" She laughed at herself and told them to go on.\n\nThey had climbed onto the rocks at about a quarter after two, and Mattie had tried to text Mom a picture of the hawks swinging wide, and the picture had sat there with the little circle going around and around until she gave up. She'd had full bars down at the gate.\n\nLonnie Rehrig came up the trail about forty minutes later. He came up over the last boulder red in the face and wet at the hairline, wearing his father's Army field jacket in sun warm enough that Arpi had his sleeves pushed up. The jacket hung to his knees. He did not say hi. He sat down on the rock next to Mattie's, dug a roofing nail out of the pocket, and started scratching at an old spray-painted heart on the stone, a thin grinding squeak she could hear in her back teeth.\n\nThe Rehrigs lived next door. Mattie knew every sound that house used to make when Lonnie's dad was home. She knew the storm door banging back against the siding hard enough to rattle the Szabos' kitchen window, and the Ford idling in the driveway with the hole in its muffler, and a voice through two walls on Friday nights, the words too thick to make out and not needed. Then, around eleven, Lonnie would be on the Szabos' back step with his hood up, and Mom would go out with a plate of whatever was left and not ask him a single question. In July the Ford backed out and went to Hazleton and did not come back. Since then the Rehrig house made no sound at all. Lonnie's mom worked nights at the hospital now, and when Mattie got up to pee at two in the morning she could see the blue of Lonnie's screen still going in his window. There was an oil stain in the driveway the shape of the truck. Lonnie had worn the jacket every day since.\n\n\"You rode all the way up?\" Mattie said.\n\n\"Saw your mom's van go.\" He kept scratching. \"You weren't answering.\"\n\n\"There's no bars up here.\"\n\n\"Nobody gets bars past the gate. It's like the whole mountain turned its phone off.\" He blew the grit out of the scratch. The knuckles on that hand were scabbed across all four, fresh scabs, and when he saw her looking he put the hand back in the jacket pocket.\n\n\"Let's hit the shelter,\" Lonnie said, and kicked a pebble off the edge. \"High school kids leave stuff.\"\n\n\"We have to be at the lot by five-thirty.\"\n\n\"It's like a half mile, Szabo.\"\n\nSo they went. They crossed the top of the knob past the old concrete pad behind the lookout, a square of cracked foundation with four rusted bolt stubs sticking up at the corners, where a light tower had stood back when mail planes flew the valley at night. Arpi stomped right across the middle of it in his orange vest and Mattie barely looked. Past it the trail dropped off the north side of the ridge over the rock slide, boulders as big as cars, with the white blazes painted right on the stone.\n\nArpi went first, because Arpi always went first. He hopped from a flat rock onto a tilted one, and the tilted one rocked under him, and his left leg went straight down into the gap between two boulders all the way to the hip. No yell came out of him. He just stopped, folded over, with one leg gone into the mountain and both hands still up, and the last Krimpet went tumbling down the crack out of sight.\n\nMattie got there without remembering the rocks in between. She hooked both arms under his armpits and hauled, and he came up out of the crack slow, scraping, his jeans pushed up to the knee, and there was a long raw scrape down his shin with beads of blood coming up along it like a row of red buttons. She set him on the flat rock and held onto the back of his vest with her fist.\n\n\"My Krimpet,\" Arpi said.\n\n\"Forget the Krimpet.\"\n\n\"It's down there. It's down there forever.\"\n\nHer hands would not stop shaking, so she kept one of them knotted in his vest and made him walk in front of her the rest of the way down. When she looked back up the slide, Lonnie was standing on a boulder above them with his hands in the jacket pockets, looking off north at the next ridge over. He had not come down to help. He had not even watched.\n\nPast the North Lookout boulders they took the blue blazes down to the shelter. It sat low in the trees, a lean-to of old chestnut logs gone silver with age, with a plank floor raised up off the ground for sleeping. There were beer cans in the leaves around back, and the air under the trees smelled like wet bark and mouse. It was quieter down here than it ought to be with three kids crashing around, the way a classroom goes quiet when the principal walks in.\n\nLonnie checked along the back wall and came up with a dead mango vape, clicked it twice, and stuck it behind his ear like a pencil. Arpi took the empty Krimpet wrapper out of his vest pocket to look at it one more time, and the wind took it out of his fingers and slid it under the plank floor, and because Arpi never let a wrapper go anywhere Mom might find out about, he went in after it on his belly.\n\nHe came out backward with leaves in his hair, dragging an old Army helmet by its strap.\n\nIt was the round steel kind from the war movies, the olive paint gone the brown of a dry creek bed, with a dent above the left side and a canvas chin strap with a brass buckle turned green. Mattie peeled the leather liner back with one finger. Scratched small into the steel underneath, with a nail point, were two letters, H.H., and the whole thing smelled of mildew and pine.\n\nArpi put it on before anybody could stop him. It came down over his eyebrows and his ears and sat on the bridge of his nose.\n\n\"It's quiet in here,\" he said from under it. \"It's like when you put your head under the bathwater.\"\n\n\"Private Szabo,\" Lonnie said. \"Ten-hut.\"\n\nArpi saluted with the wrong hand and marched in a circle on the plank floor, and Mattie laughed and saluted back, and for a minute it was a good Saturday again. Then Lonnie lifted the helmet off Arpi's head and set it on his own, crooked, and rapped the top with his knuckles. It made a dull clank like a pot lid.\n\n\"And take the helmet of salvation!\" he said, in a deep TV preacher voice. \"Ephesians six seventeen! My mom made me do Bible school at your church, Szabo. I got a flannel-board certificate.\"\n\nMattie laughed again, and Lonnie kept going. His voice dropped and roughened, and his shoulders came up, and it was his dad.\n\n\"Lonnie. Lonnie! Get out here. You think I don't see that bike laying in the yard?\"\n\nIt was the Friday voice exactly, the one that came through two walls. Arpi stopped marching. Mattie's laugh stopped somewhere in her throat. Lonnie stood there with the helmet down on his eyebrows, doing the voice a beat longer than a joke goes, and the hand he had raised to point at nobody was shaking.\n\nThen he knocked on the steel again. \"It's just a pot, see?\" he said, in his own voice. \"No angels. No Holy Ghost.\" He pulled it off and tossed it to her, and she caught it against her chest. It was heavy as a cast-iron pan and cold from lying under the boards.\n\nMattie did not put it on. She did not want to wear it for a joke after Lonnie had worn it for one. She slid the chin strap over her wrist and let the helmet hang there, knocking against her leg, and they climbed back up toward the knob without anybody saying a word.\n\nThe light had changed while they were under the trees. It came through the oaks low and slanting and orange now, and their shadows went out long across the rocks. Up on the knob Mr. Oplinger was standing, rolling up his square of foam and snapping the clip on his board shut.\n\nHis eyes went past them to the old tower pad, and he rubbed his jaw.\n\n\"My dad used to say there were giants in the earth in those days,\" he said, \"and whatever they left behind still likes a high place.\" Then he laughed through his nose like it was an old joke he was tired of.\n\nMr. Oplinger told them it was game lands and bow season, keep that orange vest on the little one, and be off these rocks before dark. He asked if their mom was coming, and Mattie said five-thirty, and he said good. Then he went down the trail toward the lot with his thermos knocking on his hip, and Mattie watched the pink cap go small between the trunks until the trees closed behind it. After that it was just the three of them on the mountain.\n\n\"Mattie,\" Arpi said. \"How come the leaves are like that?\"\n\nOak leaves lay heaped against the boulders, and they rattled every time the wind came over. On the concrete pad they lay in a ring. Every leaf lay flat with its stem pointing out toward the trees like the spokes on her bike, and not a single one of them moved. The wind pushed Mattie's bangs into her eyes and sent a whole drift skittering off the rocks behind her, and the leaves on the pad held still as paint.\n\nArpi started toward it. Mattie caught him by the hood of his sweatshirt.\n\n\"Don't step on that.\"\n\n\"Why?\"\n\nShe opened her mouth and shut it again and kept her fist in his hood.\n\nUnder the wind there was a hum. She had taken it for the big lines down along 309, but 309 was miles off, and this came up through the rock into the soles of her sneakers and the fillings in her back teeth, low and steady, like a refrigerator in an empty house.\n\nShe took her phone out to check the time, because the sun was sitting right down on top of Bear Rocks to the west and Mom would be pulling into the lot. The screen said No Service. The clock said 2:14. That was the minute they climbed onto the rocks. She turned it off and on, and it came back up and said 2:14 again, while the sun went on sinking behind the ridge like it had somewhere to be.\n\n\"We have to go,\" she said. \"Lonnie. We have to go now.\"\n\nLonnie did not answer. He had walked out past the South Lookout to the farthest ledge, the narrow one where only the high school kids went to show off, and sat down on it with his legs hanging over the drop.\n\nThen the red-tail came.\n\nIt came down the ridge late and low and all by itself, a big one, the last sun lighting up the rust in its tail. This one did not slide off south like the others. It came straight at the knob on stiff wings, and Mattie had time to think, there, finally, before it reached the air over the concrete pad and stopped dead, the way a bird stops when it flies into a picture window. Every feather on it flared out at once. It screamed. It was a long ragged scream, and up close it went straight into her stomach. The hawk beat backward, fell off the wind, caught itself a few feet above the treetops, and went back up the ridge the way it had come, flapping hard and low like a dog was after it. Three of its breast feathers came down slow, turning over and over. They landed on the pad and lay flat in the ring with their quills pointed out, the same as the leaves.\n\nArpi's mouth was open.\n\n\"It hit the air,\" he said. \"Mattie, it hit the air.\"\n\nShe did not answer him. She had both hands on him now, one on his hood and one on his vest, and she could feel his heart through the back of his ribs going fast like a rabbit's. Nobody had touched them. Nobody had come near them. It was just the three of them and the hum and the leaves, and the sun going down, and her phone saying 2:14.\n\nArpi turned his head toward the valley.\n\n\"Mattie,\" he said, in a calm and interested voice. \"Who's saying my name?\"\n\n\"Nobody's saying your name.\"\n\n\"The man. Over there.\" He pointed with his whole arm, past the pad, past the lookout, at the empty air over the drop. \"He keeps saying Arpád.\"\n\nNobody called him Arpád. Only Grandma Szabo used it, on the phone at Christmas. Mattie looked where he was pointing and saw only air going blue over the valley and the first lights coming on down in Germansville. Arpi's face was the face he'd had looking up at the man in the cherry picker, calm and curious and already leaning. The string in her chest went so tight she could hardly breathe around it, and she pulled him back against her legs and held on.\n\nDown below, a truck downshifted on Bake Oven Road. The sound came all the way up the mountain, a big engine coughing through a muffler with a hole in it.\n\n\"That's him,\" Lonnie said from the ledge.\n\n\"Lonnie, that's anybody's truck.\"\n\n\"It's the Ford. I know the hole in it.\" He said it quiet, almost gentle, with his face turned down toward the road. Then he looked back at her over his shoulder, and his voice went sharp as a slapped hand. \"Don't you tell me what I know, Szabo. You don't know one thing about my dad. Your dad comes home.\"\n\nShe took that and did not give it back. The sun went down behind Bear Rocks. All at once the light on the knob was thin and blue, and the cold came up off the stone, and Lonnie dug his father's angle-head flashlight out of the jacket and smacked it against his palm until it came on yellow.\n\nThe leaves on the pad had started to glow from underneath. A pale white line ran around the ring of them, like light coming under a door.\n\nThen the light came up off the pad and turned.\n\nIt came around slow, a beam as wide as a barn door, white and then green and then white again, sweeping the oaks the way the old tower light must have swept the dark for the mail planes, with no tower under it, only air. A shape stood on the pad inside the beam, and Mattie made herself look right at it. It stood taller than the oaks. It was thin the way a tower frame is thin, all long legs and narrow shoulders, and where its face should have been the light came out.\n\nThe beam passed over Arpi. He twisted down and out of his orange vest like a cat out of a collar, left it hanging empty in her fist, and walked toward the lip of the South Lookout, grinning at the light.\n\nThe beam passed over Mattie, and she heard her own voice inside her head, the one she used on herself in the bathroom mirror. It said Mom sat in the Giant lot with her forehead on the wheel because of her. It said Arpi was going off that rock and it would be her fault, the way it was always her fault, and nobody could hear her up here, and nobody ever could. Her legs went heavy as wet sand, and for one long second she stood there and let it talk.\n\nThen she dropped the vest and ran. She ran bent over under the beam and caught Arpi by the back of his sweatshirt one step from the lip, and they went down hard on the stone together. Her elbow skidded and burned and came away wet. Past Arpi's head there was only air and the tops of the trees a long way down.\n\nArpi kicked. \"Let go. The man says you can see our house from the end.\"\n\nMattie got her knee on his back and jammed the helmet down on his head and fed the green brass prong through the first hole it would reach.\n\n\"God,\" she said. \"Please. Keep his head.\"\n\nThe beam swung around and hit the steel, and it made a sound like sleet on the roof of a car. Arpi went still and blinked up at her from under the rim, and his face was his own face.\n\n\"Why's it so loud in here?\" he said. \"He's still talking, but it's outside now.\" He wiped his nose on his sleeve. \"It isn't true, what he says. Mom says I'm her best surprise.\"\n\nShe dragged him to the scrub oak that grew out of a crack behind the lookout and wrapped his arms around the trunk. \"Hold that tree. Do not let go of it.\"\n\nOut on the end of the far ledge Lonnie was standing now, toes over the edge, hands loose, his flashlight still on behind him. The beam had stopped turning. It sat on him and held there, white.\n\n\"Dad?\" Lonnie said.\n\nMattie heard it then, out loud in the wind, a man's voice, rough and friendly, cigarettes and truck stop coffee in it. \"Come on out, bud. Truck's parked right down there. I came back for the jacket.\"\n\nArpi already had his fingers on the buckle.\n\n\"No,\" Mattie said. \"Keep it.\"\n\n\"Lonnie needs it.\" He held the helmet out with both hands, and she watched his chin start to shake and his eyes fill up, and he held it out anyway. \"Take it. I'll hold the tree. I'll say my verse.\"\n\nShe took it and went out onto the ledge on her hands and knees. The wind had swung around to come off the dark north side of the ridge, and it pushed at her back like a hand, steady and hard, toward the drop. Behind her Arpi hugged the oak and said his memory verse from Mrs. Kistler's class with all the old words, his voice cracking. \"I will lift up mine eyes unto the hills, from whence cometh my help.\"\n\nYou are going to slip, the voice in her head said. He wants to go, so let him go. God is a flannel board in a church basement with the corners peeling off.\n\nMattie stopped crawling and put her forehead down on the cold rock.\n\n\"I can't do this part,\" she said into the stone. \"You do it, God. I'll hold on.\"\n\nThe words were hardly out of her mouth before the wind quit. For three heartbeats there was no wind at all, only the hum, and Lonnie leaned out a little over the dark. Then the wind came back from the other way, up the face of the cliff out of the valley, hard and warm as an August night, smelling of cut corn and chimney smoke. It hit Mattie full in the face and pushed her back from the edge and rocked Lonnie on his heels. Down in the trees below the cliff she heard wings starting to beat, a lot of them, like pigeons going up off a barn roof all at once, and the sound was coming up.\n\nShe got her knees under her and crawled on into that warm wind until she could touch his sneaker.\n\nLonnie turned around. The beam was on his back and his face was dark against it, and when he opened his mouth his father's voice came out of him, the mean Friday night voice. \"Go home, Szabo. Nobody asked you up here. Your old man works doubles so he don't have to look at you.\" He kicked at her, and when she caught his ankle he came down on one knee and swung wild, and the back of his hand caught her across the mouth. Her lip split against her teeth and her whole cheek rang.\n\nThrough the ringing she saw the pad. The tall thing stood in its light behind Lonnie, and when Lonnie drew his arm back to swing again, its long arm drew back at the same time, slow, like a man working a puppet on a stick. When Lonnie's mouth opened, the light where its face should be opened with it. Mattie watched that happen twice, and then she knew who she was fighting. It was the thing on the pad. The boy in front of her was Lonnie, who sat on their back step at eleven at night with his hood up and ate Mom's leftovers off a paper plate. She did not hit him back. She took the second swing on her shoulder and grabbed his father's jacket in both fists and held on, and she turned her face past him, up into the light, at the thing standing in it.\n\n\"You can't have him,\" she said to it.\n\nThen she jammed the helmet down on Lonnie's head with him bucking under her. He clawed at the rim, and she put her whole weight on it and got the canvas strap under his chin and pushed the brass prong at the hole. It was stiff with eighty years of rust, her fingers were slick with blood off her elbow, and it slipped. \"Greater is He that is in me than he that is in the world,\" Mattie said, right up into that light, steady, the way Mom read it off the card over the sink with her hands in the dishwater, with her knees planted on the rock and her thumb already pushing the prong again. It went through, and she cinched the strap tight against his jaw.\n\nThe beam came down on Lonnie square, and the helmet rang like sleet on a car. Lonnie went still on his knees, and Mattie watched his face come back to him as he saw what was standing on the pad.\n\n\"That's not my dad,\" he said. \"It doesn't have a face.\"\n\nUp the warm wind came the hawks, dozens and then hundreds, rising up the cliff in the dusk when every hawk on the mountain ought to have been asleep. They went past the ledge so close she heard the air rip through their feathers and turned in a slow column over the knob. In the gaps between them Mattie saw other shapes standing on the wind, bigger than any bird, with wings that went up past where her eyes would follow, set in a ring around the knob. When she looked straight at one it blurred like a word stared at too long, and she did not try twice.\n\nThe thing swung its light onto the scrub oak. Arpi's arms came loose from the trunk, and he took one step toward the drop with his face gone slack again. Then one of the tall ones was beside him between one blink and the next, and a hand as wide as a snow shovel came down flat on his back and set him against the tree, gentle and sure, the way Mom catches a glass going off the counter and sets it back without looking. Arpi grabbed the trunk and hung on.\n\nIts beam came back around at the ledge. Another of the tall ones stepped down out of the hawks and stood between the pad and the two of them with its wings half open, like somebody holding a storm door wide in a hard wind so it would not bang, and the beam broke on it like creek water on a boulder and went around. In the shadow it made, Lonnie grabbed Mattie's wrist hard enough to hurt, and they went backward on their bellies an inch and then a foot at a time, the helmet scraping stone, until their sneakers hit the scrub oak where Arpi was saying \"whence\" over and over because he had forgotten the rest.\n\nThen the ring of wings closed on the pad. Big blurred shapes came down through the hawks, the hum climbed to a whine like a dentist's drill, and the tall thing folded in on its own light the way an umbrella folds and went down into the concrete like water down a drain. The white line around the ring of leaves went out like a pilot light. When the hum quit, Mattie's phone buzzed against her leg, three times, four, five.\n\nIt was dark on the knob, with stars coming out over the Carbon County side and Germansville strung out yellow below. The wind blew ordinary and cool from the northwest. Lonnie's flashlight lay where he had dropped it, and in its yellow circle the pad was only cracked concrete with four rusty bolts and the leaves lying on it any which way, rattling when the wind went over. Mattie pulled her phone out with shaking fingers. The clock said 6:41. The bars were back, and there were eleven missed calls from Mom.\n\nLonnie sat with his back against the oak. He fumbled the strap loose and held the helmet in his lap.\n\n\"I heard it ring,\" he said.\n\n\"I know.\"\n\n\"In the shelter it was just a pot.\" He turned it over in his hands. \"It didn't do anything for me in the shelter.\"\n\n\"You weren't asking Him for anything in the shelter,\" Mattie said.\n\nLonnie kept quiet a long while. Arpi came and sat against his other side without asking, and Lonnie let him. The vape had fallen from behind his ear somewhere out on the ledge. Then he reached over and touched the corner of Mattie's mouth, where her lip had puffed up fat and split, and took his hand back fast.\n\n\"I hit you out there,\" he said. \"I said that stuff about your dad.\"\n\n\"It was working your arm,\" Mattie said. \"I watched it. I wasn't fighting you.\"\n\n\"That thing you said. The greater one. Say it again.\"\n\nMattie said it again, slower, leaning on the in me. Lonnie put his hand flat on top of the helmet and talked out loud with his eyes open, looking at the dark where the pad was.\n\n\"Jesus? Okay. I don't know how to do this,\" he said. \"That thing got in me and had my dad's voice, and You had the wind. I pick You. You get in me instead. Amen or whatever.\"\n\n\"It's just amen,\" Arpi said. \"You don't need the whatever.\"\n\n\"Amen,\" Lonnie said. He wiped his face on the jacket sleeve and laughed once, wet. \"Amen. Okay.\"\n\nThey were coming out of the trees by flashlight when headlights swung across the lot, and Mom's minivan came back up off Bake Oven Road, where she'd been driving the shoulder with her window down calling their names, and came into the lot fast enough to spray gravel. She was out of it before it stopped rocking, phone in her hand, and she did not yell. She looked at Mattie's mouth and dumped the Turkey Hill soda out of the cup in her holder and wrapped the ice in a napkin and held it on the lip herself. Then she saw what was hanging off Lonnie's wrist, and she turned on the dome light and took the helmet in both hands. Her thumb went right into the dent above the left side, like it knew where to go.\n\n\"That's Pap Heller's,\" she said. She peeled the liner back and there was the H.H. \"He came home from the war with this dent in it. He kept it under that shelter floor. He said it was for whoever needed it more than he did.\"\n\nMom drove them down the mountain without the radio on.\n\nThe next Saturday the wind came out of the northwest again. On the way up, Arpi crawled under the shelter floor on his belly and slid the helmet back where he had found it, and Lonnie checked twice that it was all the way in. Then they climbed the knob, and Mr. Oplinger could not click that clicker fast enough. The hawks came straight down the ridge and straight over the knob, low over the old tower pad, so close Mattie could hear the wind in their feathers. Lonnie sat beside Mr. Oplinger with Mr. Szabo's binoculars, calling them out loud as they came. He had come to church with the Szabos on Sunday and sat between Arpi and Mom, and he had sung the hymns wrong and loud. A big red-tail came over the pad and right over their heads, close enough that its shadow went across Lonnie's hands, and he followed it with the glasses until it was gone, and then he wiped the rubber cups on his sleeve and handed them back to Mattie.\n\n\"Fifty years,\" Mr. Oplinger said, clicking. \"I never saw them come over like this.\"\n\nArpi had a Krimpet in each hand again, a bite off the left and a bite off the right. \"God put the lid back on,\" he said with his mouth full. \"The big brothers just did what He said.\""}
  ]}
];
let selected = BOOKS[0].id;
let readerBook = null;
var readMode = 'pages';
var pages = [];
var pageIndex = 0;
const listen = { words:[], paras:[], index:0, playing:false, finished:false, timer:null, drag:0, y:0, targetY:0, lineTop:null, raf:0, glideLast:0, wordStart:0, wordDur:0, progressTimer:0, userScrolled:false, blockStageToggle:false, blockTimer:0, scrollCommit:0, fontsQueued:false, pageFillQueued:false, prevEl:null, prevPara:null };
const isSoon = b => !b || b.status==='Coming soon' || (!(b.chapters&&b.chapters.length) && !(b.audio&&b.audio.length));
const listTitle = b => (b.series && (b.title||'').indexOf(b.series+': ')===0) ? b.title.slice(b.series.length+2) : b.title;
const SERIES_META = {
  'A Thin Veiled Night': {
    blurb: 'Campfire Christian shorts where the veil thins — miracles, prayer as spiritual technology, kids who are brave through the Holy Spirit. Clean fiction. Each story ships with a companion study.'
  }
};
const sectionLabel = b => {
  if(b.veiled && b.vsec) return '\u2063veil-'+b.vsec;
  if(!b.series) return '';
  if((b.era||'').indexOf('Prequels')===0) return 'Quantum Frontier \u00b7 Prequels';
  return b.series;
};
const sectionHead = sec => {
  if(sec.indexOf('\u2063veil-')===0) return '<span class="sec-copy veil-sec"><span class="veil-stroke-h"></span><span class="veil-stroke-h sm"></span></span>';
  const i=sec.indexOf(' \u00b7 ');
  const t=i<0?sec:sec.slice(0,i);
  const era=i<0?'':sec.slice(i+3);
  const meta=SERIES_META[t]||SERIES_META[sec];
  const m=(meta&&meta.blurb)?meta.blurb:era;
  return '<span class="sec-copy"><span class="t">'+escapeHtml(t)+'</span>'+(m?'<span class="m">'+escapeHtml(m)+'</span>':'')+'</span>';
};
function withSections(items, rowFn, headerFn){
  let last='__none__', out='', open=false;
  const close=()=>{ if(open){ out += '</div>'; open=false; } };
  items.forEach(b=>{
    const sec=sectionLabel(b);
    if(sec && sec!==last){
      close();
      let hh=headerFn(sec, true);
      if(sec.indexOf('\u2063veil-')===0) hh=hh.replace('class="','class="veil-sec-h ');
      out += hh;
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
  if(readerBook && readMode==='scroll') listen.index=wordFromScroll();
  else if(readerBook && readMode==='pages') listen.index=pageWord();
  if(listen.userScrolled) commitScrolledWord();
  stopAutoplay();
  if(readerBook) saveListenProgress();
  stopPageBox();
  const r=$('reader'); if(r) r.classList.remove('open','is-reading');
  document.body.classList.remove('reader-open');
  closeSheets();
  readerBook=null;
}
const LIBRARY_VIEWS = {folders:1, grid:1, list:1};
const CARD_SWATCHES = [
  {bg:'#e8c43a', ink:'#1c1a16'},
  {bg:'#f0a36c', ink:'#1c1a16'},
  {bg:'#e36a4a', ink:'#1c1a16'},
  {bg:'#8a5f31', ink:'#fbf6ee'},
  {bg:'#3a6fd4', ink:'#f7f4ee'},
  {bg:'#c5d0c2', ink:'#1c1a16'},
  {bg:'#1b2d6b', ink:'#f7f4ee'},
  {bg:'#d3dde8', ink:'#1c1a16'},
  {bg:'#c9846a', ink:'#1c1a16'},
  {bg:'#6e7f68', ink:'#fbf6ee'},
  {bg:'#d7c4a3', ink:'#1c1a16'},
  {bg:'#8d4e45', ink:'#fbf6ee'}
];
let shelfQuery = '';
let openFolder = null;
const TVN_SERIES = 'A Thin Veiled Night';
const CUT_IDS = {
  'tvn-the-3-10-shift':1,
  'tvn-the-3-10-shift-screenplay':1,
  'tvn-the-3-10-shift-study':1,
  'tvn-the-nail-box':1,
  'tvn-the-nail-box-screenplay':1,
  'tvn-the-nail-box-study':1,
  'tvn-the-fair-weight':1,
  'tvn-the-fair-weight-screenplay':1,
  'tvn-the-fair-weight-study':1,
  'tvn-the-planetarium-tooth':1,
  'tvn-the-planetarium-tooth-screenplay':1,
  'tvn-the-planetarium-tooth-study':1,
  'tvn-the-palmerton-switch':1,
  'tvn-the-palmerton-switch-screenplay':1,
  'tvn-the-palmerton-switch-study':1,
  'tvn-what-came-up-the-riser':1,
  'tvn-what-came-up-the-riser-screenplay':1,
  'tvn-what-came-up-the-riser-study':1,
  'tvn-run-the-bob-wire-home':1,
  'tvn-run-the-bob-wire-home-screenplay':1,
  'tvn-run-the-bob-wire-home-study':1
};
const CUT_PDF = /\/pdfs\/tvn-(?:02-the-3-10-shift|05-the-nail-box|06-the-fair-weight|07-the-planetarium-tooth|11-the-palmerton-switch|12-what-came-up-the-riser|14-run-the-bob-wire-home)(?:-teleplay|-study)?\.pdf(?:$|[?#])/;
function bookById(id){
  return BOOKS.find(b=>b && b.id===id) || null;
}
function isDeadTvnId(id){
  if(!id) return false;
  if(CUT_IDS[id]) return true;
  if(bookById(id)) return false;
  return true;
}
function isCutPdf(url){
  return !!(url && CUT_PDF.test(String(url)));
}
function isVeiled(x){
  const b=typeof x==='string'?bookById(x):x;
  return !!(b && b.veiled===true);
}
function liveBook(b){
  return !!(b && !isDeadTvnId(b.id) && !isCutPdf(b.pdfUrl));
}
function rememberBook(id){
  if(!id) return;
  try{
    const s=loadStore();
    s.lastBook=id;
    saveStore(s);
  }catch(e){}
}
function tvnStoryShelf(){
  return BOOKS.filter(b=>liveBook(b) && b.series===TVN_SERIES && b.role==='story');
}
function tvnShelfCountLabel(b){
  if(!b || b.series!==TVN_SERIES || b.role!=='story') return '';
  const stories=tvnStoryShelf();
  const i=stories.findIndex(x=>x.id===b.id);
  if(i<0) return '';
  return (i+1)+' of '+stories.length;
}
function pausedCutAutoplay(store){
  const progress=(store && store.progress) || {};
  return Object.keys(progress).some(id=>{
    if(!isDeadTvnId(id)) return false;
    const p=progress[id];
    return !!(p && (p.mode==='autoplay' || p.mode==='listen'));
  });
}
function focusTvnShelf(){
  document.querySelectorAll('[data-sec="'+TVN_SERIES+'"]').forEach(n=>n.classList.remove('is-collapsed'));
  const first=tvnStoryShelf()[0];
  const firstId=first && first.id;
  const nodes=[
    document.querySelector('#list-rail .section[data-sec="'+TVN_SERIES+'"]'),
    document.querySelector('#list-view .list-section[data-sec="'+TVN_SERIES+'"]'),
    firstId ? document.querySelector('#book-grid [data-id="'+firstId+'"]') : null,
    firstId ? document.querySelector('#row-view [data-id="'+firstId+'"]') : null
  ];
  const target=nodes.find(el=>el && el.offsetParent!==null);
  if(target && target.scrollIntoView) target.scrollIntoView({block:'start'});
}
function landOnTvnShelf(){
  stopAutoplay();
  closeReader();
  document.body.classList.remove('is-detail','is-gallery');
  applyLibraryViewClass(getLibraryView());
  if(location.hash) history.replaceState({}, '', location.pathname);
  render();
  focusTvnShelf();
}
function bootLibrary(){
  const id=(location.hash||'').replace(/^#\//,'');
  if(openFallbackStory(id)) return;
  if(isDeadTvnId(id) || isVeiled(id)){ landOnTvnShelf(); return; }
  if(id && liveBook(bookById(id))){ showBook(id, false); return; }
  let store={};
  try{ store=loadStore(); }catch(e){}
  if(!id && openFallbackStory(store.lastBook)) return;
  if(isDeadTvnId(store.lastBook) || isVeiled(store.lastBook)){
    try{ delete store.lastBook; saveStore(store); }catch(e){}
    landOnTvnShelf(); return;
  }
  if(!store.lastBook && !store.tvnCutResumeHandled && pausedCutAutoplay(store)){
    try{
      store.tvnCutResumeHandled=true;
      saveStore(store);
    }catch(e){}
    landOnTvnShelf();
    return;
  }
  render();
}
function getLibraryView(){
  const v = loadStore().libraryView;
  return LIBRARY_VIEWS[v] ? v : 'folders';
}
function saveLibraryView(v){
  try{
    const s = loadStore();
    s.libraryView = v;
    saveStore(s);
  }catch(e){}
}
function applyLibraryChrome(v){
  document.querySelectorAll('#view-seg [data-view]').forEach(btn=>{
    const on = btn.dataset.view===v;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function libraryBodyClass(v){
  return v==='grid' ? 'is-grid' : v==='list' ? 'is-rows' : 'is-list';
}
function applyLibraryViewClass(v){
  const mode = LIBRARY_VIEWS[v] ? v : 'folders';
  document.body.classList.remove('is-list','is-gallery','is-grid','is-rows');
  document.body.classList.add(libraryBodyClass(mode));
  applyLibraryChrome(mode);
  return mode;
}
function setLibraryView(v){
  const mode = applyLibraryViewClass(v);
  saveLibraryView(mode);
  document.body.classList.remove('is-detail');
  closeReader();
  if(location.hash) history.pushState({}, '', location.pathname);
  render();
  window.scrollTo(0,0);
}
function cardSwatch(b){
  const s = String(b && b.id || '') + '\n' + String(b && b.title || '');
  let h = 2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return CARD_SWATCHES[(h>>>0) % CARD_SWATCHES.length];
}
function shelfRank(b){
  const sec=sectionLabel(b);
  if(sec.indexOf('Quantum Frontier')===0) return 0;
  if(sec===TVN_SERIES) return 1;
  return 2;
}
function orderShelf(list){
  const first={};
  list.forEach((b,i)=>{ const k=sectionLabel(b)||('\u0000'+i); if(!(k in first)) first[k]=i; });
  return list.map((b,i)=>({b:b,i:i,k:sectionLabel(b)||('\u0000'+i)}))
    .sort((x,y)=>(shelfRank(x.b)-shelfRank(y.b)) || (first[x.k]-first[y.k]) || ((isVeiled(x.b)?1:0)-(isVeiled(y.b)?1:0)) || (x.i-y.i))
    .map(x=>x.b);
}
function shelfBooks(){
  const base = orderShelf(BOOKS.filter(liveBook));
  const q = shelfQuery.trim().toLowerCase();
  if(!q) return base;
  return base.filter(b=>{
    if(isVeiled(b)) return String(b.series||'').toLowerCase().indexOf(q)!==-1;
    const hay = [b.title, b.subtitle, b.series, b.blurb, b.status, b.type, b.era, b.year, listTitle(b), ROLE_LABEL[b.role]||'', b.role||''].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}
function emptyShelf(){
  return '<div class="shelf-empty">No titles match.</div>';
}
function quotedTitle(b){
  return '\u201c' + escapeHtml(listTitle(b)) + '\u201d';
}
function quietAccessLabel(b){
  if(!b || isSoon(b) || PRICE[b.id]) return '';
  if(b.status==='Draft') return 'Free';
  return '';
}
function roleMarkHtml(b){
  const label=b && ROLE_LABEL[b.role];
  if(!label) return '';
  return '<span class="role-mark">'+escapeHtml(label)+'</span>';
}
function seriesLine(b){
  const role=roleMarkHtml(b);
  const series=b&&b.series ? escapeHtml(b.series) : '';
  const seq=tvnShelfCountLabel(b);
  const parts=[];
  if(seq) parts.push(escapeHtml(seq));
  if(role) parts.push(role);
  if(series) parts.push(series);
  if(!parts.length) return '';
  return '<span class="s">'+parts.join(' \u00b7 ')+'</span>';
}
function rowMeta(b, fallback){
  const mark=roleMarkHtml(b);
  const seq=tvnShelfCountLabel(b);
  return (seq?escapeHtml(seq)+' \u00b7 ':'')+(mark?mark+' \u00b7 ':'')+fallback;
}
function bookCardHtml(b){
  const c = cardSwatch(b);
  const bits = [];
  if(b.year) bits.push(String(b.year));
  const free = quietAccessLabel(b);
  if(free) bits.push(free);
  const year = bits.length ? '<span class="y">' + escapeHtml(bits.join(' \u00b7 ')) + '</span>' : '';
  const deep = c.bg==='#8a5f31' ? ' swatch-deep' : '';
  return '<button type="button" class="book-card' + (isSoon(b)?' soon':'') + deep + '" data-id="' + escapeHtml(b.id) + '" style="background:' + c.bg + ';color:' + c.ink + '"><span class="copy"><span class="t">' + quotedTitle(b) + '</span>' + seriesLine(b) + '</span>' + year + '</button>';
}
function compactMeta(b){
  const bits = [];
  if(b.year) bits.push(String(b.year));
  const free = quietAccessLabel(b);
  if(free) bits.push(free);
  else if(b.status) bits.push(String(b.status));
  return escapeHtml(bits.join(' \u00b7 '));
}
function compactRowHtml(b){
  return '<button type="button" class="compact-row' + (isSoon(b)?' soon':'') + '" data-id="' + escapeHtml(b.id) + '"><span class="copy"><span class="t">' + escapeHtml(listTitle(b)) + '</span>' + seriesLine(b) + '</span><span class="m">' + compactMeta(b) + '</span></button>';
}
function showBook(id, push){
  if(storyFallbackFor(id)){ openFallbackStory(id); return; }
  if(isDeadTvnId(id) || isVeiled(id)){ landOnTvnShelf(); return; }
  const b = bookById(id); if(!b || !liveBook(b)) return;
  selected = id;
  rememberBook(id);
  document.body.classList.remove('is-gallery');
  document.body.classList.add('is-detail');
  closeReader();
  render();
  window.scrollTo(0,0);
  if(push !== false && location.hash !== '#/'+id) history.pushState({book:id}, '', '#/'+id);
}
function closeBook(){
  document.body.classList.remove('is-detail','is-gallery');
  applyLibraryViewClass(getLibraryView());
  closeReader();
  render();
  window.scrollTo(0,0);
  if(location.hash) history.pushState({}, '', location.pathname);
}
const VEIL_PIGMENTS=['138,95,49','28,26,22','27,45,107','227,106,74','197,208,194','232,196,58','90,74,58','58,111,212'];
function veilRand(b){
  const seed=String(b&&b.id||'');
  let h=2166136261; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619); }
  return ()=>{ h=(h+0x6D2B79F5)>>>0; let t=h; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
function veilArtHtml(b, kind){
  const r=veilRand(b);
  const pick=()=>VEIL_PIGMENTS[Math.floor(r()*VEIL_PIGMENTS.length)];
  const blobs=[];
  const nb=2+Math.floor(r()*2);
  for(let i=0;i<nb;i++){
    const x=Math.round(r()*100), y=Math.round(r()*100), sz=Math.round(38+r()*44), a=(0.16+r()*0.16).toFixed(2);
    blobs.push('radial-gradient(ellipse '+sz+'% '+Math.round(sz*(0.7+r()*0.8))+'% at '+x+'% '+y+'%,rgba('+pick()+','+a+'),rgba('+pick()+',0) 70%)');
  }
  const ink=pick();
  const card=kind==='card';
  const n=card?3+Math.floor(r()*2):2;
  let strokes='';
  let top=card?14+r()*10:24+r()*10;
  for(let i=0;i<n;i++){
    const w=Math.round((i===n-1?22:42)+r()*(i===n-1?20:40));
    const left=Math.round((card?8:4)+r()*(card?6:10));
    const hgt=card?(i===0?11:7):(i===0?10:6);
    const tilt=(r()*3-1.5).toFixed(1);
    const a=(i===0?0.34:0.2+r()*0.1).toFixed(2);
    strokes+='<span class="veil-stroke" style="top:'+top.toFixed(1)+'%;left:'+left+'%;width:'+w+'%;height:'+hgt+'px;transform:rotate('+tilt+'deg);background:rgba('+(r()<0.6?ink:pick())+','+a+')"></span>';
    top+=card?(i===0?16:11)+r()*6:(i===0?30:20)+r()*8;
  }
  return '<span class="veil-art" aria-hidden="true" style="background:'+blobs.join(',')+',#efe7da">'+strokes+'</span>';
}
function veilRowHtml(b, kind){
  const id=escapeHtml(b.id);
  const art=veilArtHtml(b, kind);
  if(kind==='card') return '<div class="book-card veil-ph" data-id="'+id+'">'+art+'</div>';
  if(kind==='compact') return '<div class="compact-row veil-ph" data-id="'+id+'">'+art+'</div>';
  if(kind==='rail') return '<div class="row veil-ph" data-id="'+id+'">'+art+'</div>';
  return '<div class="list-row veil-ph" data-id="'+id+'">'+art+'</div>';
}
function renderShelf(){
  const books=shelfBooks();
  const empty = !!shelfQuery.trim() && !books.length;

  const rowOf=b=>isVeiled(b)?veilRowHtml(b,'list'):`<div class="list-row ${isSoon(b)?'soon':''}" data-id="${b.id}"><div><div class="t">${listTitle(b)}</div><div class="m">${rowMeta(b, b.subtitle|| (b.year+' \u00b7 '+b.type))}</div></div></div>`;
  const lv=$('list-view');
  if(empty) lv.innerHTML=emptyShelf();
  else if(shelfQuery.trim()) lv.innerHTML=books.map(rowOf).join('');
  else {
    const groups=[], by={};
    books.forEach(b=>{ const k=sectionLabel(b)||'\u2063veil-misc'; if(!by[k]){ by[k]=[]; groups.push(k); } by[k].push(b); });
    if(openFolder && !by[openFolder]) openFolder=null;
    if(openFolder){
      lv.innerHTML='<button type="button" class="folder-back" id="folder-back">\u2190 All folders</button><div class="folder-head">'+sectionHead(openFolder)+'</div>'+by[openFolder].map(rowOf).join('');
    } else {
      lv.innerHTML='<div class="folder-shelf">'+groups.map(k=>{
        const veil=k.indexOf('\u2063veil-')===0;
        const n=by[k].length;
        const inner=veil?sectionHead(k):'<span class="sec-copy"><span class="t">'+escapeHtml(k.split(' \u00b7 ')[0])+'</span><span class="m">'+escapeHtml((k.split(' \u00b7 ')[1]?k.split(' \u00b7 ')[1]+' \u00b7 ':'')+n+(n===1?' work':' works'))+'</span></span>';
        return '<button type="button" class="folder-tile'+(veil?' veil-sec-h is-veil-folder':'')+'" data-folder="'+escapeHtml(k)+'"><span class="folder-ic" aria-hidden="true"></span>'+inner+'<span class="folder-n"></span></button>';
      }).join('')+'</div>';
    }
  }
  lv.querySelectorAll('.list-row').forEach(el=>{ el.onclick=()=>showBook(el.dataset.id); });
  lv.querySelectorAll('.folder-tile').forEach(el=>{ el.onclick=()=>{ openFolder=el.dataset.folder; renderShelf(); window.scrollTo(0,0); }; });
  const fb=$('folder-back'); if(fb) fb.onclick=()=>{ openFolder=null; renderShelf(); window.scrollTo(0,0); };
  $('list-rail').innerHTML = empty ? '' : withSections(books, b=>isVeiled(b)?veilRowHtml(b,'rail'):`<div class="row ${b.id===selected?'on':''}" data-id="${b.id}"><div class="t">${listTitle(b)}</div><div class="m">${rowMeta(b, b.subtitle||b.type)}</div></div>`, (sec,collapsed)=>`<button type="button" class="section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sectionHead(sec)}</button>`);
  $('list-rail').querySelectorAll('.row').forEach(el=> el.onclick=()=>showBook(el.dataset.id));
  bindCollapse($('list-rail'));
  const grid=$('book-grid');
  if(grid){
    grid.innerHTML = empty ? emptyShelf() : withSections(books, b=>isVeiled(b)?veilRowHtml(b,'card'):bookCardHtml(b), (sec,collapsed)=>`<button type="button" class="list-section grid-section ${collapsed?'is-collapsed':''}" data-sec="${sec}">${sectionHead(sec)}</button>`);
    grid.querySelectorAll('.book-card').forEach(el=>{ el.onclick=()=>showBook(el.dataset.id); });
    bindCollapse(grid);
  }
  const rows=$('row-view');
  if(rows){
    rows.innerHTML = empty ? emptyShelf() : books.slice().map((b,i)=>({b:b,i:i,r:isVeiled(b)?(shelfRank(b)<2?1:2):0})).sort((x,y)=>(x.r-y.r)||(x.i-y.i)).map(x=>isVeiled(x.b)?veilRowHtml(x.b,'compact'):compactRowHtml(x.b)).join('');
    rows.querySelectorAll('.compact-row').forEach(el=>{ el.onclick=()=>showBook(el.dataset.id); });
    bindCollapse(rows);
  }
  const gallery=$('gallery');
  if(gallery) gallery.innerHTML='';
  veilShelf();
}
function veilShelf(){
  document.querySelectorAll('#list-view [data-id], #list-rail [data-id], #book-grid [data-id], #row-view [data-id]').forEach(el=>{
    if(!isVeiled(el.dataset.id)) return;
    el.classList.add('is-veiled');
    el.setAttribute('aria-hidden','true');
    el.setAttribute('inert','');
    el.tabIndex=-1;
    el.onclick=null;
  });
}
function render(){
  renderShelf();
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
      fetch(src,{cache:'no-store'}).then(r=>{ if(r.status===401){ if(st) st.innerHTML='Listening is for members. <a href="/enter?next=/listen">Enter</a>'; throw new Error('member'); } return r.json(); }).then(d=>{ if(!d||!d.url) throw new Error('no url'); a.src=d.url; play(); }).catch(err=>{ if(String(err.message)==='member') return; next(); });
      return;
    }
    a.src=src; play();
  };
  a.onerror=next;
  a.onended=()=>{ if(i<srcs.length){ autoplay=true; next(); } else if(st) st.textContent='Leo \u00b7 hired reader \u00b7 end'; };
  a.removeAttribute('src'); next();
}
const ROLE_ORDER = ['story','screenplay','after-story'];
const ROLE_LABEL = {story:'Story', screenplay:'Screenplay', 'after-story':'After the Story'};
function companionsOf(book){
  if(!book || !book.companionGroup || !liveBook(book)) return [];
  return BOOKS.filter(x=>liveBook(x) && x.companionGroup===book.companionGroup).sort((a,b)=>{
    const ia=ROLE_ORDER.indexOf(a.role), ib=ROLE_ORDER.indexOf(b.role);
    return (ia<0?9:ia)-(ib<0?9:ib);
  });
}
function companionRoles(book){
  const roles=[];
  companionsOf(book).forEach(item=>{
    const role=item && item.role;
    if(role && roles.indexOf(role)<0) roles.push(role);
  });
  return roles;
}
function storyFallbackFor(id){
  if(!id || CUT_IDS[id] || bookById(id)) return null;
  const raw=String(id);
  const stories=BOOKS.filter(b=>liveBook(b) && b.role==='story' && b.companionGroup);
  for(let i=0;i<stories.length;i++){
    const story=stories[i];
    const roles=companionRoles(story);
    if(roles.length!==1 || roles[0]!=='story') continue;
    const group=story.companionGroup;
    if(raw===story.id+'-screenplay' || raw===story.id+'-study' || raw===story.id+'-teleplay') return story;
    if(raw.indexOf(story.id+'-')===0) return story;
    if(group && raw!==story.id && (raw===group || raw.indexOf(group+'-')===0)) return story;
  }
  return null;
}
function openFallbackStory(id){
  const story=storyFallbackFor(id);
  if(!story) return false;
  showBook(story.id, false);
  if(location.hash !== '#/'+story.id) history.replaceState({book:story.id}, '', '#/'+story.id);
  openReader(story);
  return true;
}
function renderDetail(){
  const b=bookById(selected); if(!b || !liveBook(b)) return;
  const set=companionsOf(b);
  const study=set.find(x=>x.role==='after-story' && x.id!==b.id);
  const story=set.find(x=>x.role==='story' && x.id!==b.id);
  const screenplay=set.find(x=>x.role==='screenplay' && x.id!==b.id);
  const free = quietAccessLabel(b);
  let actions = isSoon(b) ? `<button class="btn" type="button" disabled>Coming soon</button>` : `<button class="btn primary" type="button" id="d-read">Open</button>`;
  if(study) actions += `<button class="btn ghost" type="button" id="d-companion">Companion study</button>`;
  if(story) actions += `<button class="btn ghost" type="button" id="d-story">Read the story</button>`;
  if(screenplay) actions += `<button class="btn ghost" type="button" id="d-screenplay">Screenplay</button>`;
  if(b.audio) actions += `<button class="btn ghost" type="button" id="d-listen">Listen</button>`;
  const audio = b.audio ? `<div class="audio-row" id="audio-row"><div class="audio-credit">Read by ${b.reader||'Leo'}</div><audio id="qf-audio" controls preload="metadata"></audio><div class="skip"><button type="button" data-skip="-15">-15</button><button type="button" data-skip="15">+15</button></div><div class="audio-status" id="audio-status">Leo \u00b7 hired reader</div></div>` : '';
  const seq=tvnShelfCountLabel(b);
  $('detail').innerHTML = `<button class="back-shelf" type="button" id="d-back">\u2190 Shelf</button><h1>${b.title}</h1><div class="sub">${seq?seq+' \u00b7 ':''}${b.series?b.series+' \u00b7 '+(b.era||'')+'<br>':''}${b.subtitle}<br>${b.year} \u00b7 ${b.type} \u00b7 ${b.status}${free?' \u00b7 '+free:''}${b.reader?' \u00b7 Read by '+b.reader:''}</div><div class="blurb">${b.blurb||''}</div><div class="actions">${actions}</div>${audio}`;
  const back=$('d-back'); if(back) back.onclick=closeBook;
  const r=$('d-read'); if(r) r.onclick=()=>openReader(b);
  const comp=$('d-companion'); if(comp && study) comp.onclick=()=>showBook(study.id);
  const storyBtn=$('d-story'); if(storyBtn && story) storyBtn.onclick=()=>showBook(story.id);
  const playBtn=$('d-screenplay'); if(playBtn && screenplay) playBtn.onclick=()=>showBook(screenplay.id);
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
const SLUG_RE=/^(INT|EXT|INT\/EXT|I\/E|EST)(\.| )/;
function isTransLine(t){
  if(/^(CUT TO:|FADE OUT\.|FADE IN:|FADE TO:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|FLASHBACK TO:|BACK TO:|TIME CUT:|JUMP CUT:|JUMP CUT TO:)$/.test(t)) return true;
  if(/^FADE (IN|OUT)\.?$/.test(t)) return true;
  return t===t.toUpperCase() && /TO:$/.test(t) && t.length<32;
}
function isCueLine(line){
  const t=String(line||'').trim();
  if(!t || t.length>48) return false;
  if(SLUG_RE.test(t) || isTransLine(t)) return false;
  if(/^\(.+\)$/.test(t)) return false;
  const bare=t.replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
  if(!bare || bare.length>40) return false;
  if(!/[A-Z]/.test(bare) || /[a-z]/.test(bare)) return false;
  return true;
}
function classifyScreenChunk(raw){
  const lines=String(raw||'').split('\n').map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return [];
  if(lines.length===1){
    const t=lines[0];
    if(SLUG_RE.test(t)) return [{kind:'slug', text:t}];
    if(isTransLine(t)) return [{kind:'trans', text:t}];
    if(/^\(.+\)$/.test(t)) return [{kind:'paren', text:t}];
    if(isCueLine(t)) return [{kind:'cue', text:t}];
    return [{kind:'action', text:t}];
  }
  if(isCueLine(lines[0])){
    const out=[{kind:'cue', text:lines[0]}];
    for(let i=1;i<lines.length;i++){
      const t=lines[i];
      if(/^\(.+\)$/.test(t)) out.push({kind:'paren', text:t});
      else if(SLUG_RE.test(t)) out.push({kind:'slug', text:t});
      else if(isTransLine(t)) out.push({kind:'trans', text:t});
      else out.push({kind:'dialogue', text:t});
    }
    return out;
  }
  return [{kind:'action', text:lines.join(' ')}];
}
function screenplayUnits(text){
  const units=[];
  String(text||'').replace(/\r\n/g,'\n').split(/\n\s*\n/).forEach(chunk=>{
    classifyScreenChunk(chunk).forEach(u=>{ if(u.text && String(u.text).trim()) units.push(u); });
  });
  return units;
}
function pushListenBlock(words, paras, chapterIndex, text, kind){
  const tokens=String(text||'').match(/\S+/g)||[];
  if(!tokens.length) return;
  const pi=paras.length;
  tokens.forEach(tok=>{
    words.push({text:tok, i:words.length, pi:pi, chapterIndex:chapterIndex});
  });
  paras.push({pi:pi, chapterIndex:chapterIndex, kind:kind||''});
}
function spClass(base, kind){
  if(kind==='slug'||kind==='action'||kind==='cue'||kind==='dialogue'||kind==='paren'||kind==='trans') return base+' sp-'+kind;
  return base;
}
function buildListen(book){
  const words=[], paras=[];
  const screen=!!(book && book.role==='screenplay');
  chapterEntries(book).forEach(entry=>{
    if(!entry.allowed) return;
    const raw=String(entry.ch.text||'').trim();
    if(!raw) return;
    if(screen){
      screenplayUnits(raw).forEach(u=>pushListenBlock(words, paras, entry.i, u.text, u.kind));
      return;
    }
    raw.split(/\n\n+/).filter(Boolean).forEach(block=>pushListenBlock(words, paras, entry.i, block, ''));
  });
  return {words:words, paras:paras};
}
function afterLayout(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
function chapterLabel(index){
  return 'chapter '+String(index+1).padStart(2,'0');
}
function clampWord(index){
  if(!listen.words.length) return 0;
  let i=index|0;
  if(!isFinite(i) || i<0) i=0;
  if(i>=listen.words.length) i=listen.words.length-1;
  return i;
}
function storedMode(prog){
  if(!prog || !prog.mode) return 'pages';
  if(prog.mode==='autoplay' || prog.mode==='listen') return 'autoplay';
  if(prog.mode==='scroll' || prog.mode==='pages') return prog.mode;
  return 'pages';
}
function saveListenProgress(){
  if(!readerBook) return;
  const word=listen.words.length?clampWord(listen.index):0;
  const w=listen.words[word];
  const payload={mode:readMode, word:word, chapter:w?w.chapterIndex:0};
  if(readMode==='scroll'){
    const sc=$('scroll-view');
    if(sc) payload.scroll=sc.scrollTop|0;
  }
  if(readMode==='pages') payload.page=pageIndex;
  const s=loadStore();
  s.progress=s.progress||{};
  s.progress[readerBook.id]=Object.assign({}, s.progress[readerBook.id]||{}, payload);
  s.lastBook=readerBook.id;
  saveStore(s);
}
function stopProgressClock(){
  if(listen.progressTimer){ clearInterval(listen.progressTimer); listen.progressTimer=0; }
}
function startProgressClock(){
  stopProgressClock();
  saveListenProgress();
  listen.progressTimer=setInterval(()=>{
    if(!listen.playing || !readerBook){ stopProgressClock(); return; }
    saveListenProgress();
  }, 2000);
}
function syncChapterButton(chapterIndex){
  const ch=$('btn-chapter');
  if(!ch) return;
  let idx=chapterIndex;
  if(typeof idx!=='number'){
    const w=listen.words[listen.index];
    idx=w?w.chapterIndex:0;
  }
  const label=chapterTitle(idx||0);
  ch.textContent=label;
  ch.title=label;
}
function sheetsOpen(){
  const edit=$('edit-sheet'), ch=$('chapter-sheet');
  return !!((edit && edit.classList.contains('open')) || (ch && ch.classList.contains('open')));
}
function updateModeChrome(){
  const root=$('reader');
  if(!root) return;
  root.dataset.mode=readMode;
  root.classList.toggle('mode-autoplay', readMode==='autoplay');
  root.classList.toggle('mode-scroll', readMode==='scroll');
  root.classList.toggle('mode-pages', readMode==='pages');
  if(readMode!=='autoplay') setReadingFlag(false);
  document.querySelectorAll('.mode-seg [data-mode]').forEach(b=>{
    const on=b.dataset.mode===readMode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on?'true':'false');
  });
  const speed=document.querySelector('#edit-sheet .speed-row');
  if(speed) speed.hidden=readMode!=='autoplay';
}
function renderScroll(){
  const inner=$('scroll-inner');
  if(!inner) return;
  if(!listen.paras.length || !readerBook){
    inner.innerHTML='<p class="scroll-p">\u2014</p>';
    return;
  }
  const byPara={};
  listen.words.forEach(w=>{ (byPara[w.pi]=byPara[w.pi]||[]).push(w); });
  let last=-1;
  inner.innerHTML=listen.paras.map(p=>{
    let head='';
    if(p.chapterIndex!==last){
      last=p.chapterIndex;
      const ch=readerBook.chapters[p.chapterIndex];
      const label=ch&&ch.label?ch.label:chapterLabel(p.chapterIndex);
      head='<div class="chapter-label" id="ch-'+p.chapterIndex+'" data-ch="'+p.chapterIndex+'">'+escapeHtml(label)+'</div>';
    }
    const words=(byPara[p.pi]||[]).map(w=>'<span class="w" data-i="'+w.i+'">'+escapeHtml(w.text)+'</span>').join(' ');
    return head+'<p class="'+spClass('scroll-p', p.kind)+'">'+words+'</p>';
  }).join('');
}
function scrollToWord(index){
  const sc=$('scroll-view');
  if(!sc) return;
  const el=sc.querySelector('.w[data-i="'+index+'"]');
  if(!el){ sc.scrollTop=0; return; }
  const next=sc.scrollTop+(el.getBoundingClientRect().top-sc.getBoundingClientRect().top)-14;
  sc.scrollTop=Math.max(0, next);
}
function scrollToChapter(chapterIndex){
  const sc=$('scroll-view');
  const el=document.getElementById('ch-'+chapterIndex);
  if(!sc||!el){ scrollToWord(listen.index); return; }
  const next=sc.scrollTop+(el.getBoundingClientRect().top-sc.getBoundingClientRect().top)-8;
  sc.scrollTo({top:Math.max(0, next), behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function wordFromScroll(){
  const sc=$('scroll-view');
  if(!sc||!listen.words.length) return listen.index||0;
  const line=sc.getBoundingClientRect().top+18;
  const nodes=sc.querySelectorAll('.w[data-i]');
  let best=listen.words[0].i;
  for(let i=0;i<nodes.length;i++){
    const id=Number(nodes[i].dataset.i);
    if(nodes[i].getBoundingClientRect().bottom>=line) return id;
    best=id;
  }
  return best;
}
function chapterTitle(index){
  const ch=readerBook&&readerBook.chapters&&readerBook.chapters[index];
  return ch&&ch.label?ch.label:chapterLabel(index||0);
}
function pageHtml(label, text, showLabel, kind, cont){
  const cls=[spClass('', kind).trim(), cont?'pg-cont':''].filter(Boolean).join(' ');
  const attr=cls?(' class="'+cls+'"'):'';
  const body=String(text||'').split(/\n\n+/).filter(Boolean).map(p=>'<p'+attr+'>'+escapeHtml(p)+'</p>').join('');
  return (showLabel?'<div class="pg-label"><span>'+escapeHtml(label)+'</span></div>':'')+(body||'<p>\u2014</p>');
}
function pageCapacity(){
  const host=$('page-body'), reader=$('reader');
  if(!host||!reader||!reader.classList.contains('open')||reader.dataset.mode!=='pages') return null;
  const w=host.clientWidth, h=host.clientHeight;
  if(w<80||h<80) return null;
  const cs=getComputedStyle(host);
  const padT=parseFloat(cs.paddingTop)||0, padB=parseFloat(cs.paddingBottom)||0;
  let lh=parseFloat(cs.lineHeight);
  if(!lh || !isFinite(lh)) lh=(parseFloat(cs.fontSize)||16)*1.6;
  const content=Math.max(0, h-padT-padB);
  return {w:w, h:h, lh:lh, limit:padT+padB+content};
}
function emptyPage(){
  return [{label:readerBook?readerBook.title:'', html:'<p>\u2014</p>', startWord:0, endWord:0, chapterIndex:0}];
}
function paragraphBlocks(){
  const byPara={}, seen={}, blocks=[];
  listen.words.forEach(w=>{ (byPara[w.pi]=byPara[w.pi]||[]).push(w); });
  listen.paras.forEach(p=>{
    const ws=byPara[p.pi]||[];
    if(!ws.length) return;
    blocks.push({
      chapterIndex:p.chapterIndex,
      label:chapterTitle(p.chapterIndex),
      text:ws.map(w=>w.text).join(' '),
      startWord:ws[0].i,
      endWord:ws[ws.length-1].i,
      showLabel:!seen[p.chapterIndex],
      kind:p.kind||''
    });
    seen[p.chapterIndex]=1;
  });
  return blocks;
}
function queuePageFill(){
  if(listen.pageFillQueued || readMode!=='pages' || !readerBook) return;
  listen.pageFillQueued=true;
  const step=()=>{
    if(!readerBook || readMode!=='pages'){ listen.pageFillQueued=false; return; }
    const fontsOk=!document.fonts || document.fonts.status==='loaded';
    if(!pageCapacity() || !fontsOk){ requestAnimationFrame(step); return; }
    listen.pageFillQueued=false;
    relayoutPages();
  };
  requestAnimationFrame(step);
}
function paginate(book){
  if(!book) return emptyPage();
  const blocks=paragraphBlocks();
  if(!blocks.length) return emptyPage();
  const cap=pageCapacity();
  const asPage=b=>({label:b.label, html:pageHtml(b.label, b.text, b.showLabel, b.kind), startWord:b.startWord, endWord:b.endWord, chapterIndex:b.chapterIndex});
  if(!cap) queuePageFill();
  if(!cap) return blocks.map(asPage);
  if(document.fonts && document.fonts.status!=='loaded'){
    if(!listen.fontsQueued){
      listen.fontsQueued=true;
      document.fonts.ready.then(()=>{
        listen.fontsQueued=false;
        if(readerBook && readMode==='pages') relayoutPages();
      }).catch(()=>{ listen.fontsQueued=false; });
    }
    return blocks.map(asPage);
  }
  const probe=mountPageProbe();
  const fits=html=>{ probe.innerHTML=html; return probe.offsetHeight<=cap.limit; };
  let out=[];
  try{
    const htmlOf=(label, text, show, kind, cont)=>pageHtml(label, text, show, kind, cont);
    const linesOf=(text, kind, cont)=>{
      if(!text) return 0;
      probe.innerHTML=htmlOf('', text, false, kind, cont);
      const p=probe.querySelector('p');
      if(!p || !p.firstChild) return 0;
      const range=document.createRange();
      range.selectNodeContents(p);
      const n=[...range.getClientRects()].filter(r=>r.width>0 && r.height>0).length;
      return n || 1;
    };
    const maxFit=(prefix, words, label, show, kind, cont)=>{
      let lo=1, hi=words.length, best=0;
      while(lo<=hi){
        const mid=(lo+hi)>>1;
        if(fits(prefix+htmlOf(label, words.slice(0, mid).join(' '), show, kind, cont))){ best=mid; lo=mid+1; }
        else hi=mid-1;
      }
      return best;
    };
    const widowOrphan=(words, best, kind, cont)=>{
      return Math.min(best, words.length);
      let k=best;
      while(k>0){
        const kept=linesOf(words.slice(0, k).join(' '), kind, cont);
        const rest=linesOf(words.slice(k).join(' '), kind, true);
        if(kept>=2 && rest>=2) return k;
        if(rest<2) k--;
        else return 0;
      }
      return 0;
    };
    const unitsHtml=group=>group.map(u=>htmlOf(u.label, u.text, !!u.showLabel, u.kind, !!u.cont)).join('');
    let cur=[];
    const push=group=>{
      if(!group.length) return;
      const first=group[0];
      out.push({
        label:first.label,
        chapterIndex:first.chapterIndex,
        startWord:first.startWord,
        endWord:group[group.length-1].endWord,
        html:unitsHtml(group)
      });
    };
    blocks.forEach(block=>{
      if(cur.length && cur[0].chapterIndex!==block.chapterIndex){ push(cur); cur=[]; }
      const words=block.text.split(/\s+/).filter(Boolean);
      if(!words.length) return;
      let off=0, cont=false, show=!!block.showLabel, guard=0;
      while(off<words.length && guard++<words.length+4){
        const slice=words.slice(off);
        const prefix=unitsHtml(cur);
        if(fits(prefix+htmlOf(block.label, slice.join(' '), show, block.kind, cont))){
          cur.push({text:slice.join(' '), startWord:block.startWord+off, endWord:block.startWord+off+slice.length-1, label:block.label, chapterIndex:block.chapterIndex, showLabel:show, kind:block.kind||'', cont:cont});
          break;
        }
        let best=maxFit(prefix, slice, block.label, show, block.kind, cont);
        if(best<slice.length) best=widowOrphan(slice, best, block.kind, cont);
        if(best<=0){
          if(cur.length){ push(cur); cur=[]; continue; }
          best=Math.max(1, maxFit('', slice, block.label, show, block.kind, cont));
          if(best<slice.length){
            const adj=widowOrphan(slice, best, block.kind, cont);
            if(adj>0) best=adj;
          }
        }
        if(best>slice.length) best=slice.length;
        if(best<1) best=1;
        cur.push({text:slice.slice(0, best).join(' '), startWord:block.startWord+off, endWord:block.startWord+off+best-1, label:block.label, chapterIndex:block.chapterIndex, showLabel:show, kind:block.kind||'', cont:cont});
        off+=best;
        cont=true;
        show=false;
        if(off<words.length){ push(cur); cur=[]; }
      }
    });
    push(cur);
  } finally { probe.remove(); }
  if(out.length) out=tightenLive(out);
  return out.length?out:emptyPage();
}
function mountPageProbe(){
  const host=$('page-body');
  const cs=getComputedStyle(host);
  const probe=document.createElement('div');
  probe.className=((host.className||'page-body')+' page-measure').trim();
  probe.setAttribute('aria-hidden','true');
  probe.style.boxSizing=cs.boxSizing||'border-box';
  probe.style.width=host.getBoundingClientRect().width+'px';
  probe.style.paddingTop=cs.paddingTop;
  probe.style.paddingRight=cs.paddingRight;
  probe.style.paddingBottom=cs.paddingBottom;
  probe.style.paddingLeft=cs.paddingLeft;
  probe.style.font=cs.font;
  probe.style.letterSpacing=cs.letterSpacing;
  probe.style.wordSpacing=cs.wordSpacing;
  probe.style.textAlign=cs.textAlign;
  (host.parentNode||$('pageview')||$('reader')).appendChild(probe);
  return probe;
}
function htmlForRange(start, end){
  let html='', i=start|0, shown=false;
  while(i<=end){
    const w=listen.words[i];
    if(!w) break;
    let j=i;
    while(j+1<=end && listen.words[j+1] && listen.words[j+1].pi===w.pi) j++;
    const text=[];
    for(let k=i;k<=j;k++) text.push(listen.words[k].text);
    const prev=i>0?listen.words[i-1]:null;
    const cont=!!(prev && prev.pi===w.pi);
    const chapterStart=!prev || prev.chapterIndex!==w.chapterIndex;
    const para=listen.paras[w.pi]||{};
    const show=!shown && chapterStart;
    if(show) shown=true;
    html+=pageHtml(chapterTitle(w.chapterIndex), text.join(' '), show, para.kind||'', cont);
    i=j+1;
  }
  return html;
}
function makePage(start, end){
  const w=listen.words[start]||{};
  return {
    label:chapterTitle(w.chapterIndex||0),
    chapterIndex:w.chapterIndex||0,
    startWord:start,
    endWord:end,
    html:htmlForRange(start, end)
  };
}
function pageOverBudget(html){
  const host=$('page-body');
  if(!host) return false;
  host.innerHTML=html||'';
  if(host.scrollHeight>host.clientHeight+1) return true;
  const cs=getComputedStyle(host);
  const padT=parseFloat(cs.paddingTop)||0, padB=parseFloat(cs.paddingBottom)||0;
  let lh=parseFloat(cs.lineHeight);
  if(!lh || !isFinite(lh)) lh=(parseFloat(cs.fontSize)||16)*1.6;
  const budget=Math.max(0, host.clientHeight-padT-padB);
  const top=host.getBoundingClientRect().top+padT;
  let bot=top;
  for(const el of host.children){
    const r=el.getBoundingClientRect();
    if(r.height>0) bot=Math.max(bot, r.bottom);
  }
  return bot-top>budget+0.5;
}
function tightenLive(list){
  const host=$('page-body');
  if(!host || !list || !list.length) return list;
  const saved=host.innerHTML;
  const src=list.slice();
  const out=[];
  let i=0, guard=0;
  while(i<src.length && guard++<src.length*4+8){
    const pg=src[i];
    if(!pg || typeof pg.startWord!=='number' || typeof pg.endWord!=='number' || pg.endWord<pg.startWord){
      out.push(pg); i++; continue;
    }
    if(!pageOverBudget(pg.html)){ out.push(pg); i++; continue; }
    let lo=pg.startWord, hi=pg.endWord, best=pg.startWord-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(!pageOverBudget(htmlForRange(pg.startWord, mid))){ best=mid; lo=mid+1; }
      else hi=mid-1;
    }
    if(best<pg.startWord) best=pg.startWord;
    if(best>=pg.endWord){ out.push(pg); i++; continue; }
    out.push(makePage(pg.startWord, best));
    const restStart=best+1, restEnd=pg.endWord;
    const nxt=src[i+1];
    if(nxt && nxt.chapterIndex===pg.chapterIndex && typeof nxt.endWord==='number' && nxt.startWord===restEnd+1)
      src[i+1]=makePage(restStart, nxt.endWord);
    else src.splice(i+1, 0, makePage(restStart, restEnd));
    i++;
  }
  host.innerHTML=saved;
  return out.length?out:list;
}
function pageForWord(index){
  if(!pages.length) return 0;
  let found=0;
  for(let i=0;i<pages.length;i++){
    if(typeof pages[i].startWord==='number' && pages[i].startWord<=index) found=i;
    else break;
  }
  return found;
}
function pageWord(){
  const pg=pages[pageIndex];
  if(!pg || !listen.words.length) return listen.index||0;
  const i=clampWord(listen.index);
  if(typeof pg.startWord==='number' && i>=pg.startWord && (typeof pg.endWord!=='number' || i<=pg.endWord)) return i;
  return pg.startWord;
}
function renderPages(opts){
  if(!pages.length) pages=emptyPage();
  if(pageIndex<0) pageIndex=0;
  if(pageIndex>=pages.length) pageIndex=pages.length-1;
  const pg=pages[pageIndex];
  const body=$('page-body');
  if(body) body.innerHTML=pg&&pg.html?pg.html:'<p>\u2014</p>';
  if(!(opts&&opts.keepWord) && pg && typeof pg.startWord==='number') listen.index=clampWord(pg.startWord);
  if($('page-left')) $('page-left').textContent=pg?(pg.label||''):'';
  if($('page-right')) $('page-right').textContent=(pageIndex+1)+' / '+pages.length;
  syncChapterButton(pg?pg.chapterIndex:0);
  saveListenProgress();
}
let pageBoxObs=null;
let pageBoxKey='';
let pageRefit=false;
function pageBoxKeyOf(cap){
  return cap ? cap.w+'x'+cap.h+'@'+getTypePrefs().size : '';
}
function stopPageBox(){
  if(pageBoxObs){ pageBoxObs.disconnect(); pageBoxObs=null; }
  pageBoxKey='';
}
function watchPageBox(){
  const host=$('page-body');
  if(!host || pageBoxObs || typeof ResizeObserver!=='function') return;
  pageBoxObs=new ResizeObserver(()=>{
    if(readMode!=='pages' || !readerBook || pageRefit) return;
    const key=pageBoxKeyOf(pageCapacity());
    if(!key || key===pageBoxKey) return;
    relayoutPages();
  });
  pageBoxObs.observe(host);
}
function relayoutPages(){
  if(!readerBook || readMode!=='pages') return;
  const word=clampWord(listen.index);
  const before=pageBoxKeyOf(pageCapacity());
  pages=paginate(readerBook);
  pageIndex=pageForWord(word);
  listen.index=word;
  renderPages({keepWord:true});
  const after=pageBoxKeyOf(pageCapacity());
  pageBoxKey=after;
  watchPageBox();
  if(after && after!==before && !pageRefit){
    pageRefit=true;
    try{ relayoutPages(); }
    finally{ pageRefit=false; }
  } else if(!pageRefit){
    requestAnimationFrame(()=>{
      if(readMode!=='pages' || !readerBook || pageRefit) return;
      const key=pageBoxKeyOf(pageCapacity());
      if(key && key!==pageBoxKey) relayoutPages();
    });
  }
}
function turnPage(dir){
  if(!readerBook) return;
  if(readMode==='autoplay'){
    const vp=$('listen-viewport');
    const h=vp ? (vp.clientHeight||0) : 0;
    if(!h || !listen.words.length) return;
    const y=clampTrackY((listen.y||0) - dir*h);
    listen.userScrolled=true;
    listen.lineTop=null;
    listen.targetY=y;
    applyTrackY(y);
    const idx=clampWord(wordNearestReadingLine());
    listen.userScrolled=false;
    listen.finished=false;
    listen.index=idx;
    paintListen();
    listen.lineTop=null;
    placeListen(true);
    if(listen.playing) scheduleListen(0);
    else saveListenProgress();
    return;
  }
  if(readMode!=='pages' || !pages.length) return;
  const next=pageIndex+dir;
  if(next<0 || next>=pages.length) return;
  pageIndex=next;
  renderPages();
}
function setReadMode(mode){
  if(mode!=='autoplay' && mode!=='scroll' && mode!=='pages') return;
  if(!readerBook){ readMode=mode; updateModeChrome(); return; }
  if(mode===readMode){ closeSheets(); return; }
  if(readMode==='autoplay') stopAutoplay();
  else if(readMode==='scroll') listen.index=wordFromScroll();
  else if(readMode==='pages') listen.index=pageWord();
  listen.index=clampWord(listen.index);
  listen.finished=false;
  listen.userScrolled=false;
  listen.lineTop=null;
  readMode=mode;
  updateModeChrome();
  closeSheets();
  if(mode!=='pages') stopPageBox();
  afterLayout(()=>{
    if(!readerBook || readMode!==mode) return;
    if(mode==='autoplay'){
      paintListen();
      if(!listen.playing) setPlayLabel(false);
      placeListen(!listen.playing);
      saveListenProgress();
    } else if(mode==='scroll'){
      scrollToWord(listen.index);
      syncChapterButton();
      saveListenProgress();
    } else relayoutPages();
  });
}
function setPdfLink(b){
  const a=$('btn-pdf');
  if(!a) return;
  const url=b && b.pdfUrl;
  if(url && b && liveBook(b) && !isCutPdf(url)){
    a.href=url;
    a.hidden=false;
  } else {
    a.removeAttribute('href');
    a.hidden=true;
  }
}
function setListenTitle(b){
  const name=$('listen-name'), by=$('listen-by');
  if(name) name.textContent=b.title||'';
  if(by) by.textContent=b.subtitle ? ' \u2014 '+b.subtitle : '';
  setPdfLink(b);
  const root=$('reader');
  if(root){
    if(b && b.role==='screenplay') root.dataset.role='screenplay';
    else root.removeAttribute('data-role');
    if(b && b.series==='A Thin Veiled Night') root.dataset.series='tvn';
    else root.removeAttribute('data-series');
  }
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
    return '<p class="'+spClass('listen-p', p.kind)+'" data-pi="'+p.pi+'">'+inner+'</p>';
  }).join('');
  listen.lineTops=null;
  listen.lineTop=null;
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
  if(ch && w){
    const label=chapterTitle(w.chapterIndex);
    ch.textContent=label;
    ch.title=label;
  }
  const fill=$('listen-progress-fill');
  if(fill){
    const max=Math.max(listen.words.length-1, 1);
    const t=listen.words.length ? listen.index/max : 0;
    fill.style.width=(t*100)+'%';
  }
  const play=$('btn-play');
  if(play) play.disabled=!listen.words.length;
}
function prefersReducedMotion(){
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function applyTrackY(y){
  const track=$('listen-track');
  listen.y=y;
  if(!track) return;
  track.style.transition='none';
  track.style.transform='translateY('+(Math.round(y*100)/100)+'px)';
}
function activeListenWord(){
  const track=$('listen-track');
  if(!track) return null;
  return track.querySelector('.w.is-now') || track.querySelector('.w');
}
function measureLineTarget(){
  const track=$('listen-track'), vp=$('listen-viewport');
  const el=activeListenWord();
  if(!track || !vp || !el) return listen.y||0;
  const vpRect=vp.getBoundingClientRect();
  if(!vpRect.height) return listen.y||0;
  const elRect=el.getBoundingClientRect();
  const anchor=vpRect.top + vpRect.height*0.34;
  return (listen.y||0) + (anchor - elRect.top);
}
function stopGlide(){
  if(listen.raf){ cancelAnimationFrame(listen.raf); listen.raf=0; }
}
function glideFrame(now){
  if(!listen.playing){ listen.raf=0; return; }
  listen.raf=requestAnimationFrame(glideFrame);
  if(prefersReducedMotion()){
    applyTrackY(listen.targetY||0);
    return;
  }
  let dt=now-(listen.glideLast||now);
  listen.glideLast=now;
  if(!(dt>0)) return;
  if(dt>50) dt=50;
  const target=listen.targetY||0;
  const y=listen.y||0;
  const diff=target-y;
  if(Math.abs(diff)<0.2){
    if(Math.abs(diff)>0.01) applyTrackY(target);
    return;
  }
  const k=1-Math.exp(-dt/160);
  applyTrackY(y+diff*k);
}
function ensureGlide(){
  if(listen.raf || !listen.playing || prefersReducedMotion()) return;
  listen.glideLast=performance.now();
  listen.raf=requestAnimationFrame(glideFrame);
}
function refreshLineTops(){
  const track=$('listen-track');
  if(!track){ listen.lineTops=null; return; }
  const nodes=track.querySelectorAll('.w[data-i]');
  const tops=[];
  for(let i=0;i<nodes.length;i++) tops[Number(nodes[i].dataset.i)]=nodes[i].offsetTop;
  listen.lineTops=tops;
}
function placeListen(immediate){
  const el=activeListenWord();
  if(!el) return;
  if(immediate || !listen.lineTops) refreshLineTops();
  const idx=Number(el.dataset.i);
  const cached=listen.lineTops && listen.lineTops[idx];
  const top=cached==null ? el.offsetTop : cached;
  const changed=listen.lineTop==null || Math.abs(top-listen.lineTop)>=2;
  if(!immediate && !changed) return;
  listen.lineTop=top;
  const next=measureLineTarget();
  if(!isFinite(next)) return;
  listen.targetY=next;
  if(immediate || !listen.playing || prefersReducedMotion()){
    applyTrackY(next);
    return;
  }
  ensureGlide();
}
function riseListen(){
  if(prefersReducedMotion()) return;
  ensureGlide();
}
function wordMs(text){
  const speed=getTypePrefs().speed||1;
  const base=340 + Math.min(String(text||'').length, 14)*26;
  return Math.round(Math.min(860, Math.max(320, base)) / speed);
}
function wordElapsedFrac(){
  const dur=listen.wordDur||0;
  if(dur<=0) return 0;
  return Math.min(1, Math.max(0, (performance.now()-(listen.wordStart||0))/dur));
}
function scheduleListen(frac){
  clearTimeout(listen.timer);
  listen.timer=0;
  if(!listen.playing) return;
  if(document.hidden){ pauseListen(); return; }
  const w=listen.words[listen.index];
  if(!w){ finishListen(); return; }
  const dur=wordMs(w.text);
  const f=(typeof frac==='number' && isFinite(frac)) ? Math.min(1, Math.max(0, frac)) : 0;
  listen.wordDur=dur;
  listen.wordStart=performance.now()-f*dur;
  const remain=Math.max(0, Math.round(dur*(1-f)));
  listen.timer=setTimeout(()=>{
    listen.timer=0;
    if(!listen.playing) return;
    if(document.hidden){ pauseListen(); return; }
    if(listen.index>=listen.words.length-1){ finishListen(); return; }
    listen.index+=1;
    paintListen();
    placeListen(false);
    scheduleListen(0);
  }, remain);
}
function setPlayLabel(playing){
  const btn=$('btn-play');
  if(!btn) return;
  btn.setAttribute('aria-pressed', playing?'true':'false');
  btn.setAttribute('aria-label', playing?'Pause':'Play');
}
function setReadingFlag(on){
  const root=$('reader');
  if(root) root.classList.toggle('is-reading', !!on);
  ['btn-library','btn-pdf'].forEach(id=>{
    const el=$(id);
    if(!el) return;
    if(on) el.setAttribute('inert','');
    else el.removeAttribute('inert');
  });
  const title=document.querySelector('#reader .listen-title');
  if(title){
    if(on) title.setAttribute('inert','');
    else title.removeAttribute('inert');
  }
}
function stopAutoplay(){
  listen.playing=false;
  listen.drag=0;
  clearTimeout(listen.timer);
  listen.timer=0;
  stopProgressClock();
  stopGlide();
  setReadingFlag(false);
  setPlayLabel(false);
}
function wordNearestReadingLine(){
  const track=$('listen-track'), vp=$('listen-viewport');
  if(!track || !vp || !listen.words.length) return listen.index||0;
  const vpRect=vp.getBoundingClientRect();
  const line=vpRect.top + vpRect.height*0.34;
  const nodes=track.querySelectorAll('.w[data-i]');
  let best=listen.index||0, bestDist=Infinity;
  for(let i=0;i<nodes.length;i++){
    const r=nodes[i].getBoundingClientRect();
    const mid=(r.top+r.bottom)/2;
    const d=Math.abs(mid-line);
    if(d<bestDist){ bestDist=d; best=Number(nodes[i].dataset.i); }
  }
  return best;
}
function commitScrolledWord(){
  clearTimeout(listen.scrollCommit);
  listen.scrollCommit=0;
  if(readMode!=='autoplay' || !listen.userScrolled || !listen.words.length) return;
  listen.index=clampWord(wordNearestReadingLine());
  paintListen();
  listen.lineTop=null;
}
function queueScrolledWord(){
  clearTimeout(listen.scrollCommit);
  listen.scrollCommit=setTimeout(commitScrolledWord, 80);
}
function playListen(){
  if(readMode!=='autoplay' || !listen.words.length || document.hidden) return;
  clearTimeout(listen.scrollCommit);
  listen.scrollCommit=0;
  if(listen.finished){
    listen.finished=false;
    listen.index=0;
    listen.userScrolled=false;
    paintListen();
  } else if(listen.userScrolled){
    listen.index=clampWord(wordNearestReadingLine());
    listen.userScrolled=false;
    listen.lineTop=null;
    paintListen();
  }
  listen.playing=true;
  listen.drag=0;
  setReadingFlag(true);
  setPlayLabel(true);
  closeSheets();
  placeListen(true);
  riseListen();
  scheduleListen(0);
  startProgressClock();
}
function pauseListen(){
  stopAutoplay();
  saveListenProgress();
}
function finishListen(){
  listen.finished=true;
  stopAutoplay();
  saveListenProgress();
}
function seekListen(index){
  if(!listen.words.length) return;
  listen.finished=false;
  listen.index=Math.max(0, Math.min(listen.words.length-1, index|0));
  paintListen();
  const reading=$('reader') && $('reader').classList.contains('is-reading');
  listen.userScrolled=false;
  listen.lineTop=null;
  placeListen(!reading);
  if(listen.playing) scheduleListen(0);
  saveListenProgress();
}
function renderChapterSheet(){
  const sheet=$('chapter-sheet');
  const b=readerBook;
  if(!sheet || !b) return;
  const current=listen.words[listen.index];
  let html='';
  const set=companionsOf(b);
  if(companionRoles(b).length>=2){
    html+='<div class="comp-switch" role="group" aria-label="Companion">';
    set.forEach(item=>{
      const on=item.id===b.id;
      const label=ROLE_LABEL[item.role]||item.title;
      html+='<button type="button" data-companion="'+escapeHtml(item.id)+'"'+(on?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+escapeHtml(label)+'</button>';
    });
    html+='</div><div class="sheet-kicker">Chapters</div>';
  }
  chapterEntries(b).forEach(entry=>{
    const label=chapterTitle(entry.i);
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
  listen.finished=false;
  listen.index=idx;
  if(readMode==='autoplay') seekListen(idx);
  else if(readMode==='scroll'){
    paintListen();
    scrollToChapter(chapterIndex);
    saveListenProgress();
  } else {
    if(!pages.length) pages=paginate(readerBook);
    listen.index=idx;
    pageIndex=pageForWord(idx);
    renderPages({keepWord:true});
  }
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
  renderScroll();
  paintListen();
  if(readMode==='pages'){
    relayoutPages();
    return;
  }
  afterLayout(()=>{
    if(readerBook!==b) return;
    if(readMode==='scroll'){
      scrollToWord(listen.index);
      syncChapterButton();
    } else placeListen(true);
    saveListenProgress();
  });
}
function mountOpened(b, opts){
  if(!b || !liveBook(b) || isDeadTvnId(b.id)){ landOnTvnShelf(); return; }
  opts=opts||{};
  clearTimeout(listen.timer);
  listen.timer=0;
  stopGlide();
  stopProgressClock();
  clearTimeout(listen.scrollCommit);
  listen.scrollCommit=0;
  listen.playing=false;
  listen.finished=false;
  listen.userScrolled=false;
  listen.lineTop=null;
  listen.drag=0;
  listen.y=0;
  listen.targetY=0;
  pages=[];
  pageIndex=0;
  listen.pageFillQueued=false;
  readerBook=b;
  const built=buildListen(b);
  listen.words=built.words;
  listen.paras=built.paras;
  const prog=getProgress(b.id);
  let idx=0;
  if(prog && typeof prog.word==='number' && isFinite(prog.word)) idx=prog.word|0;
  listen.index=clampWord(idx);
  readMode=opts.mode || storedMode(prog);
  applyTypePrefs();
  setListenTitle(b);
  renderTrack();
  renderScroll();
  paintListen();
  setPlayLabel(false);
  updateModeChrome();
  const root=$('reader');
  setReadingFlag(false);
  root.classList.add('open');
  syncListenHeader();
  document.body.classList.add('reader-open');
  if(!opts.keepSheet) closeSheets();
  const go=()=>{
    if(readerBook!==b) return;
    syncListenHeader();
    if(readMode==='pages') relayoutPages();
    else if(readMode==='scroll'){
      scrollToWord(listen.index);
      syncChapterButton();
      saveListenProgress();
    } else placeListen(!listen.playing);
    if(opts.keepSheet){
      renderChapterSheet();
      const sheet=$('chapter-sheet');
      const cb=$('btn-chapter');
      if(sheet) sheet.classList.add('open');
      if(cb) cb.setAttribute('aria-expanded','true');
    }
  };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>afterLayout(go));
  else afterLayout(go);
}
function switchCompanion(id){
  const fb=storyFallbackFor(id);
  if(fb){
    if(readerBook && readerBook.id===fb.id){
      selected=fb.id;
      rememberBook(fb.id);
      if(location.hash !== '#/'+fb.id) history.replaceState({book:fb.id}, '', '#/'+fb.id);
      render();
      return;
    }
    switchCompanion(fb.id);
    return;
  }
  if(isDeadTvnId(id)){ landOnTvnShelf(); return; }
  const next=bookById(id);
  if(!next || !liveBook(next) || isSoon(next) || (readerBook && next.id===readerBook.id)) return;
  const mode=readMode;
  if(mode==='autoplay') stopAutoplay();
  else if(mode==='scroll') listen.index=wordFromScroll();
  else if(mode==='pages') listen.index=pageWord();
  saveListenProgress();
  selected=next.id;
  rememberBook(next.id);
  if(location.hash !== '#/'+next.id) history.replaceState({book:next.id}, '', '#/'+next.id);
  render();
  mountOpened(next, {mode:mode, keepSheet:true});
}
function openReader(b){
  if(isVeiled(b)){ landOnTvnShelf(); return; }
  if(!b || !liveBook(b) || isDeadTvnId(b.id)){ landOnTvnShelf(); return; }
  if(isSoon(b)){ showBook(b.id); return; }
  rememberBook(b.id);
  mountOpened(b);
}
function toggleSheet(id, btnId){
  const sheet=$(id), btn=$(btnId);
  if(!sheet) return;
  const willOpen=!sheet.classList.contains('open');
  closeSheets();
  if(willOpen){
    if(id==='chapter-sheet'){
      if(readMode==='scroll') listen.index=wordFromScroll();
      renderChapterSheet();
    }
    sheet.classList.add('open');
    if(btn) btn.setAttribute('aria-expanded','true');
    if(id==='edit-sheet') syncListenHeader();
  }
}
function clampTrackY(y){
  const track=$('listen-track'), vp=$('listen-viewport');
  if(!track || !vp) return y;
  const h=vp.clientHeight||0;
  const th=track.scrollHeight||track.offsetHeight||0;
  const max=h*0.34;
  const min=h*0.34 - Math.max(th, h);
  if(y>max) return max;
  if(y<min) return min;
  return y;
}
function armStageBlock(){
  listen.blockStageToggle=true;
  clearTimeout(listen.blockTimer);
}
function releaseStageBlock(){
  if(!listen.blockStageToggle) return;
  clearTimeout(listen.blockTimer);
  listen.blockTimer=setTimeout(()=>{ listen.blockStageToggle=false; }, 600);
}
function bindListenDrag(){
  const vp=$('listen-viewport');
  if(!vp || vp.dataset.bound) return;
  vp.dataset.bound='1';
  let gesture=null;
  const pointOf=e=>{
    if(e.touches && e.touches.length) return e.touches[0];
    if(e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
    return e;
  };
  const begin=(e, kind)=>{
    if(readMode!=='autoplay' || !$('reader') || !$('reader').classList.contains('open')) return;
    if(e.target && e.target.closest && e.target.closest('button, a, .listen-sheet')) return;
    if(gesture) return;
    const pt=pointOf(e);
    gesture={kind:kind, id:e.pointerId, x:pt.clientX, y:pt.clientY, origin:listen.y||0, moved:false};
    if(kind==='pointer'){ try{ vp.setPointerCapture(e.pointerId); }catch(err){} }
    if(listen.playing){
      pauseListen();
      armStageBlock();
    }
  };
  const move=e=>{
    if(!gesture) return;
    if(gesture.kind==='pointer' && e.pointerId!=null && e.pointerId!==gesture.id) return;
    const pt=pointOf(e);
    const dx=pt.clientX-gesture.x, dy=pt.clientY-gesture.y;
    if(!gesture.moved && Math.hypot(dx, dy)>=10){
      gesture.moved=true;
      listen.userScrolled=true;
      listen.lineTop=null;
      if(listen.playing) pauseListen();
      armStageBlock();
    }
    if(!gesture.moved) return;
    const y=clampTrackY(gesture.origin+dy);
    listen.targetY=y;
    applyTrackY(y);
    if(e.cancelable) e.preventDefault();
  };
  const end=e=>{
    if(!gesture) return;
    if(gesture.kind==='pointer' && e.pointerId!=null && e.pointerId!==gesture.id) return;
    const moved=gesture.moved;
    gesture=null;
    if(moved){
      listen.userScrolled=true;
      queueScrolledWord();
    }
    releaseStageBlock();
  };
  vp.addEventListener('pointerdown', e=>begin(e, 'pointer'));
  vp.addEventListener('pointermove', move);
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  vp.addEventListener('touchstart', e=>begin(e, 'touch'), {passive:true});
  vp.addEventListener('touchmove', move, {passive:false});
  vp.addEventListener('touchend', e=>{
    if((gesture || listen.blockStageToggle) && e.cancelable) e.preventDefault();
    end(e);
  }, {passive:false});
  vp.addEventListener('touchcancel', end);
  vp.addEventListener('wheel', e=>{
    if(readMode!=='autoplay' || !$('reader') || !$('reader').classList.contains('open')) return;
    if(e.cancelable) e.preventDefault();
    let dy=e.deltaY;
    if(e.deltaMode===1) dy*=16;
    else if(e.deltaMode===2) dy*=(vp.clientHeight||480);
    if(listen.playing){
      pauseListen();
      armStageBlock();
      releaseStageBlock();
    }
    listen.userScrolled=true;
    listen.lineTop=null;
    const y=clampTrackY((listen.y||0)-dy);
    listen.targetY=y;
    applyTrackY(y);
    queueScrolledWord();
  }, {passive:false});
}
function onReaderBackground(){
  if(listen.userScrolled) commitScrolledWord();
  if(readMode==='autoplay' && listen.playing) pauseListen();
  else if(readerBook) saveListenProgress();
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
if($('btn-search')) $('btn-search').onclick=()=>{
  const bar=$('search-bar');
  const opening=!bar || bar.hasAttribute('hidden');
  if(opening){
    if(bar) bar.removeAttribute('hidden');
    $('btn-search').setAttribute('aria-pressed','true');
    $('btn-search').setAttribute('aria-expanded','true');
    const input=$('shelf-search');
    if(input) input.focus();
  } else {
    shelfQuery='';
    const input=$('shelf-search');
    if(input) input.value='';
    if(bar) bar.setAttribute('hidden','');
    $('btn-search').setAttribute('aria-pressed','false');
    $('btn-search').setAttribute('aria-expanded','false');
    renderShelf();
  }
};
if($('shelf-search')) $('shelf-search').addEventListener('input', ()=>{
  shelfQuery=$('shelf-search').value || '';
  renderShelf();
});
if($('view-seg')) $('view-seg').addEventListener('click', e=>{
  const btn=e.target.closest('button[data-view]');
  if(!btn) return;
  setLibraryView(btn.dataset.view);
});
if($('btn-home')) $('btn-home').onclick=()=>closeBook();
if($('btn-play')) $('btn-play').onclick=()=>{ if(listen.playing) pauseListen(); else playListen(); };
if($('btn-speed')) $('btn-speed').onclick=()=>{
  const steps=SPEED_STEPS;
  const cur=getTypePrefs().speed;
  let i=steps.indexOf(cur);
  if(i<0) i=steps.indexOf(1.25);
  setSpeed(steps[(i+1)%steps.length]);
};
document.querySelectorAll('.mode-seg [data-mode]').forEach(btn=>{
  btn.onclick=()=>setReadMode(btn.dataset.mode);
});
if($('edge-left')) $('edge-left').onclick=()=>{ closeSheets(); turnPage(-1); };
if($('edge-right')) $('edge-right').onclick=()=>{ closeSheets(); turnPage(1); };
if($('scroll-view')) $('scroll-view').addEventListener('scroll', ()=>{
  if(!readerBook || readMode!=='scroll') return;
  listen.index=wordFromScroll();
  syncChapterButton();
  saveListenProgress();
});
if($('btn-edit')) $('btn-edit').onclick=()=>toggleSheet('edit-sheet','btn-edit');
if($('btn-chapter')) $('btn-chapter').onclick=()=>toggleSheet('chapter-sheet','btn-chapter');
if($('edit-sheet')) $('edit-sheet').addEventListener('click', e=>{
  const btn=e.target.closest('button'); if(!btn) return;
  e.stopPropagation();
  if(btn.dataset.size) saveTypePrefs({size:btn.dataset.size});
  else if(btn.dataset.speed) setSpeed(Number(btn.dataset.speed));
});
if($('chapter-sheet')) $('chapter-sheet').addEventListener('click', e=>{
  const btn=e.target.closest('button'); if(!btn) return;
  e.stopPropagation();
  if(btn.dataset.companion){
    switchCompanion(btn.dataset.companion);
    return;
  }
  if(btn.dataset.ch!=null && btn.dataset.ch!==''){
    jumpChapter(Number(btn.dataset.ch));
    closeSheets();
  } else if(btn.dataset.unlock && readerBook){
    const keep=listen.words[listen.index]?listen.words[listen.index].chapterIndex:0;
    unlockBook(readerBook.id, btn.dataset.unlock);
    reloadListen(keep);
    closeSheets();
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
  if(e.target.closest && e.target.closest('#btn-edit, #btn-speed, #btn-chapter, #btn-play, #btn-library, #btn-pdf, .listen-sheet, #listen-progress, .mode-seg, .reader-edge')) return;
  if(sheetsOpen()){ closeSheets(); return; }
  if(readMode==='autoplay' && e.target.closest && e.target.closest('.listen-stage')){
    if(listen.blockStageToggle){ listen.blockStageToggle=false; return; }
    if(listen.playing) pauseListen(); else playListen();
  }
});
window.addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  if($('reader') && $('reader').classList.contains('open')) return;
  const bar=$('search-bar');
  if(!bar || bar.hasAttribute('hidden')) return;
  shelfQuery='';
  const input=$('shelf-search');
  if(input) input.value='';
  bar.setAttribute('hidden','');
  const btn=$('btn-search');
  if(btn){ btn.setAttribute('aria-pressed','false'); btn.setAttribute('aria-expanded','false'); }
  renderShelf();
});
window.addEventListener('keydown', e=>{
  if(!$('reader') || !$('reader').classList.contains('open')) return;
  const t=e.target;
  if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
  if(e.key==='Escape'){
    if(sheetsOpen()){ closeSheets(); return; }
    closeReader();
    return;
  }
  if(sheetsOpen()) return;
  const space=e.key===' ' || e.code==='Space';
  if(readMode==='autoplay' && space){
    if(t && t.closest && t.closest('button')) return;
    e.preventDefault();
    if(listen.playing) pauseListen(); else playListen();
    return;
  }
  if(readMode!=='pages') return;
  if(e.key==='ArrowRight' || e.key==='PageDown' || space){
    if(space && t && t.closest && t.closest('button')) return;
    e.preventDefault();
    turnPage(1);
  } else if(e.key==='ArrowLeft' || e.key==='PageUp'){
    e.preventDefault();
    turnPage(-1);
  }
});
let resizeTimer=0;
function scheduleReaderLayout(){
  if(!readerBook || !$('reader') || !$('reader').classList.contains('open')) return;
  syncListenHeader();
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    resizeTimer=0;
    if(!readerBook || !$('reader') || !$('reader').classList.contains('open')) return;
    if(readMode==='autoplay') placeListen(true);
    else if(readMode==='pages') relayoutPages();
  }, 80);
}
window.addEventListener('resize', scheduleReaderLayout);
window.addEventListener('orientationchange', scheduleReaderLayout);
if(window.visualViewport) window.visualViewport.addEventListener('resize', scheduleReaderLayout);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='hidden') onReaderBackground();
});
window.addEventListener('pagehide', onReaderBackground);
window.addEventListener('popstate', ()=>{
  const id=(location.hash||'').replace(/^#\//,'');
  if(openFallbackStory(id)) return;
  if(isDeadTvnId(id)) landOnTvnShelf();
  else if(id && liveBook(bookById(id))) showBook(id, false);
  else closeBook();
});
bindListenDrag();
mountListenMark();
applyTypePrefs();
applyLibraryViewClass(getLibraryView());
bootLibrary();
