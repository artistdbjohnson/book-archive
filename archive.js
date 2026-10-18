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
      {label:"Chapter One", text:"Chapter One\n\nThe sample vial was already cold in Sera Holt's hand before she even looked at the stream. It had ridden in the shade of her kit the whole way down from the Bothy, two hundred steps of black stone, and when she lifted it out into the morning air the glass fogged up white right away.\n\nShe was a water runner. Every morning she walked down to the stream, filled five small glass vials at five marked spots, and hauled them back up the bank so the crew could tell if the water had changed overnight. Simple idea, really, but out here somebody had to walk the route by hand. There were about forty of them on the first survey, sent down to check this world on foot before anybody tried to build a town on it, and every single one of them had been born on the Ark. That was the slow ship that had carried their families across the dark for longer than anybody's grandparents could remember. None of them had ever seen Earth. They only knew it from the old stories, and they named everything down here out of those stories, because that was pretty much all they had to go on.\n\nThe stream was the prettiest thing anybody had found since landing, and people said so a bit too fast, the way somebody calls a strange dog friendly before the dog has made up its mind about them. It ran clear over the black stone, and in the slow places it glowed. The water had a green to it that was bright enough to read by, like a sign over a door at night, wet and a little too sure of itself. Nobody knew yet what the green actually was. It lived in the current in specks too small to see one at a time, and it gathered thickest wherever the water slowed down. Tiny blue flies sat on top of the pools like chips of glass, and when her shadow crossed them they lifted all at once and dropped right back onto the exact same spots.\n\nShe stood out on the gravel bar in her withy.\n\nA withy was a powered walking frame that a runner backed into before heading down the trail. It had a gray spine and a hip ring, with thin struts running down the outside of each leg to a cup under the heel, and two light braces along the forearms. Soft woven bands ran under the metal struts and pulled snug against the body to take the load, kind of like the cords at the back of a knee. It kept her upright in fast water and carried whatever gear she was hauling, and it covered nothing at all. Her face was bare, and her belly, and her back right between the struts. What the frame gave a runner was a fighting chance to get up the hill, and that was all it ever promised.\n\nThe rest of that fighting chance rode on her right forearm brace, where the maker had seated a cuff of brushed gray metal no thicker than a drinking cup. It held ten darts, eight tranqs and two killing darts, ready to fire off her wrist. She had never fired it at anything except a practice post back up at camp. She had never told anybody that either, though she figured most of the crew was in the same boat.\n\nUp the bank behind her, the Bothy sat on its shelf of stone. It was long and low and pale gray without a single seam anybody could find, and from down on the bar it looked like a smooth river boulder the size of a barn. They had named it after the rough stone huts in the old stories, the ones left unlocked up on bare hills for travelers caught out in bad weather. The Heron, which was their big cargo lifter drone, had set the building down four mornings ago, and by breakfast it already looked like it had grown out of the rock. Its one long window, the Squint, looked dark as wet slate from the outside and clear from the inside, and the green glow of the stream lay across the glass like a stain.\n\nShe couldn't see Shep from down on the bar, because he was stationed up outside the Bothy on watch, and she could hear him plain enough.\n\nHe was a fifth-series guard unit, and he hummed one low note whenever he was around people, about the pitch of a big cat purring, so nobody on the crew ever had to wonder where he was standing. That rule came straight from the ship, older than the landing. Up in the fern crowns above the bank, three or four tinkers were humming the note back to him. They were little rust-colored birds, named for the pot menders in the old stories who walked the country roads tapping on kettles. They had Shep's note a hair off, and they never got it right, and they never quit trying. Honestly, it made the morning feel a bit less lonely.\n\nThe work clock on her wrist was already eating into the cool part of the day, and the survey crew had learned what that meant the hard way. By midday the black stone threw the sun back up in a hot shimmer, and when the heat came on, the big animals came down to the water to drink. Every runner on the roster knew it, and the ones who had seen those things up close more than once would change the subject whenever somebody brought it up at supper.\n\nShe thumbed the release on her hip ring.\n\nThe woven bands let go from the top down, a slow loosening she could feel from her ribs all the way to her ankles, and she stepped forward out of the heel cups into the shallows. The frame stayed standing behind her on the gravel bar, empty, holding her shape.\n\nThat was the one rule everybody on the water route hated. Nobody took a sample in a withy. Even idling, the frame put a fine trembling into the stones and the stream that a person couldn't feel, and the green specks in the water felt it right away and scattered. If a runner dipped a glass while wearing the rig, the vial came up completely clear, with none of the green in it, and lied to the crew about what was in the water. And the frame couldn't kneel down low, or reach under a hollowed-out bank, or hold a small glass tube steady the way bare fingers could. So every runner stepped out of the frame for every single draw. Five times a morning Sera stood out in the cold water with nothing on her but her clothes and her kit bag, while the machine that could have carried her stood a few steps back on the dry stones with its arms open.\n\nThe cold came through her boots right away and then soaked through her socks, and once it was deep in her ankles she quit thinking about it. The current made a small talking noise in the channel between the banks. And standing there in the run, she caught herself breathing through her mouth so she wouldn't make any noise over the water.\n\nShe waded out to where the current slowed against the bar and dropped to her knees. The cold water took both knees right away. It was colder than any stream had a right to be with the sun already warm on her neck, and it gave off a faint sweet smell that sat in the back of her throat like mown grass left too long in a sack.\n\nShe rinsed the mouth of the first tube, filled it to the line scratched into the glass, and twisted the cap down snug. The green came right in with the water. Inside the vial it looked like a scatter of sparks that swam a bit when she tipped the glass and then hung there. She marked the spot with her stone stub, scratching a fine white line straight into the glass where water couldn't wash it off, and tucked the vial into the first slot of her kit, where the soft bed closed around it like a hand.\n\nThe second draw came from under the near bank, where dark silt built a soft ledge. That one filled clean, without a grain of sand. She marked the glass, bedded it, and pressed the kit lid down until it clicked under her thumb.\n\nUp in the ferns above the bank, a heavy body shifted its weight and froze.\n\nSera kept her chin down and didn't turn her head. She had learned that from Rook Daley, the oldest runner on the roster, who always told new people that the dumbest thing a person could do out here was look at a noise, because the noise would know it had been heard. Rook said plenty of things. He had also claimed the tree ferns grew thirty feet tall because the air was rich, and then he had stood under one for a full minute with his mouth hanging open like a kid at a fair. She pictured Rook's open mouth and kept her eyes fixed on the stream.\n\nThe fresh print she had stepped over on the way in was still sitting at the edge of the bar, three long toes pressed deep in the mud, each one the length of her forearm. The bottom of the track looked dark and slick, with water still seeping in, which meant something had laid it down this morning after the dew. She looked at it long enough to know that for sure, and then she put her eyes back on her hands.\n\nShe drew the third vial from a slack eddy where the current braided around a drowned root. It showed the same green in the same clear water. When she held the tube up to the sun to check the fill mark, the flecks flared brighter for a second, nearly white at the center, before dimming back down.\n\nThe fourth draw came out of the deeper run past the bar. The current tried to twist the glass out of her grip, so she braced her wrist against her other palm, filled it, and capped it. A dragonfly the length of her hand hovered over the water on wings the color of oil on a puddle, and then it darted off, and she realized the birds were gone too.\n\nShe couldn't have said when they stopped. A person notices the woods going silent the way they notice a wall clock has quit ticking, a bit after it happens. All morning there had been a bird she didn't have a name for yet, calling from the brush like somebody tapping a spoon on a pot. Now there was only the stream, her own breath, and the flies on the pools.\n\nRight on top of that, up on the shelf, Shep's hum stopped.\n\nIt quit clean in the middle of the note, and the valley felt twice as wide without it. Up in the fern crowns the tinkers kept copying his note for a few breaths on their own, singing an all-clear because they didn't know any better. Then the tinkers quit too.\n\nWhenever Shep stopped humming, he had his ears turned on something big, and every runner in camp had learned that in their first week.\n\nSera stayed on her knees in the water.\n\nThe camp joke was that people learned the rules out here by watching somebody else break one, and nobody ever laughed at it. The rule for this was plain enough. When the birds stop, a runner finishes what is in her hands and walks out. She doesn't bolt, because running is loud, sloshes the tubes, and tells every predator watching that she is prey. Finish the job, and walk out steady.\n\nPlus, she only had one pocket left, a dark hollow under hanging fern where the green sat thicker than anywhere else on the bar, thick enough to look like wet paint. It was nine paces from her frame. She counted them going out, leaving the withy standing behind her on the stones with its bands hanging loose and its arms open and the tranqs in its cuff, seven paces, eight, nine, until the fern fronds closed over her head and hid the frame from sight.\n\nShe dropped to her knees, let the cold take her legs a second time, and held the last vial under while it filled.\n\nUp on the bank, the heavy body shifted in the brush again, closer in now. She heard the thick stems bend and give way, a slow push, the sound of a big animal putting its weight down with care because it had all the time in the world.\n\nShe twisted the cap onto the fifth vial. Her hands stayed rock steady, and she was pretty proud of that later on when she told it. She scratched the mark in short strokes, bedded the tube in the kit, and ran her thumb across all five tops to count them by feel. Every one was there. She snapped the lid shut.\n\nThen she ducked out from under the fern and walked the nine paces back to her rig, keeping an even pace, holding the kit flat against her belly with her back turned to the brush the whole way.\n\nAt the bar, she spun around and slid her heels into the cups.\n\nLocking in took four breaths, and nothing could hurry the motor along. On the first breath the hip ring latched with one soft click that carried across the water louder than anything she had done all morning. Across the second and third breaths the woven bands pulled snug from her ankles up, a running ripple climbing her calves, her knees, and her thighs, while up in the ferns nothing moved a muscle, which was a lot worse than hearing it walk. On the fourth breath the arm braces folded shut, cool along her sleeves, seating the cuff on her right wrist with its weight of darts, and the frame took her load.\n\n\"There,\" she whispered, the way every runner said it.\n\nThen she climbed the bank at a steady walk, two hundred steps up the black stone toward the dark glass of the Squint, and she didn't look back once, and the stems behind her didn't move again until she was at the door.\n\n* * *\n\nNobody wore a withy indoors. Each runner backed their rig into the rack on the wall beside the door and stepped out, leaving it outside so the sun cleaned it while they worked indoors. Of course, that meant three more breaths standing bare on the stone shelf with the ferns at her back while the bands let go, every single time she came home. She stood through the count and stepped out, and her frame stayed hanging on the wall in a row of three empty ones, like work coats on hooks.\n\nShep sat crouched right beside the door on the bare stone of the shelf, where he stayed on watch day and night. He stood ten feet tall when he unfolded all the way up, though crouched down he was seven, a wide gray block of brushed metal laid in flat panels, with a dark stripe down his middle and two more blocks hung at his sides like a man with his hands in his coat pockets. His name ran down the dark middle in plain pale letters, SHEP, and underneath it a few amber marks nobody could read sat dark. His two small camera eyes were turned toward the ferns, and he wasn't humming.\n\nThere had only ever been four units like him, built in the Hayward shop on the Ark's machine deck, and the Ark wasn't building new ones. He had never once been inside the Bothy. He could have squeezed through the door crouched, just about, except the whole point of him was to stay outside on the step as the first thing anything coming up the shelf had to get past.\n\nThe door slid down into the sill when she laid her palm flat on it. Behind it sat the Porch, a scrub room the size of a closet with a second door on the far side, and the outer panel rose shut behind her without a sound. Every runner stood in the Porch for ninety breaths while the vents pulled the sweet smell off their clothes. The green water left that mown-grass sweetness on the skin, and things out here followed it. Sometimes it was whatever lived in the ferns. Other times it was the ferns themselves, turning their fronds toward a person as slowly as a sunflower tracks the sun, and nobody could say why. Fenn made the whole crew count, because the one time a runner had skipped it, the ferns around the shelf had bent in toward the Bothy's walls for two straight nights, and something heavy had walked the stone outside in the dark, tasting the air at the door.\n\nSera stood in the narrow Porch and counted with the kit held flat in both hands. At forty she heard the ferns outside brush the stone. At sixty she heard them stop. At ninety the inner panel dropped into the floor and she stepped into the cool room.\n\nInside, the light lived right in the walls. The crew called it rushlight, after the rush candles in the old farm kitchens from the stories, and it came up warm gold wherever hands were working and stayed dim everywhere else. The glow followed her along the stone bench as she walked over.\n\nLooking through the dark glass of the Squint, she could see the back of Shep's flat metal head and one shoulder, crouched right outside the window, facing the ferns.\n\nJoss Amari stood at the bench with the morning slate in his hand, a thin pale leaf that took a bare fingertip for a pen. He was a big, gentle-voiced man who had worked as an infirmary orderly on the Ark, and he still folded cloths into neat squares whenever he was worried. Right now he was working on a rinse rag.\n\n\"You were down there a good bit,\" he said.\n\n\"All the birds quit on me.\"\n\nHis hands paused. \"Quit how?\"\n\n\"Every one of them stopped, and something big was pushing through the ferns above the bar.\"\n\n\"Did you get a look?\"\n\n\"No way. I kept my eyes down.\"\n\nOut beyond the Squint, the amber marks under Shep's name warmed back up like low coals. His head swung around until his camera eyes found her through the glass, and his low hum started up again, vibrating through the wall.\n\n\"It walked back up the bank,\" Shep said through the grille over the bench that carried his voice in from outside. He had a warm, easy voice, the calm voice anybody would want reading to them when they were laid up sick. \"Nothing's on the shelf.\" His eyes held on her through the pane for a second. \"You didn't look. Good. Looking is my job, and I'm built a lot better for it.\"\n\n\"Got all five?\" Joss asked.\n\n\"Every one.\" She glanced past him toward the four box bunks set into the wall. Three doors stood folded back. \"Where did Ade get to?\"\n\n\"He started down for depot an hour after you.\" Depot was the main camp, a mile down through the ferns, where the first lander had come down and where Fenn ran the survey. \"He was going to clip cycad leaves at the bend on his way in. He asked Fenn if Shep could walk with him, and she told him Shep stays with the Bothy.\"\n\n\"So he walked down alone.\"\n\n\"Double knotted, he told me. Told me twice before he stepped out.\" Joss shook his head. \"He'll call on the bead when he hits camp. He always calls.\"\n\nThe water gauge was a square of dark glass set flush into the bench, with a pad beside it the size of a thumbprint. It showed a plain number or a zero, simple on purpose, so a runner could read it at a glance even with mud or blood on her hands.\n\nSera set the first tube in the cradle and pressed the pad with the soft gray cap on her left knuckle, the one that read her pulse at the same time.\n\nThe first count came up zero, and Joss logged it. Vial two read zero, and three did the same, and he wrote each one down in his neat hand.\n\nShe set the fourth in the cradle and pressed. The window stayed flat, ticked up once, and dropped right back. Joss logged the tick and the drop.\n\nThe fifth held the thick green water from under the fern. She set it in the cradle and laid her knuckle on the pad.\n\nRight away, the number climbed.\n\nIt rose the way a tide comes in, slow enough to watch, steady enough that nobody could doubt it would keep rising. It went straight past the morning mark. Then it went past the line on the card where a runner was supposed to stop and call somebody, and it sat there.\n\nSera lifted her knuckle. The high number stayed up for three breaths, dropped one tick, and held.\n\n\"Again,\" Joss said, barely above a whisper.\n\nShe pressed again. The count climbed to the exact same mark and held.\n\nAnd right there in the cradle, the green in the vial got brighter.\n\nShe nearly missed it because she was watching the number window. Joss made a small sound in his throat, and when she looked over, the flecks in vial five had lit up from the inside, a sharp green with white centers, the exact way they had shone for a second in the sun down at the bar. Worse than that, they were swimming on their own, all of them drifting through the water toward the side of the glass where her knuckle rested on the pad.\n\nShe pulled her hand back.\n\nInside the glass, the flecks hung where they were. Then, over a slow count of ten, they drifted back out to the middle of the tube and dimmed down.\n\nNeither of them said a word. Joss picked up the rinse rag and laid it back down without folding it.\n\n\"Pass it out here,\" Shep said through the grille, \"before one of you starts naming it.\"\n\nBeside the bench sat the pass, a double-doored transfer box in the wall no bigger than a bread loaf, so the outside air never came straight into the room. Sera stood vial five inside and shut her door. Through the Squint she watched a panel slide back on one of Shep's side blocks, and a metal hand reached out on a jointed stalk, four fine fingers opening the outer door and lifting the vial by its cap. The little green port beside his chest stripe opened and closed on the glass, and the amber marks moved slowly, trading places like coals, while he tasted the water.\n\n\"One through four are plain water,\" Shep said. \"Same mineral count as yesterday. Hard enough to scale a kettle.\" His amber marks kept moving. \"Five has got more of the green in it than the other four combined, and twice what that spot showed yesterday. Plus, it's made of the same plain stuff you are, a bit of salt, a bit of iron, a bit of sugar. It swam a thumb's width toward your hand in ten breaths and drifted back in ten when you let go.\" The marks held steady. \"I can tell you what it is and how far it moved. I can't tell you why, and I'd look sideways at anybody who claimed they could.\"\n\nThe wall card said that whenever the number jumped on a runner's skin, she checked her own pulse right away. Sera pressed the gray cap to the base of her left thumb. Her heart was running fast, faster than the climb from the stream accounted for. The skin there felt warm too, warmer than the rest of her hand, and when she rubbed her thumb against her finger it prickled a bit, like a foot waking up after it goes to sleep.\n\n\"Sera,\" Joss said.\n\n\"Yeah, I saw it.\"\n\n\"They swam right toward your hand.\"\n\n\"I was looking right at it, Joss.\"\n\nHe slid the slate across the stone. His hands weren't folding the rag now. \"What do I write?\"\n\n\"Write what it did, and leave the rest alone.\"\n\n\"Nothing else?\"\n\n\"Not a word. The second we write a guess, somebody up the ridge reads it as a fact.\"\n\n\"Then what do we call it?\"\n\nThe runners had a camp name for the glow already, two words people tossed around the mess tent whenever somebody brought back a bright tube. She pulled the slate over and wrote with her fingertip the mark the survey used for a green nobody had sorted yet, and under it, those two words: Ark algae.\n\n\"Done,\" she said.\n\nThe bead at her collar clicked, the tiny radio every runner wore. Fenn's voice came through thin in her ear, with the morning's worry packed down tight in it.\n\n\"Holt. What did the water do?\"\n\nSera kept her eyes on Shep's amber marks outside. \"The fifth draw is thick with the green. The number climbs when I touch the pad, and my pulse runs high with it. Shep tested it outside and got the same.\"\n\n\"The ridge is going to ask me what it means. I can't just send them a number.\" The ridge was the upper camp above depot where the lander came and went from the Ark, and whatever Fenn told the ridge went straight to the ship.\n\n\"It reads on the gauge,\" Sera said. \"That's what I'm putting on the slate.\" She meant the number moved, and she wasn't signing her name to a guess on the permanent log.\n\nThe bead hissed for a breath.\n\n\"Is Brandt up there with you?\" Fenn asked.\n\nJoss's head snapped up.\n\n\"He headed down your way an hour after I went to the stream,\" Sera said. \"He hasn't walked in?\"\n\n\"Not a sign of him.\" Another hiss, longer this time. \"Seal the case and walk it down here. Bring Shep with you, and stay right at his hip the whole way. The east watch spotted something moving in the brush, and I want you off that trail before the heat hits.\"\n\nOutside, the green port opened on Shep's chest, and the metal hand set vial five back in the pass and folded away under its panel, the green light winking out last. Sera opened her door and lifted the vial out by the cap.\n\nJoss had already pulled the transport case down from the rack, a stout gray box with five foam beds inside. Sera set vial five in the center bed and packed the other four around it, taking care not to touch five's glass any longer than she had to. Even so, when she set it down the bright flecks rose a bit toward her fingers, then sank back once she pulled her hand clear.\n\nJoss watched that happen and kept his mouth shut.\n\nSera laid the slate inside the lid, closed the box, and pressed her bare palm flat along the seam. Under her hand the seam knit shut like wet linen drawing tight, and when she lifted her palm a thin line of light ran the length of it and stayed lit. Only her hand or Fenn's could open the lock now.\n\n\"Everything inside?\" Joss asked.\n\n\"All five, and the middle one is trouble for sure. The case is shut.\"\n\n\"Let me walk down with you.\"\n\n\"Somebody needs to mind the Bothy.\"\n\n\"Shep is the one who minds the Bothy.\"\n\n\"Not this morning.\" She picked up the sealed box. \"Joss. Stay inside with the Bothy.\"\n\nHe looked at her hard enough that she nearly gave in, and then he picked up the rinse rag and went back to folding it into a square.\n\n* * *\n\nOutside, the late-morning glare hit her like a slap. She took four breaths backing into the withy on the wall rack, her heels in the cups, the click, the ripple of the bands climbing her legs. Right beside the door Shep unfolded himself up off the stone, all ten feet of him, humming his note again. \"There,\" she said. She clipped the case to her hip ring, where a stumble couldn't knock it loose, and they started down off the shelf together.\n\nThe path to depot ran open through tall ferns and black stone for most of a mile. Early on it was an easy walk. In the midday heat it turned into a long baking tunnel with no roof.\n\nShep walked at her right hand, close enough to touch, swinging his side blocks down ahead of him and leaning on them like fists, then bringing his legs through behind, four steady beats she could feel right in the stone, over and over. A guard unit never ran its battery down on a walk. He had been walking beside somebody every single day since landing, and he would still be walking beside their grandkids. As they went, he hummed the old nursery song from the ship, the one every crew kid on the Ark had heard on the ring deck, and near the end of the second line he went flat in the exact same spot every time, because the old machinist who had taught it to him had sung it flat there and Shep had kept the mistake on purpose.\n\n\"Hum something else, man,\" she told him.\n\n\"No way. You like this one.\"\n\n\"I never said that.\"\n\n\"Your pulse says it. Your heart is a terrible liar.\"\n\nThree smooth gray stones rode in shallow cups along the top of his shoulder blocks, the size of walnuts and smooth as river pebbles. A quarter mile down the trail, one popped out of its cup, dropped a hand's width, and glided up over the ferns without a sound. A second one lifted right behind it.\n\n\"My wrens,\" Shep said, catching her watching them go. \"Two of my three. They spot warm bodies moving in the brush. I'll tell you what they find.\"\n\nIn the old stories, the wren was the smallest bird in the woods and the king of them all, because it hid on the eagle's back and flew the last bit higher on its own. Sera watched the two pale specks vanish over the fronds, one angling toward the stream and one scouting ahead down the path, while the tinkers in the crowns chased after them in a noisy little cloud.\n\n\"They do that every trip,\" Shep said dryly. \"Honestly, it's the hardest part of the job.\"\n\nWatching the tinkers, Sera thought of the darts in her cuff. Back at the camp fire, Rook Daley told the story of the tranqs the exact same way every time. The second week after landing, a tinker flew into the lander's window and broke its neck, and the ship's mind asked for the body, the way it asked for everything. Deep in that little bird's nerves it found millions of tiny doors that open to let salt water through and calm a nerve down. People have them too, and every sleeping medicine anybody ever brewed worked by leaning on those doors. Except the tinker's gates had a keyhole none of the ship's books had ever shown, one particular shape on the outside of the door. After that, the crew brought in a fish, a burrowing bug, and a striped hunter from the river crossing, and every one of them carried that exact same keyhole, down to the last turn. Creatures that had branched off longer ago than there had been mountains on this world had never let that shape wear down. The camp techs and the ship's mind built a key to fit it, and that was the tranq. It propped the doors open, shutting the nerves down so the animal went down breathing slow with its heart still going. It worked on nearly everything here. Rook always paused there to let the fire pop, and then said the part nobody liked. Back on the Ark, he said, if a person found the same mark stamped into every bowl in a house, they knew one pair of hands had turned them all on a single wheel. Nobody ever asked him who he figured had sat at the wheel, and he never offered. The big predators had learned to keep their skin covered, growing heavy plates that bounced a dart the way a stone wall turns a pebble. Plates have to hinge where a body bends, though, so every big animal had somewhere soft and thin where the blood ran close: the crease behind the jaw, the hollow under a foreleg, the wet corner of an eye. \"Either you find the soft place,\" Rook always finished, \"or you don't walk home, and somebody else sits here telling this story about you.\"\n\nRight then, her withy whined.\n\nUp at the Bothy she had never noticed it. Out here, with the birds gone scarce, she heard it plain as day, a high singing coming out of the leg struts every time the motor stepped for her, loud enough to carry halfway to the water.\n\nEvery big hunter out here tracked by ear. The whole crew knew that.\n\nWhere the trail dipped through a low stone notch, she stopped, reached behind her back for the switch on the spine, and clicked the drive off.\n\nThe withy went dead on her back. It stayed strapped to her body and quit helping, turning into thirty pounds of struts hanging on her hips and shoulders, while the case on the hip ring dragged at her the way it would have with no rig on at all. Plus, if it swung, it clacked. She unclipped the box and hugged it against her ribs in both arms so it wouldn't swing. The weight found the worn spot on her shoulder right away, digging into the same bone her strap found every morning.\n\n\"Smart move,\" Shep said, low. \"Heavy way to walk, though.\"\n\n\"I know it's heavy.\"\n\nWith the motor off she could smell her own rig, sour and stale. Wound around the left strut was a band of gray waxed cord the crew called the Rue, after the bitter herb people in the old stories hung over their doors to keep off sickness and pests. Boiled down from the fat of animals the crew had already had to kill, it smelled like meat a week dead. Rook said every animal on this world died smelling the same, and the living ones stepped wide around it. He had once seen tracks in the dew bend in a ring around a dead hunter out on the flat, where something big had walked wide in the dark rather than touch the body. Usually things out here gave the Rue that same room. The animals drawn in by the sweet smell from the stream didn't care about the Rue at all. They walked straight through it to get to the sweet.\n\nFern fronds the size of barn doors brushed her calves, leaving wet streaks that dried in the heat before the next bend. The box dragged at her arms on each rise. The frame strap bit into her shoulder until the skin went hot and then numb, promising a worse ache tonight.\n\nIn the bottom of the notch, the track crossed the trail again. It was the same three-toed print, fresher than the one at the bar, with water still pooling in the mud and a thick fern stalk bent flat across it, green sap still beading at the break.\n\n\"Laid down right ahead of us,\" Shep said, dropping the song back to the plain hum.\n\nSera stepped over the print.\n\n\"My wren by the stream sees something,\" Shep told her. \"Big. Warm. Walking slow toward the water.\" He paused a second. \"It's dropping down under the ferns for a look.\"\n\n\"Call it back.\"\n\n\"Too late, it's already in. I built them braver than I meant to.\"\n\nThey walked on, and she counted her paces. At forty Shep stopped humming for one breath and started up again.\n\n\"What happened?\"\n\n\"The wren quit,\" he said. \"The last thing it showed me was a bright stripe of green moving in the shade, and then nothing.\" The amber marks under his name had gone low and dark. \"It's lying in there somewhere, and it isn't flying back.\"\n\nThat left two wrens, one scouting ahead over the path and one in his shoulder cup.\n\nTwenty paces farther on, she smelled it.\n\nIt was sweet first, that mown-grass sweetness from the stream, only thicker, layered over a second smell she remembered from the meat deck on the Ark when she was a girl, warm and coppery and close. It coated the back of her throat on the first breath.\n\nShe planted her feet.\n\nAhead of them the trail bent left around a stand of cycads, the squat old trees that grew along the stream, fat trunks scaled like pinecones under stiff fronds in a blue so deep it looked nearly purple. Under those crowns the light sat green and dim. The smell was coming out of that shade, and so were the flies, a low thick buzz under Shep's hum, the sound of a lot of flies gathered in one spot doing one job.\n\n\"I can't see well in that shade,\" Shep said, his voice low. \"Everything under those leaves sits at the same warmth, so the wren is no good to me in there either.\" He called the last wren down from the glare, and the gray pebble dropped in and clicked into his shoulder socket. \"My ears work better than my eyes in the brush anyway. I'm listening.\"\n\n\"Can we walk wide around the trees?\"\n\n\"Off the trail is where the tracks go.\"\n\nThe rule said to finish what was in her hands and walk out. The water case was in her hands, and depot sat past the cycads.\n\nSera walked into the green shade.\n\nThe first thing she spotted was Ade's withy.\n\nIt stood upright in the middle of the trail, balanced in its heel cups with its bands hanging slack and its arm braces wide open. There wasn't a scratch or a smear on the gray metal. The flat cargo rack on its back, built for a flora box to slide into like a drawer, stood open and empty. It looked like a man had stepped out to stretch his legs and would be back in a minute. Down on the hip ring, the tiny green ready light was still lit, waiting for him all morning.\n\nThree steps away lay his flora box, tipped on its side in the dirt, its seam still glowing faint where his palm had sealed it. Beside it lay a neat bundle of blue cycad leaves tied up with plant cord. Ade had stepped out of his rig to clip his leaves, the exact way every runner had to, and he had tied the bundle, sealed the box, and turned back toward his open frame with the case held in both hands to slide it into the rack.\n\nHe had both hands full when it came out of the brush.\n\nThen she saw his boot.\n\nIt was standing upright by itself in the dirt between the dropped case and the frame. The leather was laced to the top and double knotted, the way Ade Brandt always laced his boots, because Ade had a deep dread of a loose lace on open ground and had told everybody in camp about it at least once. The boot was standing up straight because it wasn't empty. Her eyes went to the top of the leather before she could stop them: clean white bone, a ragged red collar of meat, and one blue fly walking across it. She allowed herself that one look, and then she put her eyes back on the knots and locked them there.\n\nThere wasn't anything else of Ade on the trail. A wide drag mark pressed deep into the dirt went off into the tall ferns, the width of a cargo cart and dark wet in places. Several thick fern stems were snapped off clean, higher than a man could reach.\n\n\"He asked me to walk down with him,\" Shep said, his voice low. \"I was told to stay with the Bothy.\"\n\nShe didn't answer him.\n\n\"I would have heard it coming,\" Shep said. Then he went silent.\n\nHis hum stopped at her right shoulder, the amber marks under his name went dark in one breath, and his metal fists stopped on the stone. Without the hum, the shaded bend was so empty of sound that her ears rang. Right then, she heard the breathing.\n\nIt came from the deep ferns to her right, very close, and the sound was so huge she didn't know what it was for a second. It was a long, slow pull of air, like wind drawing into a cave, followed by a pause, and then it pushed out again, warm enough to stir the hairs on her forearm, smelling of copper and the sweet stream water at the same time.\n\nShe didn't move a muscle.\n\nShep did. He stepped straight in front of her, moving slow on two fists and two feet, and rose up to his full ten-foot height between her and the ferns, a solid wall of brushed gray metal with nothing in it except his own body. That was all the cover he had to give her. She could still see the ferns past his sides and between his legs. He covered her front and nothing else, and he stayed put.\n\n\"Off to your right,\" he murmured, barely audible. \"It isn't moving.\"\n\nThe ferns in front of her were thick and green and gorgeous, wet at the tips and beaded with sunlight, and behind them sat a massive shape. She could make out pieces of it through the fronds. There was a patch of dark, pebbled hide between two stems, shining wet and plated like the trunks of the cycads, and running along it was a stripe of the same bright green as the stream water. The green line rose and fell slowly when it breathed.\n\nIt was looking right at her. She knew it the way a person knows somebody is watching them across a crowded room. She couldn't see an eye in the brush, and she didn't need to.\n\n\"Holt,\" Shep said, his voice kind and unhurried, the way a good medic tells somebody the worst. \"I need a hand.\"\n\nHe had the hardware to kill it. Under his chest panels he carried the Misericorde, named for the thin dagger from the old stories that found the gaps in a knight's plate, and if he drove it into the soft place the animal would be dead before it hit the ground. Except he couldn't kill alone. That was the oldest law on the Ark, older than the hum: a living person had to lay a bare hand on his hull and say the old archers' word, loose, out loud, so the person who said it would carry the killing afterward. A machine never got to decide a death by itself.\n\nBoth of her hands were wrapped around the case. The frame was switched off dead on her back and the clip on the hip ring sat a hand's width down, which meant to reach Shep she had to let the case go, and to bring her wrist up and fire her cuff she had to let it go too. That old rule about finishing what was in her hands held her arms right where they were against her ribs. Later on she would tell people that she chose. Standing there in the shade, she didn't know if she was choosing or frozen.\n\nEven with a hand free, her cuff wouldn't have done much good here. The two killing darts were for the days when something had to die fast, and the cuff aimed those two itself. The crew called that targeting setup the Kingfisher, after the bird in the stories that sits on a branch over the water and waits for a fish to show. It read an animal's heat and pulse, and it would never waste a killing dart against heavy plate. It held its fire until a soft gap showed, the way a good hunter waits for a clean shot instead of shooting into brush. Behind those fronds, nothing showed except solid plate.\n\nThe huge breath came again, pulling in, pausing, and pushing out slow and patient, the breathing of something that knew she had nowhere to run.\n\nThe water case was getting heavy. Her forearms started to shake from holding it high against her ribs, a fine tremor starting in her elbows. She didn't dare lower it, because lowering it would be a movement. She stood planted and held the box while her arms shook and sweat ran down from her hairline into her eye and burned there.\n\nThe animal was in no hurry at all. That was the worst part of it, and she told it that way every time. It simply stood there in the ferns, breathing slow, looking over the gray block in the path and all of her behind him, the way somebody stands at a market stall looking over a melon they aren't sure they want.\n\n\"Two hearts,\" Shep whispered, barely audible. He could hear a heart beating through a wall of fern, and he was counting them.\n\nAt first she figured he meant the animal and her. Later she wondered if he had been counting something inside the case pressed against her ribs.\n\n\"Three,\" Shep said.\n\nHer mind went straight to vial five. She didn't try to think of it; the picture popped into her head on its own, the bright flecks in five lighting up and drifting toward her knuckle on the bench pad. The case was hugged against her ribs, with five sitting right over her own heart. As she thought it, the green line on the animal's hide seemed to brighten in the shade. Or maybe she imagined that. She would never know for sure which one it was, and that bothered her longer than almost anything else about the day.\n\nA blue fly landed on her lip. She let it walk.\n\nFar down the trail at depot, the Hedge sounded, the watch line around camp giving off one low soft tone. It made that tone whenever a big body crossed the boundary. Depot sat right down there, barely a quarter mile off, maybe four hundred paces, and she could see it clear in her head: the pale tents, the shade cloth over the rack, Fenn sitting at the long table.\n\nIn the ferns, the breath pulled in and held.\n\nIt held longer than before. All around the bend, the ferns leaned in toward her slightly, every frond curving at once toward her left side, the side where Shep wasn't standing, drawn toward the sweet smell still clinging to her from the stream, and the sour Rue cord on her strut didn't slow them down at all. Shep turned to block that gap, a metal fist coming down, except he was half a breath late, and a wave of smell rolled through so thick she tasted it on her tongue, sweet and heavy and green. Her knees started to buckle and she locked them hard.\n\n\"I'm going to send your heartbeat down the path,\" Shep said calmly. \"Try not to miss it.\"\n\nA small hatch opened low under his chest and something dropped to the dirt on a thin tether line, a soft dark lump the size of a fist that brushed warm against her ankle going by. Right away it started to beat in the dirt: thump, thump, a little pause, thump, thump. It sounded just like her own heart beating a bit fast. The whole trick with the lure was giving this world a warm heart to follow that wasn't hers. Shep paid the line out steady along the dirt, sending it sliding away toward the stream side of the bend.\n\nUp in the cycad crowns, a single tinker picked up the rhythm, and then ten of them joined in, and then the whole flock was tapping it back from every frond in the bend, a hundred small false hearts beating in the trees, while down in the ferns the big animal turned after the one on the line.\n\nThe bright stripe of green slid sideways behind the brush. She watched it move past Shep's side, low to the dirt, a long plated bulk gliding behind the fronds while the green line on its flank brightened with each false beat. It didn't hurry. It tracked after the lure the exact same way it had stood over her, like it knew what it was following and liked it fine.\n\nThen the ferns on her left tore apart.\n\nThe third heart came out of the brush low and fast, a younger one about the size of a mule, covered in the same pebbled plates with the same green stripe down its back, charging straight at her across the open dirt with its jaws already wide. Caught on one of its teeth was a scrap of plaid cloth. It was Ade's shirt. He had worn that shirt since landing.\n\nSera let go of the case.\n\nIt dropped and caught hard on the hip clip, banging her thigh, while her right arm came up heavy inside the dead frame. She pointed the wrist cuff the way she would point a finger, and fired. The first tranq went out with a soft pop like somebody spitting a seed, smacked the heavy plate over the animal's eye, and skipped off into the ferns. A tranq only worked once it got into the blood, and a dart bouncing off plate did nothing at all except make an animal angry.\n\nBeside her, Shep laid the Undertow on it, a tight beam of sound pitched too low to hear, aimed straight into one skull to scramble whatever told a body which way was down. She felt the buzz of it right in her teeth, making her own balance slide sideways, and out on the path the young one's legs forgot where the ground was. It staggered sideways, swinging its head to find its footing, and for one clear breath she saw the side of its neck, right behind the jaw, where the plates stopped. A fold of pale, wet skin sat exposed there, pulsing.\n\nShe fired two tranqs straight into it.\n\nThe young one took three more choppy steps. On the second step its hind legs went loose underneath it, and on the third it dropped onto its chest in the dirt a body's length from her boots, slid a foot, and stopped. Its breath came out long and rough, pulled back in slow, and let out again, and then it was asleep. Its heavy jaw lay slack on the path, and the scrap of plaid on its tooth lifted a little every time it breathed.\n\n\"Holt,\" Shep said at her shoulder. \"Your hand, and the word. It'd be done.\"\n\nShe looked down at the open jaw. Then she looked at Ade's boot.\n\nThe crew believed a killing called more of them in. Nobody had proved it on paper. Still, one of the four machines like Shep had killed a striped hunter at the river crossing in the first month, and that night the whole river had lit up bright green, and in the morning that machine had been lying out in the river, completely dark, with the water running through its chest, and that was why the survey only had three left.\n\n\"No,\" she said.\n\nShe caught the water case back up off the hip clip into both arms. Shep reeled the lure line back in, and the lump came sliding up the path out of the leaf litter, still beating until it reached his foot and stopped. When it slid past her boot it was warm and slick with a smear of bright green, the exact same green as the stream water and the stripe on the hide. The hatch clicked shut over it.\n\nOff toward the stream the heavy fern stems gave way, one after another. The footsteps were slow and heavy, each foot coming down on the bank and the ground carrying the thud to her through her boots, then another step, and another, getting a bit softer each time. She stood planted and counted them until she couldn't feel them anymore, and then she counted to a hundred past that, because she didn't trust the woods yet.\n\n\"Gone back down to the water,\" Shep said.\n\nThe amber glow crept back into the marks under his name, and then his hum came back on, and up in the cycad crowns, a few breaths later, a tinker started humming it too.\n\nThen she walked.\n\nShe stepped past the sleeping animal, close enough to hear the air moving in and out of its nose. She walked past Ade's double-knotted boot. She walked past his empty withy, standing spotless and patient in the path with its little green light on, and past his flora case lying in the dirt, lit faint along its seam for a hand that wasn't coming back. She didn't stop to pick it up. Later on, she thought about leaving that box behind more than she thought about almost anything else. It was sitting right there, and camp would want what was inside it, except she had one heavy case already and both of her hands were wrapped around it.\n\nThe cycads opened out ahead. The light went from dim green to white all at once, and the heat hit her face like an oven door swinging open.\n\nShe walked the four hundred paces to depot in a dead frame with her forearms shaking and her left palm flat on the seam and that sweet grass taste still in her throat, while Shep hummed at her right hand the whole way, knuckling along. She didn't run. Running jarred the vials. Stepping over a root near camp, a hard pebble caught under her heel cup, so she paused, lifted her boot, and found a tiny snail shell, whole and striped pink, stuck in the tread. She flicked it into the leaf litter with her thumb, set her foot down, and kept walking.\n\n* * *\n\nDepot was a wide ring of pale tents and shade cloths set out on the flat. Crossing the packed dirt apron before the long table, she slowed her stride so the case wouldn't swing. Another runner took one look at her face and stepped out of her way without asking a thing.\n\nFenn waited at the long table under the main shade tarp with the depot slate open. She was a lean, gray-haired woman with a burn scar along one jaw from a reactor job aboard the Ark, and she never raised her voice with the crew because she had never needed to. Her Bodkin lay beside the slate, a slim rod of dark metal as long as her forearm, named for the needle-pointed arrowhead in the stories made to slip through chain mail. It fired both tranqs and killing darts without a sound, and it was keyed to fire only for her hand. On this world a loud gun brought ten more animals running out of the brush for every one it killed.\n\nSera set the locked box on the wood table and kept her hand on the lit seam.\n\n\"Let me see the seal,\" Fenn said.\n\nSera angled the box so the unbroken line of light showed clear. Fenn ran a finger down the seam, then raised her eyes to Sera's face and stopped.\n\n\"What happened on the trail?\"\n\n\"Ade is back at the cycad bend,\" Sera said. \"His laced boot is sitting in the dirt, along with his open frame and his sealed flora box. The rest of him is gone.\"\n\nFenn picked up her Bodkin, thumbed the top dart out of the grip to check the needle, and clicked it back into place. One.\n\n\"Gone where?\"\n\n\"Dragged off into the deep ferns toward the stream.\"\n\n\"You saw the animal.\"\n\n\"Two of them. A big one stood in the ferns and breathed right on us. Shep dropped a heartbeat lure on a line and drew it off toward the water.\" Fenn's thumb kept checking darts. Three. Four. \"Then a young one rushed me from the left. I put two tranqs in the soft crease behind its jaw. We left it sleeping in the bend.\"\n\n\"Sleeping.\" Five. Six. \"And Shep didn't kill anything?\"\n\n\"Nobody laid a hand on me,\" Shep said calmly from behind her.\n\nFenn looked straight at Sera. Sera held her eyes. Neither of them added a word to that.\n\nFenn called Ade's name over her shoulder, and runners were already moving, backing into their withies along the shade rack, hip rings latching shut down the row one after another, \"There,\" \"There,\" \"There,\" while other hands pulled the rifle-length Bodkins down from the heavy rack. Somebody near the tents was shouting for the east watch. The clatter of boots and frames rose up around the table, while Fenn sat right where she was.\n\n\"Did it mark you?\"\n\n\"No.\"\n\n\"Your arms are shaking.\"\n\n\"I walked the mile in with the frame drive switched off. The struts were whining too loud.\"\n\nFenn studied her a breath longer. Nine. Ten. \"And the water?\"\n\n\"The fifth tube lit up in the cradle and the green swam toward my knuckle. Joss watched it happen, and Shep ran it after. It's logged on the slate in the lid.\"\n\nFenn's eyes came back up. \"Swam toward you.\"\n\n\"Right toward my finger on the pad, and drifted back when I let go.\"\n\n\"Did you write down why?\"\n\n\"Not a word.\"\n\nThe search party filed out past the table in their frames carrying the long Bodkins, and one man called Ade's name out loud once before shutting his mouth. Eleven. Twelve. Fenn laid her short Bodkin flat on the wood.\n\n\"Holt,\" she said, keeping her voice very low. \"A runner is dead on that path, and you're standing here telling me the water reaches for our hands. Tell me what that means.\"\n\n\"It reads on the gauge,\" Sera said. \"Five vials in the box, and the middle one swam toward me. That's what I've got for sure.\"\n\n\"A raw number isn't enough.\"\n\n\"I know it isn't. It's still all we actually saw, and if I write a guess on top of it, the ridge will build a whole plan on my guess.\"\n\nFenn held her gaze. The burn scar on her jaw had turned white. \"You're certain.\"\n\nSera tipped her chin at the gray box. \"The number stayed up. I wrote it down plain. And the case is sealed.\"\n\nFenn pulled the box across and slid it into the rack under the shade tarp, seam facing out so the next watch could check the lock without opening it. She copied Sera's numbers onto the depot slate, left one blank line underneath, and pressed her fingertip at the bottom, signing for cargo that was her problem now.\n\nDown the steep trail from the Bothy, a big man came walking onto the flat in a withy, picking his steps with care, the way somebody leads a nervous horse. It was Joss. He had locked up the Bothy. He halted at the edge of the shade tarp, thumbed his hip ring, and stepped out of the cups, standing there with the stretcher pole balanced across his shoulder, a length of pale ash grown on the Ark's tree deck with its canvas sling rolled tight. His empty withy stood behind him. On its right brace, the cuff showed a clean empty hole where the darts belonged. Joss had asked to have them pulled his first week on the ground. After years as an infirmary orderly, he said he had already carried enough people that somebody else had hurt. Plus, he had left the Nettle wired in. It lived in the metal struts of every withy, a sharp jolt of current that burned like a nettle sting through any jaw that clamped down on the frame, teaching the same fast lesson an electric fence teaches a cow. It never fired until jaws were already closed on the runner, and Joss kept it because it only ever stung something that was biting him first. There was no Rue cord tied on his strut either. He wouldn't touch the stuff, saying rendered fat felt like wearing somebody.\n\nFenn pulled a second short Bodkin out from under the table and held it across to him, grip first.\n\n\"The lock knows your hand,\" she said. \"I keyed it at dawn.\"\n\nJoss looked down at the rod for about as long as Sera had looked at Ade's boot. Then he set the butt end of the ash pole in the dirt beside his foot and kept both hands wrapped on the wood.\n\nFenn slid the Bodkin back under the table.\n\n\"Shep,\" she said. \"Walk out with Amari. Stay right on his shoulder.\"\n\n\"The Bothy is sitting empty,\" Shep said.\n\n\"I know right where the Bothy is.\"\n\nShep stayed crouched one breath longer than usual. \"I'll bring him back,\" he said, his voice low. \"Whatever is left.\"\n\nJoss backed into his frame, waiting through the click and the climb of the bands. \"There,\" he muttered, so low she barely caught it. Then he shouldered the ash pole and walked out after the runners, and Shep unfolded his legs and knuckled over to his side, humming his note. Everybody at the table knew Joss wouldn't speak the killing word. Anyway, Fenn sent Shep with him because the one man in camp who wouldn't touch a weapon was also the only medic who knew how to lift what was left of Ade properly, and Shep could tuck his legs up and fly the stretcher the whole mile back.\n\n\"Go get some water,\" Fenn told Sera. \"Get off your feet and stay off that east path. I'll come find you.\"\n\nSera turned and went.\n\nShe walked the outer edge of depot toward the sample tent. Over near the mess tent behind her, somebody was crying hard, that rough ugly crying that is mostly gasping for breath. She kept her eyes ahead. The worn groove over her collarbone held its heat. She rolled her shoulder once and left it alone.\n\nA young plant tech passed her with a tray of leaf bags, a kid off the last lander who hadn't heard the news yet. \"Water running clean today?\" the tech asked.\n\n\"Had one bad tube,\" Sera said. \"I wrote it down.\"\n\nThe tech nodded and went on. Sera reached the sample tent, put her hand on the flap, and stood there for one breath in the camp noise. Out on the east path she could still hear Shep moving away with Joss and the runners, the old nursery song getting smaller in the brush, going flat in its one spot.\n\n* * *\n\nThe sample tent held one work table, one narrow cot, and a spare rack braced against the back wall. The cloth carried rushlight right in its weave the way the Bothy walls did, pale and even. She ducked inside and let the flap fall shut, and the canvas muffled the depot noise down to a dull murmur.\n\nShe stepped out of her withy for the last time that day and hung it on the corner tent post, where it stood empty with its arms open, holding her shape.\n\nShe laid her stone marker on the wood table beside her own copy of the slate, the duplicate that matched the one sealed in the case. A dry leaf had stuck to the corner of it, curled and bright orange at the edges. She brushed it off onto the dirt floor.\n\nThere was one blank line on her copy with nothing written on it, right under the camp name and the numbers. It was the line where a runner wrote down why.\n\nShe sat down on the camp stool. Her forearms had stopped shaking on the walk over, and now they started up again, worse than before, so she pressed both hands flat on the table until they quit. It took a good bit. She let it take as long as it needed.\n\nBehind her eyes she could still see the gauge number climbing. She could see the green flecks drifting through the water toward her knuckle. She could see the bright stripe of green gliding after the beating lure on the string just as easily as it would have come after her, and the young one's slack jaw lying open on the path, with the torn scrap of Ade's plaid shirt lifting on its tooth with every breath.\n\nShe didn't try to put those things together. She didn't write a word in the margin either. She sat with them laid out separate in her head, the glass vial and the plated hide and the beating lure, keeping them apart on purpose the way a sensible person keeps two strange dogs apart until she knows what they'll do. If she put them side by side she would have to write something on the why line, and she wasn't going to.\n\nShe looked down at the base of her left thumb, right where she had pressed the gray sensor cap after running vial five. The skin there had turned pink, a small round patch the size of a coin, warm and slightly raised. It didn't hurt at all. When she pressed it with her other thumb it tingled, faint and steady, and the tingle ran a little way up the inside of her wrist and stopped.\n\nShe sat looking at that spot until the light outside the tent turned deep orange. Then she pulled her sleeve down over it.\n\nOutside on the path, heavy boots paused by her tent and walked on when nobody answered. Much later the runners came back in. She heard them pass, the slow tread of people carrying weight, and the low hum of Shep flying just off the ground with the stretcher slung between them, his legs tucked up under his block, and Joss's soft voice saying, \"Careful, careful,\" the exact way he must have said it a thousand times in the ship's infirmary. Passing the tent, somebody said the young plated animal was already gone from the bend when they got there, woken up and walked off on its own legs. All they found was the long mark in the dirt where it had slept, leading off toward the water. After that, she didn't hear a thing from that direction until long after dark.\n\nShe stayed inside.\n\nBefore turning in, she lined the stone marker up parallel with the edge of the slate. Honestly, it was just a small bit of order, a tool left neat where first light would find it.\n\nThe sample vial that had started out cold in her hand at dawn was locked in a gray case in the depot rack now, sealed under Fenn's fingertip. The green in that glass would read the exact same number in the morning. And out at the cycad bend in the dark, Ade's empty frame was still standing upright in the path with its little green ready light on, waiting.\n\nShe laid her palm flat on the tent wall until the rushlight drained out of the weave, and the dark took the tent all at once. She lay back on the cot with her boots still laced on.\n\nOut in the ferns the Hedge sounded, one low tone. It chimed whenever a big body crossed inward and never made a sound when the body left. She lay flat on her back and counted her breaths. Much later in the night, it sounded once more.\n\nShep came by last of all. She heard him hum past her tent, moving slow, and stop at the edge of depot facing the east path, where he would stand watch all night because he chose to. Through the canvas weave she could make out the amber marks under his name, glowing low and even, and his camera eyes were turned toward her tent. Two wrens rode on his shoulders. The third socket stood empty.\n\nIn the dark her left thumb stayed warm. The small patch underneath tingled, steady as a pulse. Out past the Hedge line, the tinkers in the trees were copying Shep's hum, low and a hair off pitch, the way they always did. Then one bird stopped humming and started tapping its beak instead: thump, thump, a little pause, thump, thump, a heart beating a bit fast, and she knew whose heart it had learned.\n\nSo she lay there on the cot and listened to the bird keep her time in the dark, while the line where a runner wrote why stayed empty where she had left it.\n"},
    ]},
  {id:"qf-perimeter-sample", title:"Quantum Frontier: Perimeter Sample", subtitle:"Kael Orth · perimeter circuit", series:"Quantum Frontier", era:"Prequels", year:2026, type:"Fiction", status:"Manuscript", freeChapterCount:2, reader:"Leo", blurb:"Kael Orth walks the perimeter stake line alone. Second Quantum Frontier prequel.", chapters:[
      {label:"Front Matter", text:"Perimeter Sample\n\nby\nDouglxss Burley Johnson"},
      {label:"Chapter One", text:"Chapter One\n\nThe empty flora case was already wearing a groove into Kael Orth's shoulder before he even slid it off the depot rack. It was a long flat gray box built to ride in the back of a withy like a drawer in a dresser. Empty, it weighed next to nothing, and it still found the old tender spot over his collarbone right away and dug in. On the shelf above it sat the water lots from the past few mornings, sealed tight, with a faint thread of light along every seam. Those were Sera Holt's. He didn't stop to read the marks on them. Today wasn't water. Today was the perimeter, the long loop around depot where a runner walked the stake line and clipped a bit of everything that grew, so the crew could tell what lived at the edge of camp before it crept any closer.\n\nHe sat down on the bench beside the rack and laced up his boots. He tied them in a double knot, pulling the second knot down hard on top of the first. He had been lacing them like that for a few days now, and if somebody had asked him why, he couldn't have said when he started or who he had picked it up from.\n\nHis withy hung on the wall rack with the others, gray and open, standing upright in its heel cups like a work coat on a hook. He turned around and backed into the rig. Locking in took four breaths. The hip ring latched with one soft click, the woven bands pulled snug from his ankles up his legs in a running ripple, and the braces closed cool along his forearms last, seating the cuff on his right wrist with its small weight of darts. Once the frame took his load, he went light.\n\n\"There,\" he muttered, the way everybody on the crew said it.\n\nA withy was a powered walking frame a runner wore, built around a gray spine and a hip ring with thin struts down the outside of each leg to a cup under the heel, and a cuff on the right forearm that held ten darts, eight tranqs and two killing darts. Simple idea, really. It carried whatever load he hauled and kept him steady on rough ground, and it covered nothing at all. It gave a runner a fighting chance, the crew always said, and he had never asked anybody what they actually meant by that.\n\nHe slid the flat case into the slot on his back. It locked home with a click he felt right in his spine.\n\nA single wren rode on his shoulder strap. It was the size of a walnut, pale gray and smooth as a creek stone, and it had dropped off Shep's shoulder up at the Bothy at dawn and flown the mile to depot by itself to sit there. Shep stayed stationed outside the Bothy up on the shelf with the water samples. There were only three units like him left, and Fenn wouldn't spend one on a plant loop. She would lend a runner a wren, and that was the whole deal.\n\nHis collar bead clicked, and Shep's voice came through in his ear. He had a warm, easy voice, the calm voice anybody would want reading to them when they were laid up sick, and through the bead he sounded close, right there at his collar.\n\n\"Orth. You're walking like a man who owes somebody money.\"\n\n\"I haven't even left yet.\"\n\n\"Then you're sitting like one,\" Shep said, and Kael could hear the grin in it.\n\nThe stake line started at the edge of the packed dirt. The first wooden stake leaned a bit toward the fern, its paint peeled back where the sun had baked it. Right at the turn, a chip of that paint lay on the dirt, pale yellow, the size of a fingernail, and he stepped past it. The stakes smelled of the Rue, sour and stale, dabbed on fresh by whoever had walked the loop at first light. The crew boiled the Rue down from the fat of animals they had already had to kill, and it smelled like meat a week dead. Nearly every animal on this world gave off that same smell when it died, and the living ones stepped wide around it, the young ones most of all. For the most part the big old hunters did too, unless they were hungry. The tracks in the dirt here crossed straight over the stake line instead of following it. His own frame carried a band of it too, gray waxed cord wound around the left strut, and it stayed behind on the frame whenever he stepped out, which was the part of the setup nobody liked to think about.\n\nHonestly, the low scrub at first light was the best sight on this world, and he would have told anybody so. The ferns came up to his knees, and down among the fronds grew tiny blue flowers no bigger than shirt buttons, thousands of them, and every single one pulled shut when a shadow crossed it. Whenever he walked, his shadow stretched ahead of him over the scrub and the flowers closed right in front of his boots, a dark line of blue folding shut, one tiny click after another, too soft to hear. When he glanced back, his trail was a dark stripe through the blue, and behind it the petals were opening again. Past the scrub the cycad stands sat at the bends of the path, fat trunks scaled like pinecones, crowned with stiff fronds in a blue so deep it looked nearly purple. Bugs like chips of enamel hovered over the flowers, green, red, and a gold one, hanging in place without going anywhere.\n\nOnce he reached open ground, he reached back to the switch on his spine and turned the frame's drive off.\n\nWhenever the drive was on, the leg struts sang. Up around camp nobody ever noticed it. Out here, with nothing moving except the wind, it made a thin high whine that carried across the scrub on every step, and the big animals on this world hunted by ear. Because of that, runners walked the open stretches with the drive switched off, and they called it going dead-frame. The rig stayed on his body and quit helping, and all at once it was thirty pounds of struts hanging on his hips and shoulders, while the case rode on his back like a sack of wet sand. The groove over his collarbone took the strap and started to burn.\n\n\"Smart move,\" Shep said in his ear. \"Heavy way to walk, though.\"\n\n\"Everybody says that.\"\n\n\"Everybody's right. I'd haul it for you, Orth, except I'm a mile off and very busy guarding five cups of water.\" He paused a second. \"It's pretty exciting water. Don't tell Holt I said so.\"\n\nStake 3 marked a tough scrub shrub with thick leathery leaves. He halted and thumbed the hip ring.\n\nThat was the rule on the loop that nobody liked. Nobody took a sample in a withy. The stiff frame couldn't kneel down, and it couldn't reach inside a bush or hold a fresh stem steady the way bare fingers could, and its motor put a trembling into whatever it touched. So every runner stepped out of the rig at every single stake, no exceptions. The bands let go from the top down over three breaths, and Kael stepped forward out of the heel cups, leaving the frame standing behind him on the path, empty and open-armed, holding his shape, with the ten darts in its cuff where they couldn't do him a bit of good.\n\nHe dropped to his knees in the fern. He wiped his snips on his trouser knee until the blades shone clean, clipped three fresh tips of new growth, and dropped them into the first vial. He capped it and scratched the stake mark onto the glass with his marker, a stub of pale stone that left a fine white line water could never wash off. He tucked the tube into the padded pocket at his hip, where the soft bed closed around it like a hand. He stood up, walked the four paces back, turned around, and slid his heels into the cups.\n\nGetting back in took four breaths, the click, the ripple of the bands, the braces closing. \"There.\"\n\nThat was the job, and he fell into the rhythm of it all over again every morning: thumb the ring, three breaths, step out, clip the plant, mark the glass, then four breaths to lock back in. He ran through it at stake 4, taking two fronds off a low fern with spore backs dark as rust. The empty frame stood five steps back on the trail while he worked on his knees.\n\nStake 5 sat in a shallow hollow where the dirt still held the night's damp. He stepped out, knelt beside a vine on the bank, and snipped a stem and a leaf. When he lifted his head, the track was sitting right there at the rim of the hollow, three toes pressed deep into the mud, and a smooth mark behind them where something heavy had dragged. Dry grit had half filled it in, which meant it was from last night, before the dew fell.\n\nHe pulled out his slate and wrote: wet ground, three toes. He didn't write what made them, because he didn't know, and out here a guess on the morning slate had a bad habit of turning into a fact by suppertime.\n\nThe wren lifted off his strap. It dropped a hand's width and then rose without a sound, gliding up over the fern, where it hung for a breath turning in a circle before dropping back down to click onto the strap again.\n\n\"Small things east,\" Shep reported. \"Warm bodies, moving off. Nothing close by.\"\n\nKael looked down at the print in the mud. He could have stood his whole boot inside the middle toe.\n\n\"Small, huh,\" he said.\n\n\"Small and warm right now. I'm telling you what my wren saw, Orth. I'm not telling you what made that print, and I'd watch anybody who claims they know.\"\n\nAfter a breath, Shep added, \"It likes riding with you, by the way. The wren. It'd never say so. It's shy.\"\n\nHe backed into the frame, four breaths, and said, \"There.\"\n\nAt stake 6 he clipped three seed heads off a stand of dry grass. Every flagged plant on this loop grew a bit farther off the path than the one before it. That was simply how the route had been laid out, the stakes on the trail and the plants wherever they had chosen to grow, and by the far end of it a runner walked a good way out from his frame to reach them. The grass at stake 6 sat seven paces out. He counted all seven going and counted all seven coming back.\n\nAt stake 7, the tinkers found the wren.\n\nThree of them dropped down out of a cycad crown, little rust-colored birds named for the pot menders in the old stories who walked the roads tapping on kettles, and they landed on his strap, on the frame, and right on his head, humming at the wren. They were copying Shep's note. They had picked it up off him at the Bothy, that one low hum he made whenever he was around people, and they had it a hair off pitch and acted pretty proud of it. The wren sat there and took it.\n\n\"Shoo them off,\" Shep said, sounding more embarrassed than anything.\n\nKael brushed them off. They circled and landed right back on him. He shooed them off again, and they fluttered up into the cycad and hummed down at him from the shade, still off key, and he caught himself grinning in a way he hadn't grinned in days.\n\n\"They think it's a baby,\" he said.\n\n\"They think it's mine,\" Shep said, his voice turning a bit rough. \"And it is.\"\n\nHe shaved a curl of bark off the shrub at stake 7, capped it, and locked back into his frame.\n\nOut in the brush, something snapped.\n\nIt came from the east, past the fern line, one dry snap of a stem giving way under real weight. He froze in the frame and kept his chin down. Rook Daley, the oldest runner on the roster, always said the dumbest thing a person could do out here was look at a noise, because the noise would know it had been heard. He counted to twenty and nothing followed it.\n\nHe started walking again.\n\nAt the next rise it snapped a second time, closer in. It was the same dry sound, a bit louder and nearer the line, and without thinking about it at all, he reached across with his left thumb and turned the selector ring on his right wrist cuff from tranqs to killing darts. A tranq put a big animal to sleep, as long as the needle got through the skin. A killing dart stopped its heart in a breath. He felt the small catch click under his thumb. When he glanced down at his wrist a second later, he didn't even remember moving his hand, and he left it set there.\n\nStake 8 was a patch of gray lichen on a rock face, eight paces off the trail. He scraped it into a vial with the flat back of the snips and wiped the loose grit off the glass with care, because grit ruined the bench readings later. He walked the eight paces back and climbed in.\n\nStake 9 was completely bare. The bush flagged there was stripped to pale stalks, the leaves gone and the bark peeled back in long curls, and every curl had a clean notch in it where a heavy beak had closed. He marked the stake stripped on the slate and kept moving. An eaten plant was still worth writing down. Plus, it told him something big had been feeding here, and recently.\n\nStake 10 leaned hard. The trail squeezed between two cycad stands there and opened onto a low flat, where the flagged bush hung heavy with clusters of purple berries, nine paces off the path. He stepped out, walked the nine paces, and knelt. The berries were soft as ripe grapes. When he snipped a cluster, they burst across his fingers, and the warm juice ran down the blades and over his knuckles, purple and sweet. The smell came up at him thick, a heavy sweetness that sat in the back of his throat.\n\nHe dropped the cluster into the bag tube and capped it. He wiped his snips clean on the fern and rubbed his sticky hand down his trousers. He walked the nine paces back and locked in, four breaths, and as the brace closed on his right forearm he noticed the purple juice had smeared onto the wrist cuff, leaving a dark streak in the grooves by the dart ports.\n\nHe didn't stop to wipe the cuff. He told himself he would scrub it off at the far bend. He would remember telling himself that later.\n\nHe ran his fingers over the pocket at his hip and counted seven vials and the berry tube.\n\nThe trail climbed a stony rise past 10, and at the top of the rock his collar bead hissed.\n\n\"Orth,\" Shep's voice said, small and far off. \"You're walking into the\" and then his voice vanished into static.\n\nEvery runner knew about the dead patch behind the rise, some trick of the iron in the stone that nobody at camp could explain. The bead went to a hiss and stayed there, and up on his strap the stone wren went dead at the exact same instant. When he tapped it with a finger, the pebble felt cool and did nothing. It couldn't hear Shep and Shep couldn't hear it.\n\nBack down the trail behind him, the tinkers stopped humming.\n\nFrom here around the bend, he was on his own for sure.\n\n* * *\n\nOut at the far bend, the animal track changed.\n\nAll morning he had been stepping past last night's trail, dry and half filled with grit. Here in the bend, the print was fresh. It was the same three toes, sunk deep in the soft dirt with the rims still dark and wet, and water standing in the bottom of each toe. A thick fern stem lay bent across it, snapped clean, with bright green sap still beading up at the break. He looked at that bead of sap long enough to know what it meant, and then he looked over at the last stake.\n\nThe last stake on the loop stood at the turn, and the plant it pointed to wasn't near the trail. It was a low flowering creeper climbing the sunny side of a boulder six paces off the path, out past the blue flowers, farther out than any other stop on the loop.\n\nHe could skip it. Walking in one tube short wasn't the end of the world.\n\nStill, the rule on the survey was to finish what was in his hands, and this loop was in his hands. Every rule out here came down to that one sooner or later. So he thumbed the release on his hip ring.\n\nThe woven bands let go top to bottom over three breaths. He stepped out of the cups, leaving the frame standing behind him on the path, empty, its arm braces open, with the purple smear drying on its cuff. He walked away from the rig, stepping out past the reach of the Rue. He counted the paces under his breath, one, two, watching the blue flowers fold shut ahead of his shadow, three, four, five, six. He knelt against the boulder with his back to the trail and the empty frame six paces behind him, and pulled out his snips.\n\nThe creeper carried small white flowers shaped like cups and dark leaves the size of his thumbnail. He clipped a leaf first. The blades made a small clean snip in the air.\n\nOff to his right, out in the scrub, a heavy body took a step.\n\nThere was no mistaking the sound, a broad foot coming down slow in soft dirt. He didn't turn his head. He snipped one white flower, holding the open tube under the stem so the cup fell straight in, and out in the scrub to his right the foot came down a second time, a bit farther along. It wasn't stalking behind him, because he wasn't moving. It was walking a parallel line in the fern ten paces out, behind the boulder's shoulder, where he couldn't see it without turning around, and he wasn't going to turn.\n\nHe capped the tube.\n\nOut in the brush, the steps stopped. It hadn't walked on, and it hadn't dropped back. It had halted right where he had halted, ten paces out, the way somebody stops beside a stranger on a road when they mean to walk together.\n\nHe scratched the mark onto the glass. His hand stayed rock steady, though he had no idea where that came from. The white line bit into the glass in short strokes. He tucked the tube into the last slot at his hip. That made all eight, the whole loop, done and marked.\n\nRight then he noticed the blue flowers.\n\nOut in the scrub to his right, the blue flowers were folding shut in a line, one after another, drawing a dark stripe through the blue straight toward him across the fern, the exact way they had closed all morning ahead of his own shadow. Except there was no shadow on them. The midday sun sat straight overhead. Whatever was closing them was coming in low and slow, and the dark line of shut flowers crept across the open ground toward the boulder, toward his knees, and toward the empty frame behind him.\n\nHe was six paces from his frame, and he couldn't see where it sat without turning his head.\n\nThe line of closed flowers stopped three paces off. He could hear it breathe now, short quick breaths through a narrow throat, with a thin whistle at the end of each one, and then the fern parted and its head pushed through.\n\nHonestly, the thing was gorgeous. That was the very first thought he had, and he told it that way every time. It had a long narrow head, plated across the crown in overlapping scales the color of wet slate, and a heavy hooked beak like a heron's, held a bit open. Underneath its chin hung a loose wattle of skin in the brightest color he had seen on the whole loop, a hot rose pink like new enamel on a cup. While he knelt there looking at it, that wattle flushed brighter with every breath it pulled, pulsing from rose to deep red and back to rose.\n\nIt was a wild runner. Camp word said runners stood shoulder high, sprinted on two legs in a fast rush, and used that hooked beak for stripping bark. He had seen the notches bitten into the curls at stake 9, and it hit him right then that he had been reading its menu.\n\nIt didn't look at his face. It stared straight at his right hand, the purple hand that had crushed the berries. Its head went low and the beak opened a bit wider and it breathed in, long, toward his fingers, while the wattle flushed solid red.\n\nHe stood up, slow. The narrow head rose with him, tracking his hand.\n\nHe took one slow step backward toward the frame. It came one step after. He took a second step back, and it matched him again. He didn't bolt. Running was loud and running turned a man into prey, and the frame was waiting behind him with the darts in its cuff. He walked backward toward it with his purple hand held out a bit from his hip so the beak would follow his fingers instead of his throat, and it worked. Three. Its breath whistled high. Four. He could smell it plain now, crushed fern and old meat, and underneath that, off his own knuckles, the sweet berry juice. Five. Way off to the east, the scrub snapped again, and the runner's head twitched toward the sound and swung right back. Six.\n\nHis left heel bumped the cup.\n\nHe stepped back in, left heel and then the right, and thumbed the ring. On the first breath the hip latch closed with its soft click, and the woven bands started their slow ripple up his ankles. Nothing on this world could hurry those bands along, and he had never hated a piece of gear as much as he hated that slow ripple right then. At the click, the runner's head turned sharp. On the second breath the bands were only at his knees. The animal leaned in and breathed hard at the frame, right at the cuff on his right brace where the purple smear was, and the whistle went shrill.\n\nThe cuff on his wrist was already live. It had come awake the second his heels hit the cups. He felt the small ring shift against the bones of his wrist as it aimed itself along his forearm, felt it find the runner's head, and felt it wait.\n\nIt held its fire because the runner kept its chin tucked low. The slate plates on the top of the skull faced the cuff, overlapping, with the long scaled neck curved down behind them, leaving no soft place showing anywhere. The cuff aimed the killing darts itself, and the crew called that setup the Kingfisher, after the bird in the old stories that sits on a branch over the water as long as it takes for a fish to show. It read heat and pulse and plate, and it refused to waste a killing dart on plate, waiting for a soft gap while the bands rippled past his thighs and the runner lunged in.\n\nThat was the third breath, and the braces were still standing open on his arms.\n\nThe waiting was the worst part of the whole morning, and he told it that way every time: feeling the loaded cuff on his own arm hold its fire while the head came in, low, beak wide, close enough that he could see the wet pink hinge of its jaw, with no way in the world to make it fire.\n\nIt took the brace in its beak.\n\nIt bit clean across his right forearm, catching the metal brace and his arm inside it, and the Nettle fired straight through its mouth. The Nettle lived in the struts, a heavy jolt of current that burned like a nettle sting through any mouth that closed on the frame, teaching the same quick lesson an electric fence teaches a cow. It bit anything that bit the rig, as long as a runner was standing inside it.\n\nHe felt the jolt buzz right in his own teeth. The runner's jaw flew wide open. Its head jerked up and back, high, the whole long neck rearing, and the wattle flared out wide and hot red, and right there under the hinge of the jaw where the plates stopped sat a fold of pale bare skin, soft as the inside of a wrist, pulsing.\n\nThe Kingfisher fired.\n\nHe didn't hear the dart leave the port. He saw the killing dart stand buried in the soft fold behind the jaw, a short dark line, and the runner's whole body jerked once. Then it stood in place. It was already dead on its feet and didn't know it yet. It stood on its two legs with its head up and its beak open, while the wattle faded from red to dull gray in one long breath, and then the legs folded out from under it and it crashed down on top of him.\n\nHe went flat on his back in a frame that wanted to stand him up. The dead weight slammed across his legs and drove the heel cups deep into the dirt, hot weight, heavy as a felled tree, while the stink of crushed fern and old kill rolled over him. The hind legs kicked once. He lay pinned on his spine with the sky over him and the body across his shins and felt it kick a second time, and a third, and then kick less, and quit, and he stayed lying there for thirty breaths after that.\n\nHe looked down at his right arm.\n\nThe metal brace had taken the worst of the bite, which he figured was what the crew meant when they said the frame gave a runner a fighting chance, though the beak tip had slipped past the edge of the guard and opened the inside of his forearm in one red line from the wrist halfway to the elbow, deep enough that a white cord showed down in the meat. When he made a fist, the cord moved.\n\nHe looked away from it.\n\nWith his left hand he got the cloth out of his kit and wrapped the arm one-handed, winding the linen around and around before pulling the end tight with his teeth and tucking it under. Blood soaked red through the cloth before he had even finished. He made a fist a second time, saw that his fingers still worked, and decided that was all he needed to know for now.\n\nAnyway, he worked his legs out from under the dead runner a bit at a time, the frame grinding low against the weight, and once he was clear he sat up and checked the case on his back by feel. It was still locked in its rack. He checked the pocket at his hip and found all eight tubes safe in their beds. A dry seed husk was stuck in the mesh where the pocket met the strap, so he flicked it into the fern with his thumb.\n\nThe dead runner lay across the path with its beak open on empty air. The wattle had turned the color of cold wood ash. Up close, the plates along its back had green moss growing in the seams between them. Its round gold eye stared open with a second lid drawn half across it, clear as a window.\n\nHe didn't take anything off the body. He didn't hold a vial to it.\n\nHe pulled out his slate. There were two columns on it, what was taken and what happened, the same two columns since the first loop anybody ever walked. Under taken he wrote eight. Under happened he wrote: Runner at the far bend. It came at me. I killed it. It's lying there.\n\nHe glanced at the cuff. One killing dart was gone and one was left, and all eight tranqs were still sitting in their slots where he had left them when he turned the ring at the second snap on the rise. He still couldn't remember turning it. Purple berry juice was drying into a dark crust in the grooves.\n\nFrom the east, out past the scrub, a voice called, a long hollow note rising at the end. A few breaths later, a second one answered it, farther off.\n\nThe crew believed a killing called more of them in. Nobody had proved it on paper. In the first month a striped hunter had been killed at the river crossing, and that night the whole river had lit up green, which was all the proof anybody in camp needed.\n\nHe didn't look east. He got up, switched the frame's drive back on for one breath to stand, switched it right back off, and walked.\n\n* * *\n\nThe walk in was the exact same loop backward, and it felt twice as long for sure.\n\nHe walked it dead-frame with the flat flora case racked on his spine and his wrapped right arm held tight against his chest. With the drive switched off, the thirty pounds of gray struts hung dead on his hips and shoulders, and every step had to haul the rig along by main strength. Now that he had to favor his right arm, keeping the elbow pinned to his ribs so the metal brace wouldn't swing and tug at the torn meat underneath, the whole load rode on his left shoulder. The strap dug straight back into the old tender groove over his collarbone and stayed there.\n\nBefore he had gone twenty paces from the dead runner at the far bend, he felt something warm trickle down the side of his right pinky finger and drip into the dirt.\n\nHe stopped in his tracks, keeping his chin down, and looked at his hand. The linen cloth he had wound around his forearm with his teeth was already soaked through. A dark red thread was running down the smooth gray metal of the brace, pooling at the bottom lip by his wrist, and dropping onto the dry trail every three or four steps. Out here, walking down the path leaking fresh blood onto the dirt was the same as laying out a painted line for whatever was coming in from the east.\n\nHe didn't have a dry cloth left in his kit. He stood planted in the scrub, lifted his right wrist to his mouth, and caught the loose tail of the linen wrap in his teeth. Working with his left thumb and his jaw, he shoved the wet end of the cloth down inside the bottom lip of the metal brace, wedging it tight between his skin and the gray guard so the hollow of the brace caught the seepage like a gutter. The pressure drove a hot spike up his forearm from wrist to elbow, and deep under the linen he felt that pale cord in his meat jump once against the metal. He bit down on the inside of his cheek until the red haze cleared out of his eyes, then lowered his arm back against his chest. No more drops fell off his pinky.\n\nBack toward the bend behind him, the brush rustled hard.\n\nHe didn't turn around to look. The bend was only forty paces back, where the runner he had killed lay across the dirt path with its hooked beak open and the single killing dart buried behind its jaw. A second later he heard a heavy two-legged hop land in the dirt back there, followed by a low, wet rattle in a narrow throat and the hard clack of a beak striking slate plate. Whatever had called from the east had made it to the body, covering the ground a whole lot faster than a man could walk.\n\nThen a second voice answered that rattle, closer in now, coming through the waist-high fern off to his left on a line that would cross the trail right ahead of him at Stake 10.\n\nHe was still inside the dead patch behind the stony rise. The tiny radio bead at his collar gave off nothing except a dry hiss in his ear, and the smooth gray wren on his left shoulder strap sat cold as a creek pebble. He was on his own until he climbed over that iron rock, and the trail led straight through the low flat at Stake 10.\n\nAs he came onto the low flat, the heavy sweet smell of the berries met him in the heat. Stake 10 leaned hard at the edge of the trail, nine paces from the bush he had clipped. Right beside the stake, pressed deep into the soft dirt directly on top of his own outgoing bootprint, sat a fresh three-toed track. Dry grit was still sliding down into the bottom of the middle toe. Something had walked through the narrow gap between the cycad stands while he was out at the boulder, stepped straight over his morning trail, and kept going toward the bend.\n\nBefore he could take another step toward the trees, the blue button flowers out in the scrub to his left started folding shut on their own.\n\nThey closed in a fast, straight line crossing the flat from the east, thirty paces out, moving at a long loping trot toward the gap between the cycads. Under the high sun a second wild runner was coming in to answer the rattle at the bend. If Kael tried to climb the stony rise in thirty pounds of unpowered metal, his heel cups would scrape on the shale and it would be on his back before he made the crest.\n\nSo he stepped sideways off the dirt path into the deep blue shade between the two fattest cycad trunks.\n\nThe trunks were scaled like giant pinecones, and the stiff purple-blue fronds overhead blocked the sun out completely. Down around the roots, the ground was covered in dead husks where none of the little blue flowers grew, so nothing folded shut under his boots to give his spot away. He backed his spine flat against the rough scales of the trunk until the flora case wedged solid against the bark. Then he tucked his right forearm deep under his left armpit, burying the blood-soaked linen and the berry-stained cuff against his shirt to hold the smell in, and breathed through his open mouth as slow as his heart would let him.\n\nThe second runner trotted into the gap five paces in front of his boots. It was taller in the hip than the one he had killed, with the same overlapping slate plates across its crown and down its neck, and a long hooked beak the length of a pick head. Under its chin hung a loose wattle of skin in a hot rose pink, with an old ragged notch torn out of the lower edge. As it hit the trail between the cycads, it slowed down and swung its narrow head toward Stake 10, where the crushed berries hung drying in the sun. Its throat gave a thin whistle on the inhale, and the notched wattle flushed deep red.\n\nOn Kael's right wrist, pinned tight against his ribs under his left arm, the cuff woke up.\n\nHe felt the small targeting ring move against his wrist bones inside the brace as the Kingfisher caught the animal's heat and pulse five paces away. He still had the selector wheel turned to his one remaining killing dart. If the runner turned its head and showed the soft fold behind its jaw, the Kingfisher would fire that last dart on its own, leaving him in the shade with an empty killing slot and a dying animal thrashing at his boots.\n\nMoving a fraction of an inch at a time, Kael rolled his right wrist inward against his own belly, pressing the dart ports flat into the heavy canvas of his work shirt until the cuff's eye was completely blind. Against his skin, he felt the little ring hunt once, lose the heat mark, and stop moving.\n\nFive paces out in the gap, the big runner lowered its beak to the dirt where Kael had stood a breath ago. A single tiny bead of red had squeezed out from the hinge of his metal brace and fallen on a dry cycad husk at the edge of the path. The hooked beak paused a thumb's width above the husk. Its round gold eye, half covered by its clear inner lid, stared straight into the dark blue shade between the trunks where everything sat at the exact same warmth.\n\nBack at the far bend, the first runner let out another sharp clack of its beak, followed by a long wet tearing sound, like heavy canvas being ripped off a frame.\n\nThe runner in the gap jerked its head up. With two long strides of its scaled legs it cleared the shade of the cycads and sprinted down the path toward the bend, kicking dry dirt back over Stake 10 as it went.\n\nKael waited until he heard the two of them knocking beaks together over the carcass at the turn. Then he stepped out from between the cycad trunks, kept his right arm pinned to his ribs, and climbed the stony rise.\n\nGoing up the rock dead-frame with one working hand was the hardest twenty yards of the morning. Halfway up the slope his right heel cup skidded an inch on the loose shale, and out of habit his right hand twitched inside the brace to catch his balance. The white cord in his torn forearm pulled hard through the raw meat, a sharp tug that made his knees wobble and put a sour taste in the back of his throat. He planted his left boot wide, leaned his hip ring flat against the hot rock face, and hauled his weight up the last five steps by his left strap alone.\n\nOver the rise the bead clicked back on.\n\n\"Orth.\"\n\n\"I'm here.\"\n\nNobody spoke for three breaths, and he could hear Shep listening to his breathing.\n\n\"You're dripping on my wren,\" Shep said gently, in that easy, dry voice a friend uses to keep a hurt man talking.\n\n\"Walking in.\"\n\nShep didn't push for more, and Kael didn't add a word, while the wren rode on his strap with a bead of his blood drying brown on its back.\n\nOn his shoulder, the pebble popped out of its clip, dropped a hand's width, and glided up without a sound over the scrub behind him, banking back toward the crest of the iron rise.\n\n\"Your heart's running like you tried to race the cargo lifter up the hill,\" Shep said in his ear. \"Tell me what you ran into behind that rock, Orth. Keep your voice down and keep your feet moving.\"\n\n\"Wild runner at the last stake,\" Kael said, barely above a whisper, watching the path ahead of his boots. \"Came in on the berry juice on my cuff while I was out of the rig at the boulder. Caught my right arm across the brace on the third breath before the Nettle and the cuff put a killing dart behind its jaw.\"\n\n\"And the arm?\"\n\n\"Beak slipped past the guard on the inside,\" Kael said. \"Opened it up from the wrist halfway to the elbow. My fingers work. I wrapped it with the kit rag.\"\n\n\"A kit rag,\" Shep repeated dryly. \"Joss is going to love that. He spent an hour this morning folding clean linen into little squares because Holt made him nervous, and now you're going to walk in wearing a dirty knot you tied with your teeth.\"\n\n\"How do you know I tied it with my teeth?\"\n\n\"Because you only have two hands, man, and one of them is leaking on my favorite bird.\" Shep's voice dropped a shade lower. \"My wren has eyes on the bend behind the rise. There are two more of them down on the path over the one you dropped. They're busy tearing at the throat right now, which is why neither of them came over the rock after you.\"\n\nKael walked past Stake 9, where the flagged bush stood stripped to pale stalks, and then Stake 8, where the gray lichen grew on the rock face eight paces off the trail. As he came level with the outcrop, the noon glare tilted sideways for a second, and his left knee gave a small hitch under the dead thirty-pound rig. He stepped two paces off the path and leaned his good left shoulder against the hot stone to steady himself. A drop of dark blood fell from the elbow of the brace onto the dust, and he scraped dry grit over it with his heel cup before pushing off.\n\n\"Orth,\" Shep said in his ear, calm and steady. \"You stopped.\"\n\n\"Catching my breath for a second,\" Kael muttered, stepping back into his morning bootprints. \"This frame weighs a ton with the drive off.\"\n\n\"Then keep talking to me,\" Shep said. \"Tell me how many tubes you've got in the pocket.\"\n\n\"All eight. Seven vials and the berry bag, all marked.\"\n\nAnyway, the dry talk did what it was meant to do, keeping his head clear as the trail wound down toward Stake 7. At the cycad stand by 7, the three rust-colored tinkers dropped down out of the blue fronds to see the wren as it glided back down to click onto Kael's left strap. Earlier in the morning he had brushed them off twice. This time he didn't brush them off. One landed on his shoulder beside the wren, cocked its head at the dried brown spot of blood on the gray stone, and started to hum Shep's low note, a hair flat. After a few paces a dry stem snapped out in the east scrub, and the tinkers lifted off his shoulder and flew away.\n\n\"Something's walking parallel in the tall fern to your left,\" Shep said, his voice low. \"A third one, forty yards out in the brush, pacing your steps. Stake 6 is right ahead of you. Three hundred paces to the Hedge. Keep your chin down and don't change your stride.\"\n\nKael walked past the dry grass at Stake 6, then the damp hollow at 5, then 4 and 3. His own morning prints sat in the dirt path and he stepped right in them to save thinking. Ahead of him, the blue flowers folded shut as his shadow crossed them and opened behind it, and he didn't look back once to check.\n\nWhere the stake line met the packed dirt of depot, the Hedge sounded. The Hedge was depot's outer watch line, an unseen ring laid through the ferns a long stone's throw from the tents, and it gave one low soft tone whenever a big body crossed it. He had crossed it, so it sounded for him. Once the tone faded out, he stood planted and waited to see if it would sound a second time for something trailing behind him, and it didn't, which told him nothing at all. The Hedge said when a body came in. It never said when one stopped on the line and waited.\n\n\"It stopped right at the fern line by Stake 2,\" Shep said in his ear. \"You're inside the wire now, Orth. Go give Fenn her leaves.\"\n\nFenn was sitting at the long table under the main shade tarp with the depot slate open. She was a lean, gray-haired woman with a burn scar along one jaw from a reactor repair aboard the Ark, and she never raised her voice because she had never needed to. Her Bodkin lay beside the slate, a slim rod of dark metal as long as her forearm that fired darts without a sound and would only fire for her hand.\n\nHer eyes went to his wrapped arm before she looked at his face.\n\nHe reached back, slid the flat case out of his rack, and set it on the table. He popped the lid and moved the eight tubes out of his hip pocket into its soft beds, one at a time, left-handed, and shut the cover.\n\n\"Put your hand on it,\" Fenn said.\n\nHe laid his bare left palm flat along the seam. The seam knit shut under his hand like wet linen drawing tight, and a line of light ran the length of it and stayed lit. Only his hand could open it now, or hers. The palm that had keyed it went warm, holding a faint tingle that stayed after he lifted it off.\n\n\"How many?\"\n\n\"All eight. Marked.\"\n\nBeside the slate sat the check board, a flat dark glass that showed a number and a color and nothing else and never talked. Fenn tapped it. It showed eight, and green.\n\nShe read his slate, and then she read the second column. She picked up her Bodkin, thumbed one dart out of the grip, checked the point, and seated it back without saying a word about it.\n\n\"It came after you.\"\n\n\"At the last stake. I was six paces out of the frame.\"\n\n\"And you killed it.\"\n\n\"The cuff killed it. I had the ring set to kill.\"\n\n\"Why?\"\n\n\"I honestly don't know.\"\n\nFenn looked at him long enough that he started to wonder if he had answered wrong. Behind her two runners crossed with empty racks and kept their eyes to themselves.\n\n\"The ship got our tranqs out of one dead bird, Orth,\" she said, keeping her voice very low. \"One tinker that broke its neck on a window. You had a whole runner lying dead at your boots, covered in plates our tranqs bounce right off, and you brought me leaves.\"\n\n\"The leaves are what you sent me for,\" Kael said. \"The runner is what happened to me.\"\n\n\"We lost Brandt on the east trail already this week,\" she said, and the burn scar along her jaw turned pale. \"Every big animal out here carries heavy plate that turns a standard dart, and we haven't had a single plate on a bench to see how the seams knit. You had one lying dead in the path.\"\n\n\"I had one working arm, thirty pounds of dead frame on my back, and two more of them calling from the east scrub,\" Kael said. \"By the time I cleared the cycads at Stake 10, a second one was already trotting down the path to tear into the body, and a third one paced me through the fern all the way to the wire. If I had knelt down in that dead patch to pry a scale off its neck, you wouldn't have the runner or the leaves.\"\n\n\"And now it's lying out there for anything that wants it.\"\n\n\"I left it where it fell.\"\n\n\"You're certain.\"\n\nHe tipped his chin at the slate. \"It's written down under where it happened, and left out of the plant column.\"\n\nFenn held his eyes. Then she breathed once through her nose, copied the eight onto the depot slate, and copied the second column underneath it, word for word, in its own place. She pressed her fingertip at the bottom, the way a boss signs for cargo she is carrying now.\n\n\"The Hedge has sounded twice since you walked in,\" she said. \"Nobody goes out till morning. Rack it. Go get that arm looked after. Leave the bar.\"\n\nHe wore a short iron field bar on his belt for setting stakes. He unclipped it and turned it over in his hand. It was clean. There wasn't anything on it except the dry grit of the stake line. He hadn't used it all morning.\n\n\"I'll clean it myself,\" he said.\n\nHe carried the case to the rack under the shade cloth and slid it in, seam out, in the slot where the empty one had sat at dawn. A frayed lace tip on his boot caught on the rack's edge as he turned, and he freed it with two fingers. On the shelf above, Sera's water lots sat in their row with their seams lit. He didn't read them.\n\nHe backed his withy into the wall rack and thumbed the ring. Over three breaths the bands let go, top to bottom, and he stepped forward out of the cups onto the packed dirt wearing nothing except his clothes and the wrapped arm, standing bare under the open sky while the empty frame hung behind him. He had done it a thousand times and never minded it before. Plus, he was inside the wire now. Even so, he minded every single one of those three breaths today, standing bare with his back to the ferns and a frame behind him that could have kept him safe.\n\nHe pulled the berry-stained wrist cuff off the open right brace to scrub in his tent, then laid the field bar in the wash tray at the end of the table. Somebody would wipe it down, and there was nothing on it to wipe. That clean iron bothered him more than blood would have, and he couldn't have explained why.\n\nA plant tech passed him carrying a tray of leaf bags. \"You doing all right?\"\n\n\"Got all eight,\" Kael said.\n\nThe tech glanced at his arm and walked on.\n\n* * *\n\nThe sample tent held one wood table, one narrow cot, and a spare rack. He ducked inside and let the flap fall shut, and the cloth dulled the depot noise to a murmur. When he set his left hand on the table, the rushlight came up in the tent pole and pooled warm gold over his knuckles, the way it did for any working hands, while the rest of the tent stayed dim.\n\nOn the shelf by the rack there was a pale line of dust against the dark wood right where the empty case had sat before dawn. He had noticed that clean spot when he racked the full box, the dry rectangle the case's foot had sheltered from the grit. He left the dust alone.\n\nHe set the wrist cuff and his duplicate slate down on the wood, pulled the stool out with his boot, and sat down. Outside the flap, two knuckles rapped against the upright post.\n\n\"Orth?\" a gentle voice called through the canvas. \"Fenn said you brought back some work for me.\"\n\n\"Come on in, Joss,\" Kael said.\n\nJoss Amari ducked through the flap carrying his canvas med roll under one arm and a jug of cold water in his hand. He was a big, broad-shouldered man who had worked as an infirmary orderly on the Ark, and before he even unrolled his kit on the table, he pulled a fresh linen square out of his pocket, folded it once down the middle, and laid it flat beside the basin.\n\n\"Came down from the Bothy an hour ago for supply draw,\" Joss said, setting the water jug down. \"Thought I was going to get an easy afternoon sorting bandage packs in the shade. Let's have a look at it.\"\n\nKael rested his right elbow on the table and held his forearm up into the gold pool of rushlight. The kit rag he had wound on the trail had dried stiff as bark around the wound, glued into the hair and the torn skin by his own blood.\n\nJoss didn't try to pull it off dry. Plus, he knew better than to hurry field linen that had set in the heat. He uncorked the jug, poured cold water slowly over the knotted cloth until the dark crust softened and turned red again, and worked the knot loose with two blunt fingers. Even soaked, the last turn of cloth had stuck fast in the meat. When Joss eased it up, a hot line of pain ran from Kael's wrist bone straight into his shoulder socket, and Kael locked his jaw hard and stared at the tent pole until the strip came free.\n\nThe inside of his forearm lay open in a single ragged trough from the heel of his hand halfway to the crook of his elbow, where the sharp tip of the runner's beak had slipped past the edge of the metal guard. Down in the red meat, the pale sheath of the main cord showed clear and slick, with two small dark clots clinging to the lower edge and a tiny fleck of purple berry skin washed in near the wrist.\n\nJoss leaned in close, his big hands steady in the warm light. With a pair of blunt tweezers he lifted the speck of berry skin out of the raw flesh and wiped it on his square cloth.\n\n\"Brace took the crush of it,\" Joss murmured. \"Another finger's width inside and that beak would have notched the bone. Give me a slow fist, Kael. One finger at a time.\"\n\nKael curled his thumb in first, then his pointer, then the middle three. Down in the open red trough of his arm, the white cord slid back and forth in its wet groove like a greased cable, smooth and unbroken, pulling the torn edges of muscle slightly with every flex.\n\n\"Hurts like a burn,\" Kael said through his teeth.\n\n\"I expect it does,\" Joss said. \"The cord's whole, though, and that's the part that counts for sure. If the beak had nicked a strand of that, you wouldn't be buttoning your own shirt till winter.\" He poured a steady stream of cold water through the wound, washing the clots and trail grit down into the catch basin on the table, then patted the skin around the gash dry with his folded square. \"What made a wild runner bite at a metal brace? Usually they strip bark and bolt the second a person stands up.\"\n\nKael tipped his chin toward the gray wrist cuff sitting beside the slate. In the grooves around the dart ports, the crushed berries from Stake 10 had baked into a dark purple crust.\n\n\"Crushed a cluster of purple berries at the tenth stake,\" Kael said. \"Got the juice on my fingers and smeared it on the cuff when I locked back in. Told myself I'd wipe it off at the bend, and I didn't. The runner smelled the sweet on my hand while I was kneeling by the boulder at the last stake.\"\n\nJoss glanced at the purple crust on the cuff, then back to the arm. He uncapped a small gray tube of medical glue and laid a cool, clear bead right along the seam of the wound, pinching the torn edges of skin together with his thumb and forefinger in short sections from the elbow down to the wrist. The glue smelled sharp, like vinegar and cold iron, and as it set it pulled the meat tight across the white cord, sealing the air out.\n\n\"You're the second runner this week to walk in with something sweet on his skin that the woods wanted to taste,\" Joss said in a low voice, holding the last inch of skin pinched at the wrist while the clear line hardened. \"Sera came up from the stream a few mornings back with that green water smell on her clothes, and the ferns outside the Bothy leaned right against the stone wall until the Porch vents pulled it off her.\"\n\n\"Did she say what the green was?\" Kael asked.\n\n\"She wrote down what the gauge showed, and left the rest blank,\" Joss said. He picked up a roll of clean white gauze and wrapped it neat and snug over the glued seam, tucking the end in without a pin. As he lowered Kael's arm back to the wood, his eyes dropped to Kael's boots under the stool, laced all the way to the top eyelet and pulled down hard in a double knot.\n\nJoss's hands paused on the canvas med roll for a breath.\n\n\"You're tying them double now,\" Joss said.\n\nKael looked down at his own boots. The frayed lace tip that had caught on the depot rack stuck out half an inch from the tight second knot.\n\n\"Been doing it a few days,\" Kael said, keeping his voice low. \"Didn't really think about it when I sat down on the bench this morning.\"\n\n\"Ade told me twice before he walked down the hill that morning that he'd double knotted his,\" Joss said, tying the cord on his med roll with a slow, even pull. \"Said a loose lace on open ground was how a man twisted an ankle out of reach of his frame. It's a good habit, Kael. Keep tying them that way.\"\n\nHe stood up, tucked the med roll under his arm, and laid a hand briefly on Kael's good left shoulder.\n\n\"Leave that wrap dry till morning, and don't go lifting any full racks with your right hand tonight,\" Joss said. \"The glue holds fine against a pulse, except it'll weep if you strain the cord underneath it.\"\n\n\"Thanks, Joss.\"\n\nThe big orderly nodded once, ducked out through the tent flap, and let the canvas fall shut behind him.\n\nNow the medic had come and gone, and the tent felt smaller once his footsteps faded into the yard. Kael's arm was closed with a line of cool clear glue that pulled the torn edges together and held them set, wrapped clean over the top, and it throbbed in time with his pulse.\n\nHe sat back down on the stool.\n\nHis left palm still felt warm where it had keyed the seal. He rubbed it against his trouser leg. The warmth stayed right where it was, a small even tingle in the center of the palm, and when he rubbed it again it didn't go anywhere. When he pressed the tip of his thumb into the middle of that warm spot, he could feel a faint steady prickle running up the inside of his left wrist, keeping its own time alongside the heavy ache in his right arm.\n\nHis wrist cuff sat on the table where he had unclipped it, with the dried berry juice crusted dark purple in the grooves along the dart ports.\n\nAnyway, he couldn't leave the cuff sitting like that for morning. If the sweet crust stayed in the ports overnight, the smell would still be on the metal when he backed into his frame at dawn. He picked up the stiff brush from his kit and the jug of cold water and scrubbed at the metal with his left hand, pinning the curved gray cuff flat against the wood table under the heel of his bandaged right wrist so it wouldn't slide around. The crust came loose slowly out of the fine grooves around the Kingfisher's eye. He scrubbed until the grooves showed clean gray metal, and kept scrubbing after that, and because his right wrist was pressing down hard to hold the metal in place, he didn't notice the wrap on his arm soaking dark red again until the water in the basin turned pink. He stopped, sat back, and held the arm against his chest until it quit.\n\nThen he poured fresh water, cold from the jug, and rinsed the cuff off, watching the water run pink into the basin and then clear. He didn't save the rinse. He poured it out on the dirt floor by the flap and watched the dark spot soak in.\n\nHe set the clean cuff on the table with the ports facing the wall: one killing dart left, and eight tranqs waiting in a row.\n\nSitting there in the gold light, he thought about the second snap on the rise, and his thumb on the little selector wheel, and the click under it. He tried to find the exact breath where he had made up his mind to switch to killing darts, and he couldn't find it. He remembered the tinkers flying up into the cycad at Stake 7, and he remembered the dry snap in the east brush, and the next thing in his head was looking down at his wrist and seeing the wheel already set on the killing slot. The choice was sitting in there somewhere between the snap and the click, and he couldn't get his thumb on it. He had turned the wheel himself, fine. What scared him was knowing his thumb had figured out the runner was coming before he did, and it hadn't said a word to him about it.\n\nAnd later on, hiding between the cycad trunks at Stake 10 on the walk home, he had had to roll his wrist against his own belly to blind the cuff so it wouldn't fire the second killing dart on its own. Between his own thumb turning the wheel without asking him and the Kingfisher hunting for a throat on its own, he wasn't completely sure anymore who had been carrying whom around that loop.\n\nHis duplicate copy of the slate lay beside the cuff, showing eight under taken and four short lines under happened. Down at the bottom sat a third box, the one Fenn hadn't said a word about. That was the specimen box, where a runner wrote the name of a thing he had brought in to be opened up and learned from. The box sat empty.\n\nIf he had pried one slate-colored plate off that dead runner's neck with his field bar so the ship's mind could look at the moss in the seam, Fenn would have signed that third box and sent it up the ridge on the next lift. And tonight, whatever had called out of the east scrub and followed his blood all the way to Stake 2 wouldn't be standing out at the fern line wondering about him; it would be walking straight into the tents looking for what he had taken.\n\nHonestly, he could have filled that line in with one word, and instead he sat looking at the blank space while the rushlight held warm across his hands, and he didn't touch it.\n\nWhen he took his hands off the table, the rushlight drained out of the tent weave, and the dark came in all at once. He lay back on the cot with his boots still laced on and the double knots pulled tight.\n\nOut past the canvas, up on the shelf a mile off, Shep would be crouched outside the Bothy door with two wrens on his shoulders and the third flying home in the dark. In the fern crowns, the tinkers were singing his hum back to him, low and a hair off pitch, the way they did every night. Kael could hear them faintly, sweet and a bit wrong.\n\nThen the Hedge sounded out at the line, one low tone.\n\nHe lay flat on his back and counted in the dark, the way everybody in camp did, waiting for a second tone that would mean it had turned around and gone back out. The Hedge never gave one. It only ever chimed when something big came in. He counted past a hundred. Then he counted past two hundred.\n\nSo he lay there with his warm palm resting against his chest and let the count go. Somewhere out on the far bend, a dead runner lay across the path with its wattle gone the color of cold ash and a voice calling to it out of the east, while the empty box sat on his slate on the table in the dark, and he left it the way it was and went to sleep.\n"},
    ]},
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
  paintMarks();
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
  wrapPageWords(body, pg);
  paintMarks();
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
/* reader markup: select text, Mark, red underline + note. local first, synced to /api/marks when a key is set. */
const MARKS_KEY='dglxss-archive-marks-v1', MARKS_SYNC='dglxss-archive-marks-key';
(function(){ const m=/^#marks-key=([^&]+)/.exec(location.hash||''); if(m){ try{ localStorage.setItem(MARKS_SYNC, decodeURIComponent(m[1])); }catch(e){} history.replaceState(null,'',location.pathname+'#/'); } })();
let markSel=null, markEditing=null;
function loadMarks(){ try{ const v=JSON.parse(localStorage.getItem(MARKS_KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
function saveMarks(list){ localStorage.setItem(MARKS_KEY, JSON.stringify(list)); syncMarksCount(); }
function marksKey(){ try{ return localStorage.getItem(MARKS_SYNC)||''; }catch(e){ return ''; } }
function liveMarks(){ return loadMarks().filter(m=>{ const b=bookById(m.storyId); return b && liveBook(b) && !isVeiled(b); }); }
function marksApi(method, body, qs){
  const k=marksKey();
  if(!k && method!=='POST') return Promise.resolve(null);
  const headers={'Content-Type':'application/json'};
  if(k) headers.Authorization='Bearer '+k;
  return fetch('/api/marks'+(qs||''), {method:method, headers:headers, body:body?JSON.stringify(body):undefined, cache:'no-store', credentials:'same-origin', keepalive:method==='POST'})
    .then(r=>{ if(!r.ok){ console.warn('marks sync', method, r.status); return null; } return r.json(); })
    .catch(err=>{ console.warn('marks sync', method, err); return null; });
}
function pushUnsynced(){
  const list=loadMarks().filter(m=>!m.synced);
  for(let i=0;i<list.length;i+=40) pushMarks(list.slice(i,i+40));
}
function pushMarks(list){
  return marksApi('POST', {marks:list}).then(r=>{ if(!r) return; const ids=new Set(list.map(m=>m.id)); saveMarks(loadMarks().map(m=>ids.has(m.id)?Object.assign(m,{synced:true}):m)); });
}
function pullMarks(){
  return marksApi('GET').then(r=>{
    if(!r || !Array.isArray(r.marks)) return;
    const remote=new Map(r.marks.map(m=>[m.id,m]));
    const out=[], unsynced=[];
    loadMarks().forEach(m=>{
      const rm=remote.get(m.id);
      if(rm){ out.push(Object.assign({}, (rm.updatedAt||0)>(m.updatedAt||0)?rm:m, {synced:true})); remote.delete(m.id); }
      else if(!m.synced){ out.push(m); unsynced.push(m); }
    });
    remote.forEach(m=>out.push(Object.assign({}, m, {synced:true})));
    saveMarks(out);
    if(unsynced.length) pushMarks(unsynced);
    if(readerBook) paintMarks();
  });
}
function markWordRange(node){
  const el=node && (node.nodeType===1?node:node.parentElement);
  const w=el && el.closest ? el.closest('.w[data-i]') : null;
  return w ? Number(w.dataset.i) : null;
}
function readSelection(){
  const sel=window.getSelection && window.getSelection();
  if(!sel || sel.isCollapsed || !sel.rangeCount || !readerBook) return null;
  const r=sel.getRangeAt(0);
  const host=readMode==='pages'?$('page-body'):(readMode==='scroll'?$('scroll-inner'):null);
  if(!host || !host.contains(r.commonAncestorContainer)) return null;
  let a=markWordRange(r.startContainer), z=markWordRange(r.endContainer);
  const spans=[...host.querySelectorAll('.w[data-i]')].filter(s=>r.intersectsNode(s));
  if(spans.length){ a=Number(spans[0].dataset.i); z=Number(spans[spans.length-1].dataset.i); }
  if(a==null||z==null) return null;
  if(z<a){ const t=a; a=z; z=t; }
  const quote=String(sel.toString()||'').replace(/\s+/g,' ').trim();
  if(!quote) return null;
  return {start:a, end:z, quote:quote};
}
function wordsText(a, z){ const out=[]; for(let i=Math.max(0,a);i<=Math.min(listen.words.length-1,z);i++) out.push(listen.words[i].text); return out.join(' '); }
function contextBefore(a){ let s='', i=a-1; while(i>=0 && s.length<120){ s=listen.words[i].text+(s?' '+s:''); i--; } return s.slice(-120); }
function contextAfter(z){ let s='', i=z+1; while(i<listen.words.length && s.length<120){ s+=(s?' ':'')+listen.words[i].text; i++; } return s.slice(0,120); }
function wrapPageWords(body, pg){
  if(!body || !pg || typeof pg.startWord!=='number') return;
  let i=pg.startWord;
  body.querySelectorAll('p').forEach(p=>{
    const toks=String(p.textContent||'').match(/\S+/g)||[];
    if(!toks.length || i>pg.endWord+1) return;
    if(!listen.words[i] || listen.words[i].text!==toks[0]) return;
    p.innerHTML=toks.map(t=>'<span class="w" data-i="'+(i++)+'">'+escapeHtml(t)+'</span>').join(' ');
  });
}
function paintMarks(){
  const host=readMode==='pages'?$('page-body'):$('scroll-inner');
  [$('page-body'),$('scroll-inner')].forEach(h=>{ if(h) h.querySelectorAll('.w.mk').forEach(n=>{ n.classList.remove('mk','mk-end'); n.removeAttribute('data-mk'); }); });
  if(!readerBook || !host) return;
  loadMarks().filter(m=>m.storyId===readerBook.id && !m.resolved).forEach(m=>{
    for(let i=m.startWord;i<=m.endWord;i++){
      host.querySelectorAll('.w[data-i="'+i+'"]').forEach(n=>{ n.classList.add('mk'); n.dataset.mk=m.id; if(i===m.endWord) n.classList.add('mk-end'); });
    }
  });
}
function syncMarksCount(){
  const b=$('btn-marks'); if(!b) return;
  const n=liveMarks().filter(m=>!m.resolved).length;
  b.textContent=n?('Marks '+n):'Marks';
}
function showMarkPill(on){ const p=$('mark-pill'); if(p) p.hidden=!on; }
function openMarkEditor(m){
  markEditing=m;
  const s=$('mark-sheet'); if(!s) return;
  $('mark-quote').textContent='\u201c'+(m.quote.length>220?m.quote.slice(0,220)+'\u2026':m.quote)+'\u201d';
  $('mark-note').value=m.note||'';
  $('mark-del').hidden=!m.createdAt;
  s.hidden=false;
  showMarkPill(false);
}
function closeMarkEditor(){ const s=$('mark-sheet'); if(s) s.hidden=true; markEditing=null; }
function commitMark(){
  const m=markEditing; if(!m) return;
  m.note=String($('mark-note').value||'').trim().slice(0,600);
  const now=Date.now();
  if(!m.createdAt) m.createdAt=new Date(now).toISOString();
  m.updatedAt=now; m.synced=false;
  const list=loadMarks().filter(x=>x.id!==m.id); list.push(m); saveMarks(list);
  closeMarkEditor();
  try{ window.getSelection().removeAllRanges(); }catch(e){}
  paintMarks(); pushMarks([m]); renderMarksPanel();
}
function deleteMarks(ids){
  const set=new Set(ids);
  saveMarks(loadMarks().filter(m=>!set.has(m.id)));
  if(ids.length) marksApi('DELETE', null, '?ids='+encodeURIComponent(ids.join(',')));
  paintMarks(); renderMarksPanel();
}
function newMarkFromSelection(){
  const sel=markSel || readSelection();
  if(!sel || !readerBook) return;
  const w=listen.words[sel.start]||{};
  openMarkEditor({
    id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    storyId:readerBook.id, storyTitle:readerBook.title||'',
    quote:sel.quote, words:wordsText(sel.start, sel.end),
    before:contextBefore(sel.start), after:contextAfter(sel.end),
    paragraph:w.pi, chapter:w.chapterIndex, startWord:sel.start, endWord:sel.end,
    note:'', resolved:false, createdAt:''
  });
}
function renderMarksPanel(){
  const box=$('marks-list'); if(!box) return;
  const list=liveMarks().sort((a,b)=>String(a.storyId).localeCompare(String(b.storyId))||a.startWord-b.startWord);
  if(!list.length){ box.innerHTML='<p class="marks-empty">No marks. Select text while reading, then Mark.</p>'; }
  else {
    let last='';
    box.innerHTML=list.map(m=>{
      let head='';
      if(m.storyId!==last){ last=m.storyId; const b=bookById(m.storyId); head='<div class="marks-story">'+escapeHtml((b&&b.title)||m.storyId)+'</div>'; }
      const q=m.quote.length>140?m.quote.slice(0,140)+'\u2026':m.quote;
      return head+'<div class="marks-item'+(m.resolved?' is-resolved':'')+'" data-mid="'+escapeHtml(m.id)+'"><button type="button" class="mi-go">\u201c'+escapeHtml(q)+'\u201d'+(m.note?'<span class="mi-note">'+escapeHtml(m.note)+'</span>':'')+'</button><span class="mi-acts"><button type="button" class="mi-res">'+(m.resolved?'reopen':'resolve')+'</button><button type="button" class="mi-del">delete</button></span></div>';
    }).join('');
  }
  const st=$('marks-sync'); if(st) st.textContent=loadMarks().some(m=>!m.synced)?'syncing\u2026':'synced to archive';
}
function mountMarks(){
  const reader=$('reader'); if(!reader) return;
  const pill=document.createElement('button');
  pill.type='button'; pill.id='mark-pill'; pill.className='mark-pill'; pill.hidden=true; pill.textContent='Mark';
  let pillFired=0;
  const keep=e=>{ e.preventDefault(); e.stopPropagation(); markSel=readSelection()||markSel; };
  const fire=e=>{ e.preventDefault(); e.stopPropagation(); if(Date.now()-pillFired<500) return; pillFired=Date.now(); newMarkFromSelection(); };
  pill.addEventListener('pointerdown', keep); pill.addEventListener('mousedown', keep);
  pill.addEventListener('touchstart', keep, {passive:false});
  pill.addEventListener('touchend', fire, {passive:false});
  pill.addEventListener('pointerup', e=>{ if(e.pointerType!=='mouse') fire(e); });
  pill.addEventListener('click', fire);
  reader.appendChild(pill);
  const sheet=document.createElement('div');
  sheet.id='mark-sheet'; sheet.className='mark-sheet'; sheet.hidden=true;
  sheet.innerHTML='<p id="mark-quote" class="mark-quote"></p><textarea id="mark-note" rows="2" maxlength="600" placeholder="note (optional)"></textarea><div class="mark-acts"><button type="button" id="mark-del">delete</button><span></span><button type="button" id="mark-cancel">cancel</button><button type="button" id="mark-save">save</button></div>';
  reader.appendChild(sheet);
  sheet.addEventListener('click', e=>e.stopPropagation());
  $('mark-save').onclick=commitMark;
  $('mark-cancel').onclick=closeMarkEditor;
  $('mark-del').onclick=()=>{ if(markEditing) deleteMarks([markEditing.id]); closeMarkEditor(); };
  const panel=document.createElement('div');
  panel.id='marks-panel'; panel.className='marks-panel'; panel.hidden=true;
  panel.innerHTML='<div class="marks-head"><span>Marks</span><span id="marks-sync" class="marks-sync"></span><button type="button" id="marks-close" aria-label="Close">close</button></div><div id="marks-list" class="marks-list"></div><div class="marks-foot"><button type="button" id="marks-copy">copy marks</button><button type="button" id="marks-clear-res">clear resolved</button><button type="button" id="marks-clear-all">clear all</button></div>';
  reader.appendChild(panel);
  panel.addEventListener('click', e=>{
    e.stopPropagation();
    const item=e.target.closest('.marks-item'); if(!item) return;
    const m=loadMarks().find(x=>x.id===item.dataset.mid); if(!m) return;
    if(e.target.closest('.mi-del')) deleteMarks([m.id]);
    else if(e.target.closest('.mi-res')){ m.resolved=!m.resolved; m.updatedAt=Date.now(); m.synced=false; saveMarks(loadMarks().map(x=>x.id===m.id?m:x)); pushMarks([m]); paintMarks(); renderMarksPanel(); }
    else if(e.target.closest('.mi-go')){
      panel.hidden=true;
      const b=bookById(m.storyId);
      if(readerBook && readerBook.id===m.storyId){ listen.index=m.startWord; if(readMode==='pages'){ pageIndex=pageForWord(m.startWord); renderPages({keepWord:true}); } else if(readMode==='scroll') scrollToWord(m.startWord); }
      else if(b && liveBook(b)){ saveProgress(b.id,{word:m.startWord}); openReader(b); }
    }
  });
  $('marks-close').onclick=()=>{ panel.hidden=true; };
  $('marks-copy').onclick=()=>{
    const txt=JSON.stringify({marks:liveMarks().map(m=>{ const o=Object.assign({},m); delete o.synced; return o; })}, null, 2);
    const done=()=>{ $('marks-copy').textContent='copied'; setTimeout(()=>{ $('marks-copy').textContent='copy marks'; }, 1400); };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, ()=>{ window.prompt('Copy marks', txt); });
    else window.prompt('Copy marks', txt);
  };
  $('marks-clear-res').onclick=()=>{ const ids=loadMarks().filter(m=>m.resolved).map(m=>m.id); if(ids.length) deleteMarks(ids); };
  $('marks-clear-all').onclick=()=>{ const ids=loadMarks().map(m=>m.id); if(ids.length && window.confirm('Clear all marks?')){ saveMarks([]); marksApi('DELETE', null, '?all=1'); paintMarks(); renderMarksPanel(); } };
  const btn=$('btn-marks');
  if(btn) btn.onclick=e=>{ e.stopPropagation(); closeSheets(); panel.hidden=!panel.hidden; if(!panel.hidden){ renderMarksPanel(); pullMarks().then(renderMarksPanel); } };
  let selTimer=0, lastScroll=0;
  document.addEventListener('scroll', ()=>{ lastScroll=Date.now(); }, {capture:true, passive:true});
  document.addEventListener('selectionchange', ()=>{
    clearTimeout(selTimer);
    const s=readSelection();
    if(s){ markSel=s; showMarkPill($('mark-sheet').hidden); return; }
    const check=()=>{
      if(readSelection()) return;
      if(Date.now()-lastScroll<400){ selTimer=setTimeout(check, 300); return; }
      markSel=null; showMarkPill(false);
    };
    selTimer=setTimeout(check, 320);
  });
  ['edge-left','edge-right'].forEach(id=>{
    const ed=$(id); if(!ed) return;
    ed.addEventListener('click', e=>{ if(readSelection() || markSel){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  });
  ['scroll-inner','page-body'].forEach(id=>{
    const h=$(id); if(!h) return;
    h.addEventListener('click', e=>{
      const n=e.target.closest && e.target.closest('.w.mk'); if(!n) return;
      const s=window.getSelection(); if(s && !s.isCollapsed) return;
      const m=loadMarks().find(x=>x.id===n.dataset.mk); if(!m) return;
      e.stopPropagation(); openMarkEditor(m);
    });
  });
  syncMarksCount();
  if(marksKey()) pullMarks(); else pushUnsynced();
  window.addEventListener('online', pushUnsynced);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') pushUnsynced(); });
}
mountMarks();
bootLibrary();
