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
  {id:"qf-first-water", title:"Quantum Frontier: First Water", subtitle:"Sera Holt · water circuit", series:"Quantum Frontier", era:"Prequels", year:2026, type:"Fiction", status:"Manuscript", freeChapterCount:2, reader:"Leo", audio:["/api/audio?book=first-water"], blurb:"Sera Holt on the water circuit. First Quantum Frontier prequel.", epubUrl:"/epub/first-water.epub", cover:{light:"/covers/first-water-withy-light.jpg", dark:"/covers/first-water-withy-dark.jpg", alt:"First Water, a Quantum Frontier prequel, by Douglxss Burley Johnson: an empty withy walking frame on a river gravel bar"}, chapters:[
      {label:"Front Matter", text:"First Water\n\nby\nDouglxss Burley Johnson"},
      {label:"Chapter One", text:"Chapter One\n\nThe sample vial Sera was carrying had already gotten cold in her hand before she even looked at the stream. It was sitting in the cooler of her kit on the way down from the Bothy, which was down a couple hundred steps of dark stone, and it fogged up as soon as she pulled it out into the warm morning air.\n\nShe was a water runner, and every morning she did the same thing. Walk down to the stream, fill five small glass vials up to their marks, and bring them back up the bank so they could be checked for any overnight changes. It was a simple task, really, but out here someone had to walk the route by foot.\n\nThere were about forty of them on the first survey, which had been sent down to check the land out before anyone tried to build a town on it, and all of them had been born on the Ark. That slow ship had been carrying their families through space for generations, which was longer than anyone's grandparents could remember. None of them had ever seen Earth, and they only knew about it from the old stories, so they used those stories to name everything down here because that was all they had.\n\nThe stream was the prettiest thing anyone had found since landing, and people said so a little too fast, the way someone calls a strange dog friendly before the dog has made up its mind about them. The water ran clear over the dark rock, and in the slow places it was glowing. It had a green in it that was bright enough to read by, like a sign over a door at night, and nobody knew yet what was causing it. It was floating in the current in specks that were too small to see one at a time, and it gathered thickest wherever the water slowed down. Tiny blue flies were sitting on the surface of the pools, and whenever her shadow crossed them they flew up all at once and dropped right back onto the exact same spots.\n\nBelow the bar the stream spread out into a wide shallow pool with lily pads floating on it, and a few of them had small white flowers open on top. The light down there came through the ferns soft and pale, with a washed-out blue sky over the gap in the trees, and on a clear morning the whole place looked clean enough to be painted on the wall of a kid's room.\n\nShe had walked down to the gravel bar in her withy, which was a two-legged walking machine that a runner sat up inside of. It stood a good head taller than a man and was painted mostly white and light gray, with tan and orange along the edges, so a search party could pick it out in the ferns. The top of it was a closed pod around the seat, with a thick glass window in front and a panel on top that tipped up on a hinge to let her in and out, and a short antenna stuck up off its left shoulder. Its arms were long and jointed, with gripper hands at the ends that could reach down almost to its knees. The legs were thin and bent backward at the knee like a bird's, and white plating covered the thighs, but down at the knees and ankles the joints were out in the open where anyone could watch the rods and gears working. The feet were wide flat plates that kept it from sinking in the mud. Shut inside the pod, she was hard to get at, and the whole top half could turn all the way around on its hips, so there wasn't a side of her it couldn't face. What the machine gave a runner was a fighting chance to get back up the hill, and that was all it ever promised. The trouble was getting in and out of it.\n\nThe rest of that fighting chance sat on the withy's right arm, just behind the gripper hand, where a cuff of brushed gray metal no thicker than a drinking cup had been mounted. It held ten darts, which were eight tranqs and two killing darts, and she fired them with a trigger under her right thumb on the hand grip inside the pod. She had never fired it at anything except a practice post back up at camp, and she had never told anyone that either, though she figured most of the crew was in the same boat.\n\nUp the bank behind her, the Bothy was sitting on its shelf of stone. It was long and low and pale gray without a seam anyone could find, and from down on the bar it looked like a smooth river boulder the size of a barn. It had been named after the rough stone huts in the old stories, which were the ones left unlocked up on bare hills for travelers who had gotten caught out in bad weather. The Heron, which was their big cargo lifter drone, had set the building down four mornings ago, and by breakfast it already looked like it had been there forever. Its one long window, which they called the Squint, looked dark as wet slate from the outside and clear from the inside, and the green light from the stream was reflecting across the glass.\n\nShe couldn't see Shep from down on the bar, because he was stationed up outside the Bothy on watch, but she could hear him plain enough. He was a fifth-series guard unit, and he hummed one low note whenever he was around people, about the pitch of a big cat purring, so nobody on the crew ever had to wonder where he was standing. That rule had come straight from the ship, and it was older than the landing. Up in the fern crowns above the bank, three or four tinkers were humming the note back to him. They were little rust-colored birds that had been named for the pot menders in the old stories who walked the country roads tapping on kettles. They had Shep's note a hair off, and they never got it right, and they never quit trying. Having them up there made the morning feel a little less lonely.\n\nThe work clock on her wrist was already eating into the cool part of the day, and the survey crew had learned what that meant the hard way. By midday the dark rock threw the sun's heat back up in a hot shimmer, and when the heat came on, the big animals came down to the water to drink. Every runner on the roster knew it, and the ones who had seen those things up close more than once would change the subject whenever someone brought it up at supper.\n\nShe thumbed the release on the hand grip, and the withy knelt. It was a slow job, and a loud one. The knees folded back with a long hiss, the plates on the thighs knocked together, and the whole pod rocked forward and down until the knees were resting on the gravel. Then the top panel tipped up on its hinge with a clack that carried across the water, and the warm air came in over her face. She climbed down over the edge into the shallows, while the machine stayed kneeling behind her on the bar with its canopy up and the seat inside worn to her shape.\n\nThat was the one rule everyone on the water route hated, because nobody took a sample from inside a withy. Even when it was idling, the motor put a fine vibration into the stones and the stream that a person couldn't feel, and the green specks in the water felt it right away and scattered. If a runner dipped a glass with the gripper hands, the vial came up completely clear, with none of the green in it, so the reading would be wrong about what was in the water. Also, the grippers couldn't reach under a hollowed-out bank or hold a small glass tube steady the way bare fingers could. Because of that, every runner had to kneel the machine and climb out for every sample draw. Five times a morning Sera stood out in the cold water with nothing on her but her clothes and her kit bag, while the machine that could have carried her was kneeling a few steps back on the dry stones with its top open.\n\nThe cold water came through her boots right away and soaked into her socks, and once it had gotten into her ankles she quit thinking about it. The current was making a small talking noise in the channel between the banks, and while she was standing there in the run, she caught herself breathing through her mouth so she wouldn't make any noise over the water.\n\nShe waded out to where the current slowed against the bar and dropped to her knees, and the cold water soaked both knees right away. The stream was fed by deep rock springs, so it was still icy even with the sun already warm on her neck, and it gave off a faint sweet smell that stayed in the back of her throat like cut grass that had been left too long in a warm sack.\n\nShe rinsed the mouth of the first tube, filled it up to the line that was scratched into the glass, and twisted the cap down snug. The green came right in with the water, and inside the vial it looked like small specks of light that drifted around when she tipped the glass and then stayed put. She marked the spot with her stone stub, which scratched a fine line straight into the glass where water couldn't wash it off, and then she tucked the vial into the first slot of her kit, where the soft foam padding held it snug.\n\nThe second draw came from under the near bank, where dark silt had built up a soft ledge, and it came up clean without a grain of sand. She marked the glass, put it into its slot, and pressed the kit lid down until it clicked under her thumb.\n\nUp in the ferns above the bank, a heavy body shifted its weight and froze.\n\nSera kept her chin down and didn't turn her head. She had learned that rule from Rook Daley, who was the oldest runner on the roster and always told new people that the dumbest thing a person could do out here was look at a noise, because then the thing making the noise would know it had been heard. Rook said plenty of things. He had also claimed the tree ferns grew thirty feet tall because the air had more oxygen in it, and then he had stood under one for a full minute with his mouth hanging open like a kid at a fair. She pictured Rook's open mouth and kept her eyes fixed on the stream.\n\nThe fresh print she had stepped over on the way in was still sitting at the edge of the bar, where three long toes had been pressed deep into the mud, and each one was the length of her forearm. The bottom of the track looked dark and slick, with water still seeping into it, which meant something had put it there this morning after the dew fell. She looked at it long enough to be sure of that, and then she put her eyes back on her hands.\n\nShe took the third vial from a slack eddy where the current was braiding around a drowned root, and it showed the same green in the same clear water. When she held the tube up to the sun to check the fill mark, the flecks got brighter for a second before dimming back down.\n\nThe fourth draw came out of the deeper run past the bar, where the current tried to twist the glass out of her grip, so she braced her wrist against her other palm, filled the tube, and capped it. A dragonfly the length of her hand was hovering over the water on wet, oily-looking wings, and when it darted off, she realized the birds were gone too.\n\nShe couldn't have said when they had stopped, because a person notices the woods going silent the same way they notice a wall clock has quit ticking, which is a few seconds after it happens. All morning there had been a bird she didn't have a name for yet, which had been calling from the brush like someone tapping a spoon on a pot. Now there was only the stream, her own breath, and the flies on the pools.\n\nRight on top of that, up on the shelf, Shep's hum stopped. It quit clean in the middle of the note, and the valley felt twice as wide without it. Up in the fern crowns the tinkers kept copying his note for a few breaths on their own, singing an all-clear because they didn't know any better, and then the tinkers quit too. Whenever Shep stopped humming, he had his ears turned on something big, and every runner in camp had learned that in their first week.\n\nSera stayed on her knees in the water. The camp joke was that people learned the rules out here by watching someone else break one, and nobody ever laughed at it. The rule for this was plain enough, and every runner knew what to do when the birds stopped. Finish what was in her hands, and walk out steady. A runner didn't bolt, because running was loud, sloshed the tubes, and told every predator watching that she was prey.\n\nShe only had one pocket left, which was a dark hollow under hanging fern where the green was sitting thicker than anywhere else on the bar, thick enough to look like wet paint. It was about ten paces from her withy. She counted nine steps going out, leaving the machine kneeling behind her on the stones with its canopy up and its seat empty and the tranqs in its cuff, seven paces, eight, nine, until the fern fronds closed over her head and hid it from sight.\n\nShe dropped to her knees, let the cold water soak into her legs a second time, and held the last vial under while it filled.\n\nUp on the bank, the heavy body shifted in the brush again, and it was closer in now. She heard the thick stems bend and give way in a slow push, which was the sound of a big animal putting its weight down with care because it had all the time in the world.\n\nShe twisted the cap onto the fifth vial. Her hands stayed rock steady, and she was proud of that later on when she told people about it. She scratched the mark in short strokes, put the tube into its slot in the kit, and ran her thumb across all five tops to count them by feel. All five were there, so she snapped the lid shut.\n\nThen she ducked out from under the fern and walked the nine paces back to her withy at an even pace, holding the kit flat against her belly with her back turned to the brush the whole way. At the bar, she put a boot on the knee plate, climbed up over the edge of the pod, and dropped into the seat.\n\nGetting in took four breaths, and nothing could hurry the motor along. On the first breath the canopy came down over her and latched with one soft click that carried across the water louder than anything she had done all morning. Across the second and third breaths the knees pushed the whole machine back up off the gravel with a long grinding hum, while up in the ferns nothing moved a muscle, which was a lot worse than hearing it walk. On the fourth breath the screen inside lit up, the hand grips warmed under her palms, and the withy took her weight.\n\n\"There,\" she whispered, the way every runner said it.\n\nThen she walked it up the bank at a steady pace, a couple hundred steps up the stone slope toward the tinted glass of the Squint, and she didn't swing the top around to look back once, while the stems behind her didn't move again until she was at the door.\n\n* * *\n\nNobody took a withy indoors, so each runner parked theirs on the shelf beside the door, knelt it, and climbed out, leaving it where the sun could dry it off while they worked inside. Of course, that meant three more breaths every time she came home, with the knees folding and the plates knocking and the canopy tipping up, while the ferns were right at her back. She sat through the count and climbed down, and her withy stayed kneeling on the stone beside two empty ones, white and pale gray in a row along the wall like big birds sitting on eggs.\n\nShep was crouched right beside the door on the bare stone of the shelf, where he stayed on watch day and night. He stood about ten feet tall when he unfolded all the way up, though when he was crouched down he was closer to seven, and he looked like a wide gray block of brushed metal made of flat panels, with a dark stripe down his middle and two more blocks hanging at his sides like a man with his hands in his coat pockets. His name was stenciled down the middle stripe in plain pale letters, SHEP, and underneath it a few amber indicator lights that nobody could read were sitting dark. His two small camera eyes were turned toward the ferns, and he wasn't humming.\n\nThere had only ever been four units like him, which had been built in the Hayward shop on the Ark's machine deck, and the Ark wasn't building new ones. He had never once been inside the Bothy. He could have squeezed through the door if he crouched down, just about, except the whole point of him was to stay outside on the step as the first thing anything coming up the shelf had to get past.\n\nThe door slid down into the sill when she laid her palm flat on it. Behind it was the Porch, which was a scrub room the size of a closet with a second door on the far side, and the outer panel rose shut behind her without a sound. Every runner had to stand in the Porch for about ninety breaths while the vents pulled the sweet smell off their clothes. The green water left that mown-grass sweetness on the skin, and things out here followed it. Sometimes it was whatever was hiding in the ferns, and other times it was the ferns themselves, which turned their fronds toward a person as slowly as a sunflower tracks the sun, though nobody could say why. Fenn made the whole crew count it out, because the one time a runner had skipped it, the ferns around the shelf had bent in toward the Bothy's walls for two straight nights, and something heavy had walked the stone outside after nightfall, tasting the air at the door.\n\nSera was standing in the narrow Porch and counting with the kit held flat in both hands. At forty she heard the ferns outside brush the stone, and at sixty she heard them stop. At ninety the inner panel dropped into the floor, and she stepped into the cool room.\n\nInside, the walls themselves gave off light. The crew called it rushlight, after the rush candles in the old farm kitchens from the stories, and it came up warm and bright wherever hands were working and stayed dim everywhere else. The glow followed her along the stone bench as she walked over, and when she looked through the tinted glass of the Squint, she could see the back of Shep's flat metal head and one shoulder, where he was crouched right outside the window facing the ferns.\n\nJoss Amari was standing at the bench holding the morning slate, which was a thin pale tablet that took a bare fingertip for a pen. He was a big, gentle-voiced man who had worked as an infirmary orderly on the Ark, and he still folded cloths into neat squares whenever he was worried, so right now he was working on a rinse rag.\n\n\"You were down there a good bit,\" he said.\n\n\"All the birds quit on me.\"\n\nHis hands paused. \"Quit how?\"\n\n\"Every one of them stopped, and something big was pushing through the ferns above the bar.\"\n\n\"Did you get a look?\"\n\n\"No way. I kept my eyes down.\"\n\nOut beyond the Squint, the amber lights under Shep's name warmed back up like low coals. His head swung around until his camera eyes found her through the glass, and his low hum started up again, vibrating through the wall.\n\n\"It walked back up the bank,\" Shep said through the grille over the bench that carried his voice in from outside. He had a warm, easy voice, which was the calm voice anyone would want reading to them when they were laid up sick. \"Nothing's on the shelf.\" His eyes stayed on her through the pane for a second. \"You didn't look. Good. Looking is my job, and I'm built a lot better for it.\"\n\n\"Got all five?\" Joss asked.\n\n\"Every one.\" She glanced past him toward the four box bunks that were set into the wall, where three doors stood folded back. \"Where did Ade get to?\"\n\n\"He started down for depot an hour after you.\" Depot was the main camp, which was about a mile down through the ferns where the first lander had come down and where Fenn ran the survey. \"He was going to clip cycad leaves at the bend on his way in. He asked Fenn if Shep could walk with him, and she told him Shep stays with the Bothy.\"\n\n\"So he walked down alone.\"\n\n\"Double knotted, he told me. Told me twice before he stepped out.\" Joss shook his head. \"He'll call on the bead when he hits camp. He always calls.\"\n\nThe water gauge was a square of dark glass that was set flush into the bench, with a sensor pad beside it the size of a thumbprint. It showed a plain number or a zero, which was kept simple on purpose so it could be read at a glance even if a runner had mud or blood on her hands. Sera set the first tube in the cradle and pressed the pad with the soft gray sensor cap on her left knuckle, which was the one that read her pulse at the same time.\n\nThe first count came up zero, and Joss logged it. Vial two read zero, and three did the same, and he wrote each one down in his neat hand.\n\nShe set the fourth in the cradle and pressed. The window stayed flat, ticked up once, and dropped right back, so Joss logged the tick and the drop.\n\nThe fifth held the thick green water from under the fern, and she set it in the cradle and laid her knuckle on the pad.\n\nRight away, the number climbed.\n\nIt went up the way a tide comes in, slow enough to watch, and steady enough that nobody could doubt it would keep rising. It went straight past the morning mark, and then it went past the line on the card where a runner was supposed to stop and call someone, and it stayed there.\n\nSera pulled her knuckle off the pad, and the high number stayed up for three breaths, dropped one tick, and held.\n\n\"Again,\" Joss said, barely above a whisper.\n\nShe pressed again, and the count climbed to the exact same mark and held.\n\nRight there in the cradle, the green in the vial got brighter. She nearly missed it because she was watching the number window, but Joss made a small sound in his throat, and when she looked over, the flecks in vial five had lit up from the inside, glowing bright green the exact way they had shone for a second in the sun down at the bar. Worse than that, they were swimming on their own, and all of them were drifting through the water toward the side of the glass where her knuckle was resting on the pad.\n\nShe pulled her hand back. Inside the glass, the flecks stayed where they were, and then over a slow count of ten, they drifted back out to the middle of the tube and dimmed down. Neither of them said a word, and Joss picked up the rinse rag and laid it back down without folding it.\n\n\"Pass it out here,\" Shep said through the grille, \"before one of you starts naming it.\"\n\nBeside the bench was the pass, which was a double-doored transfer box built into the wall no bigger than a bread loaf, so the outside air never came straight into the room. Sera put vial five inside and shut her door. Through the Squint she watched a panel slide back on one of Shep's side blocks, and a metal hand reached out on a jointed stalk, with four fine fingers opening the outer door and pulling the vial out by its cap. The little green testing port beside his chest stripe opened and closed on the glass, and the amber lights moved slowly, trading places like coals, while the water was tested.\n\n\"One through four are plain water,\" Shep said. \"Same mineral count as yesterday. Hard enough to scale a kettle.\" His amber lights kept moving. \"Five has got more of the green in it than the other four combined, and twice what that spot showed yesterday. Plus, it's made of the same plain stuff you are, a bit of salt, a bit of iron, a bit of sugar. It swam a thumb's width toward your hand in ten breaths and drifted back in ten when you let go.\" The lights held steady. \"I can tell you what it is and how far it moved. I can't tell you why, and I'd look sideways at anybody who claimed they could.\"\n\nThe wall card said to check her own pulse right away whenever the number jumped on a runner's skin, so Sera pressed the gray sensor cap to the base of her left thumb. Her heart was running fast, faster than the climb from the stream accounted for, and the skin there had gotten warm too, warmer than the rest of her hand. When she rubbed her thumb against her finger it prickled a little, like a foot waking up after it goes to sleep.\n\n\"Sera,\" Joss said.\n\n\"Yeah, I saw it.\"\n\n\"They swam right toward your hand.\"\n\n\"I was looking right at it, Joss.\"\n\nHe slid the slate across the stone, and his hands weren't folding the rag now. \"What do I write?\"\n\n\"Write what it did, and leave the rest alone.\"\n\n\"Nothing else?\"\n\n\"Not a word. The second we write a guess, somebody up the ridge reads it as a fact.\"\n\n\"Then what do we call it?\"\n\nThe runners had a camp name for the glow already, which was two words people tossed around the mess tent whenever someone brought back a bright tube. She pulled the slate over and used her fingertip to write the mark that was used on the survey for a green nobody had sorted out yet, and under it she wrote those two words: Ark algae.\n\n\"Done,\" she said.\n\nThe tiny radio bead at her collar clicked, and Fenn's voice came through thin in her ear, with the morning's worry packed down tight in it.\n\n\"Holt. What did the water do?\"\n\nSera kept her eyes on Shep's amber lights outside. \"The fifth draw is thick with the green. The number climbs when I touch the pad, and my pulse runs high with it. Shep tested it outside and got the same.\"\n\n\"The ridge is going to ask me what it means. I can't just send them a number.\" The ridge was the upper camp above depot where the lander came and went from the Ark, and whatever Fenn told the ridge was sent straight up to the ship.\n\n\"It reads on the gauge,\" Sera said. \"That's what I'm putting on the slate.\" She wasn't signing her name to a guess on the permanent log, and the bead hissed in her ear for a breath.\n\n\"Is Brandt up there with you?\" Fenn asked, and Joss's head snapped up.\n\n\"He headed down your way an hour after I went to the stream,\" Sera said. \"He hasn't walked in?\"\n\n\"Not a sign of him.\" There was another hiss, which was longer this time. \"Seal the case and walk it down here. Bring Shep with you, and stay right at his hip the whole way. The east watch spotted something moving in the brush, and I want you off that trail before the heat hits.\"\n\nOutside, the green port opened on Shep's chest, and the metal hand set vial five back in the pass and folded away under its panel, with the green light winking out last. Sera opened her door and pulled the vial out by the cap.\n\nJoss had already pulled down the transport case, which was a stout gray box with five foam slots inside. Sera set vial five in the center slot and packed the other four around it, taking care not to touch five's glass any longer than she had to. Even so, when she set it down, the bright flecks rose slightly toward her warm fingers, and then sank back once she pulled her hand clear. Joss watched that happen and kept his mouth shut.\n\nSera laid the slate inside the lid, closed the box, and pressed her bare palm flat along the seam. The heat and pulse of her hand triggered the lock, so the seam sealed itself shut like wet linen drawing tight, and when she took her palm off, a thin line of light ran the length of it and stayed lit. Only her hand or Fenn's could open the lock now.\n\n\"Everything inside?\" Joss asked.\n\n\"All five, and the middle one is trouble for sure. The case is shut.\"\n\n\"Let me walk down with you.\"\n\n\"Somebody needs to mind the Bothy.\"\n\n\"Shep is the one who minds the Bothy.\"\n\n\"Not this morning.\" She picked up the sealed box. \"Joss. Stay inside with the Bothy.\"\n\nHe looked at her hard enough that she nearly gave in, and then he picked up the rinse rag and went back to folding it into a square.\n\n* * *\n\nOutside, the late-morning glare hit her like a slap. She climbed into her kneeling withy, set the case on her lap, and buckled the seat strap across it so a stumble couldn't knock it loose. It took four breaths, with the canopy clicking shut and the knees grinding the machine back up off the stone, and right beside the door Shep unfolded himself up off the shelf, all ten feet of him, and started humming his note again. \"There,\" she said, and they started down off the shelf together.\n\nThe path to depot ran open through tall ferns and dark stone for most of a mile. Early on it was an easy walk, but in the midday heat it turned into a long baking tunnel with no roof.\n\nShep was walking at her right hand, close enough to touch, swinging his side blocks down ahead of him and leaning on them like fists, then bringing his legs through behind in four steady beats she could feel right in the stone, over and over. A guard unit never ran its battery down on a walk. He had been walking beside someone every day since landing, and he would still be walking beside their grandkids. As they went, he hummed the old nursery song from the ship, which was the one every crew kid on the Ark had heard on the ring deck. Near the end of the second line he went flat in the exact same spot every time, because the old machinist who had taught it to him had sung it flat there and Shep had kept the mistake on purpose.\n\n\"Hum something else, man,\" she told him.\n\n\"No way. You like this one.\"\n\n\"I never said that.\"\n\n\"Your pulse says it. Your heart is a terrible liar.\"\n\nThree smooth gray drones were sitting in shallow cups along the top of his shoulder blocks, each one the size of a walnut and smooth as a river pebble. About a quarter mile down the trail, one popped out of its cup, dropped a hand's width, and glided up over the ferns without a sound, and a second one flew up right behind it.\n\n\"My wrens,\" Shep said, catching her watching them go. \"Two of my three. They spot warm bodies moving in the brush. I'll tell you what they find.\"\n\nIn the old stories, the wren was the smallest bird in the woods and the king of them all, because it hid on the eagle's back and flew the last bit higher on its own. Sera watched the two pale specks vanish over the fronds, with one angling toward the stream and one scouting ahead down the path, while the tinkers in the crowns chased after them in a noisy little cloud.\n\n\"They do that every trip,\" Shep said dryly. \"Honestly, it's the hardest part of the job.\"\n\nWatching the tinkers, Sera thought of the darts in her cuff. Back at the camp fire, Rook Daley told the story of the tranqs the exact same way every time. In the second week after landing, a tinker had flown into the lander's window and broken its neck, and the ship's computer had asked for the body to be sent up, the way it asked for everything. Deep in that little bird's nerves it had found millions of tiny channels that open to let salt water through and calm a nerve down. People have them too, and every sleeping medicine anyone ever brewed worked by leaning on those channels. Except the tinker's gates had a keyhole that none of the ship's books had ever shown, which was one particular shape on the outside of the channel. After that, a fish, a burrowing bug, and a striped hunter from the river crossing were brought in, and all of them carried that exact same keyhole, down to the last turn. Creatures that had branched off longer ago than there had been mountains on this world had never let that shape wear down. A key was built by the camp techs and the ship's computer to fit it, and that was the tranq. It propped the channels open, shutting the nerves down so the animal went down breathing slow with its heart still beating, and it worked on nearly everything here. Rook always paused there to let the fire pop, and then he said the part nobody liked. Back on the Ark, he said, if a person found the same mark stamped into every bowl in a house, they knew one pair of hands had turned them all on a single wheel. Nobody ever asked him who he figured had sat at the wheel, and he never offered. The big predators had learned to keep their skin covered, growing heavy plates that bounced a dart off the way a stone wall turns a pebble. Plates have to hinge where a body bends, though, so every big animal had somewhere soft and thin where the blood ran close, like the crease behind the jaw, the hollow under a foreleg, or the wet corner of an eye. \"Either you find the soft place,\" Rook always finished, \"or you don't walk home, and somebody else sits here telling this story about you.\"\n\nRight then, her withy whined. She had swung the top half around to watch the wrens go, the same way she would have turned her head, and the turn made a high singing sound from the gears down in its hips. Up at the Bothy she had never noticed it, but out here, with the birds gone scarce, she heard it plain as day, and it was loud enough to carry halfway to the water. Every big hunter out here tracked by ear, and the whole crew knew that.\n\nShe swung it back to face the trail, slow, and it sang the whole way around. Then she reached down beside the seat and flipped the switch that locked the top half facing forward.\n\nFrom then on, if she wanted to see anything to the side or behind her, she had to look at the screen instead of turning. It was a square of glass under the canopy window that showed what the small cameras on the pod could see, front and back and both sides, in four little boxes. Her neck kept wanting to turn and couldn't do her any good. The case on her lap pressed into her belly at every step, and the seat strap found the worn spot on her shoulder right away, digging into the same bone her kit strap found every morning.\n\n\"Smart move,\" Shep said, low. \"Hard way to drive, though.\"\n\n\"I know it's hard.\"\n\nWith the canopy shut and the warm air sitting around her, she could smell her own rig coming in through the vent, sour and stale. Wound around the base of the antenna on the left shoulder was a band of gray waxed cord the crew called the Rue, after the bitter herb people in the old stories hung over their doors to keep off sickness and pests. It was boiled down from the fat of animals the crew had already had to kill, so it smelled like meat that had been dead a week. Rook said every animal on this world died smelling the same, and the ones that were alive stepped wide around it. He had once seen tracks in the morning dew bend in a ring around a dead hunter out on the flat, where something big had walked wide during the night rather than touch the body. Usually things out here gave the Rue that same room, but the animals drawn in by the sweet smell from the stream didn't care about the Rue at all, and they walked straight through it to get to the sweet.\n\nFern fronds the size of barn doors dragged across the canopy, leaving wet streaks on the glass that dried in the heat before the next bend. On every rise the withy leaned forward to climb, the case shoved into her belly, and the strap bit into her shoulder until the skin went hot and then numb, which promised a worse ache tonight.\n\nIn the bottom of the notch, the track crossed the trail again. It was the same three-toed print, fresher than the one at the bar, with water still pooling in the mud and a thick fern stalk bent flat across it, where green sap was still beading at the break.\n\n\"Laid down right ahead of us,\" Shep said, dropping the song back to the plain hum, and Sera stepped over the print.\n\n\"My wren by the stream sees something,\" Shep told her. \"Big. Warm. Walking slow toward the water.\" He paused a second. \"It's dropping down under the ferns for a look.\"\n\n\"Call it back.\"\n\n\"Too late, it's already in. I built them braver than I meant to.\"\n\nThey walked on, and she counted her paces. At about forty paces Shep stopped humming for one breath and started up again.\n\n\"What happened?\"\n\n\"The wren quit,\" he said. \"The last thing it showed me was a bright stripe of green moving in the shade, and then nothing.\" The amber lights under his name had gone low and dark. \"It's lying in there somewhere, and it isn't flying back.\"\n\nThat left two wrens, with one scouting ahead over the path and one sitting in his shoulder cup.\n\nAbout twenty paces farther on, she smelled it. It was sweet first, like that mown-grass sweetness from the stream, only thicker, and it was layered over a second smell she remembered from the meat deck on the Ark when she was a girl, warm and coppery and close. It coated the back of her throat on the first breath, and she planted her feet.\n\nAhead of them the trail bent left around a stand of cycads, which were the squat old trees that grew along the stream, with fat trunks scaled like pinecones under stiff dark-blue fronds. Under those thick crowns the light was green and dim. The smell was coming out of that shade, and so were the flies, making a low thick buzz under Shep's hum that sounded like a lot of flies gathered in one spot doing one job.\n\n\"I can't see well in that shade,\" Shep said, his voice low. \"Everything under those leaves sits at the same warmth, so the wren is no good to me in there either.\" He called the last wren down from the glare, and the gray drone dropped in and clicked into his shoulder socket. \"My ears work better than my eyes in the brush anyway. I'm listening.\"\n\n\"Can we walk wide around the trees?\"\n\n\"Off the trail is where the tracks go.\"\n\nThe rule said to finish what was in her hands and walk out, and depot lay right past the cycads, so Sera walked the withy into the green shade.\n\nThe first thing she spotted was Ade's withy. It was kneeling in the middle of the trail with its canopy tipped up and its long arms resting on the dirt, and there wasn't a scratch or a smear on the white plating. The cargo cradle under the pod, which had been built for a flora box to slide into like a drawer, stood open and empty. It looked like a man had climbed out to stretch his legs and would be back in a minute, and on the screen inside the open pod, the tiny green ready light was still lit, where it had been waiting for him all morning.\n\nThree steps away lay his flora box, which was tipped on its side in the dirt with its seam still glowing faint where his palm had sealed it, and beside it lay a neat bundle of cycad leaves tied up with plant cord. Ade had climbed out of his withy to clip his leaves, the exact way every runner had to. Kneel the machine, climb down, tie the bundle, seal the box, and turn back toward the open pod with the case in both hands to slide it into the cradle. The kneel was the loudest thing a withy did, and anything in those ferns had heard him do it. He had both hands full and his back to the brush when it came out.\n\nThen she saw his boot.\n\nIt was standing upright by itself in the dirt between the dropped case and the kneeling machine. The leather was laced to the top and double knotted, the way Ade Brandt had always laced his boots, because Ade had a deep dread of a loose lace on open ground and had told everyone in camp about it at least once. The boot was standing up straight because it wasn't empty. Her eyes went to the top of the leather before she could stop them, where she saw clean white bone, a ragged red collar of meat, and one blue fly walking across it. She allowed herself that one look, and then she put her eyes back on the knots and kept them there.\n\nThere wasn't anything else of Ade on the trail. A wide drag mark had been pressed deep into the dirt and went off into the tall ferns, about the width of a cargo cart and dark wet in places, where several thick fern stems had been snapped off clean higher than a man could reach.\n\n\"He asked me to walk down with him,\" Shep said, his voice low. \"I was told to stay with the Bothy.\"\n\nShe didn't answer him.\n\n\"I would have heard it coming,\" Shep said, and then he stopped talking.\n\nHis hum quit at her right shoulder, the amber lights under his name went dark in one breath, and his metal fists stopped on the stone. Without the hum, the shaded bend was so empty of sound that her ears rang, and right then, she heard the breathing.\n\nIt was coming from the deep ferns to her right, very close, and the sound came in through the vent so huge that she didn't know what it was for a second. It was a long, slow pull of air from a massive chest, like wind drawing into a cave, followed by a pause, and then it pushed out again. The pod kept its air cool, so the glass was cool too, and on the right side of the canopy the warm breath fogged the glass from outside. The fog faded from the edges in, and then the next breath came and fogged it over again. Through the vent it smelled of copper and the sweet stream water at the same time.\n\nShe didn't move a muscle, but Shep did. He stepped straight in front of her, moving slow on two fists and two feet, and unfolded up to his full ten-foot height between her and the ferns, making a solid wall of brushed gray metal with nothing in it except his own body. That was all the cover he had to give her, and on the screen she could still see the ferns past his sides and between his legs, but he covered her front and stayed put.\n\n\"Off to your right,\" he murmured, barely audible. \"It isn't moving.\"\n\nThe ferns on her right were thick and green, wet at the tips from the morning damp and bright in the sun, and a massive shape was standing behind them. She couldn't see it through the fogged glass on that side, so she watched it on the screen instead. The screen showed pieces of it through the fronds, a patch of dark, pebbled hide between two stems, shining wet and plated like the trunks of the cycads, and running along it was a stripe of the same bright green as the stream water. That green line rose and fell slowly when it breathed, and the fog on her glass came and went with it.\n\nIt was looking right at her, and she knew it the way a person knows someone is watching them across a crowded room. The screen didn't show an eye anywhere in the brush, and she didn't need it to.\n\n\"Holt,\" Shep said, his voice kind and unhurried, the way a good medic tells someone the worst. \"I need a hand.\"\n\nHe had the hardware to kill it. Under his chest panels he was carrying the Misericorde, which had been named for the thin dagger from the old stories that found the gaps in a knight's plate, and if he drove it into the soft place the animal would be dead before it hit the ground. Except he couldn't kill alone, because that was the oldest law on the Ark, older than the hum. A living person had to lay a bare hand on his hull and say the old archers' word, loose, out loud, so the person who said it would carry the killing afterward, and a machine never got to decide a death by itself.\n\nShe was shut inside the pod. To lay a bare hand on his hull she would have to kneel the withy and climb out, and the kneel was the slowest and loudest thing the machine knew how to do, with the big one breathing on her glass from a few steps off. So she stayed in the seat. Later on she would tell people that she made a choice, though while she was sitting there in the shade, she didn't know if she was choosing or frozen.\n\nEven if she had turned to face it, her cuff wouldn't have done much good here. The two killing darts were for the days when something had to die fast, and the cuff aimed those two itself. The crew called that targeting setup the Kingfisher, after the bird in the stories that sits on a branch over the water and waits for a fish to show. A small sensor in the cuff read an animal's body heat and pulse, and it would never waste a killing dart against heavy plate. It held its fire until a soft gap showed, the way a good hunter waits for a clean shot instead of shooting into brush, and behind those fronds, nothing was showing except solid plate.\n\nThe huge breath came again, pulling in, pausing, and pushing out slow and patient, which was the breathing of something that knew she had nowhere to run.\n\nHer hands were clamped on the grips, even though the top half was locked and couldn't have turned anyway, and her forearms started to shake, with a fine tremor starting in her elbows. She didn't dare loosen up, because the pod was small and every shift in the seat made the frame creak. She sat planted with the case pressed against her belly while her arms shook and sweat ran down from her hairline into her eye and stung there from the salt.\n\nThe animal was in no hurry at all, which was the worst part of it, and she told it that way every time. It simply stood there in the ferns, breathing slow, looking over the gray block in the path and the white pod behind him with her sitting in it, the way someone stands at a market stall looking over a melon they aren't sure they want.\n\n\"Two hearts,\" Shep whispered, barely audible, because his sensors could pick up a heart beating through a wall of fern, and he was counting them. At first she figured he meant the animal and her, though later she wondered if he had been counting something inside the case on her lap.\n\n\"Three,\" Shep said.\n\nHer mind went straight to vial five. She didn't try to think of it, because the picture popped into her head on its own, showing the bright flecks in five lighting up and drifting toward her knuckle on the bench pad. The case was strapped against her belly, with five sitting a hand's width under her own heart, and as she thought about it, the green line on the animal's hide seemed to get brighter on the screen. Or maybe she imagined that, and she would never really know which one it was, which bothered her longer than almost anything else about the day.\n\nA blue fly landed on the outside of the glass right in front of her eyes, and she let it walk.\n\nFar down the trail at depot, the Hedge sounded, which was the watch line around camp giving off one low soft tone. It made that tone whenever a big body crossed the boundary. Depot was sitting right down there, barely a quarter mile off, maybe four hundred paces away, and she could see it clear in her head, with the pale tents, the shade cloth over the rack, and Fenn sitting at the long table.\n\nIn the ferns, the breath pulled in and held. It held longer than before, and all around the bend, the ferns leaned in slightly, with every frond curving at once toward the withy's left side where Shep wasn't standing. They were being drawn toward the sweet smell that was still on her clothes from the stream and leaking out through the vent, and the sour Rue cord on the antenna didn't slow them down at all. She checked the left box on the screen, and it showed nothing but ferns leaning, so she believed it. Shep turned to block that side, bringing a metal fist down, except he was half a breath late. A wave of warm air rolled in through the vent with a smell so thick she tasted it on her tongue, sweet and heavy, and when her head started to swim, she clamped down harder on the grips.\n\n\"I'm going to send your heartbeat down the path,\" Shep said calmly. \"Try not to miss it.\"\n\nA small hatch opened low under his chest and dropped a lure on a thin tether line, a soft dark lump the size of a fist that landed in the dirt beside the withy's flat foot. Right away the small pump inside it started to beat in the dirt: thump, thump, a little pause, thump, thump. It had been set to match her own heart beating a little fast, because the whole trick with the lure was giving this world a warm heart to follow that wasn't hers, and Shep paid the line out steady along the dirt, sending it sliding away toward the stream side of the bend.\n\nUp in the cycad crowns, a single tinker picked up the rhythm, and then about ten of them joined in, until the whole flock was tapping it back from every frond in the bend, like a hundred small false hearts beating in the trees, while down in the ferns the big animal turned to follow the one on the line.\n\nThe bright stripe of green slid sideways behind the brush. She watched it on the screen as it moved past Shep's side, low to the dirt, a long plated bulk gliding behind the fronds while the green line on its flank got brighter with each false beat. It didn't hurry, and it tracked after the lure the exact same way it had stood over her, like it knew what it was following and liked it fine.\n\nThen the ferns on her left tore apart.\n\nA younger animal about the size of a mule came out of the brush low and fast, covered in the same pebbled plates and green stripe, charging straight at her across the open dirt with its jaws already wide. Caught on one of its teeth was a scrap of plaid cloth from Ade's shirt, which was the shirt he had worn since landing.\n\nSera flipped the lock off and swung the top half around to the left. It whined the whole way, high and loud, and the cuff arm came around with it, and she fired before the turn had even finished. The first tranq went out with a soft pop of compressed air, like someone spitting a seed, and it smacked the heavy plate over the animal's eye and skipped off into the ferns. A tranq only worked once it got into the blood, and a dart bouncing off plate did nothing at all except make an animal angry.\n\nBeside her, Shep turned the Undertow on it, which was a tight beam of sound pitched too low for a person to hear, aimed straight into the animal's inner ear to scramble whatever told its body which way was down. She felt the vibration of the low sound waves come through the pod and right into her teeth, and out on the path the young one's legs lost track of where the ground was. It staggered sideways, swinging its head to find its footing, and for one clear breath she saw the side of its neck behind the jaw, where the plates stopped and a fold of pale, wet skin showed, pulsing.\n\nShe fired two tranqs straight into it.\n\nThe young one took three more choppy steps. On the second step its hind legs went loose underneath it as the sedative hit its nerves, and on the third it dropped onto its chest in the dirt a body's length from the withy's feet, slid about a foot, and stopped. Its breath came out long and rough, pulled back in slow, and let out again, and then it was asleep, with its heavy jaw lying slack on the path while the scrap of plaid on its tooth moved a little every time it breathed.\n\n\"Holt,\" Shep said at her shoulder. \"Your hand, and the word. It'd be done.\"\n\nShe looked down at the open jaw, and then she looked at Ade's boot. The crew believed a killing called more of them in, though nobody had proved it on paper. Still, one of the four machines like Shep had killed a striped hunter at the river crossing in the first month, and that night the whole river had lit up bright green. In the morning that machine had been found lying out in the river, shut down, with the water running through its chest, and that was why the survey only had three of them left.\n\n\"No,\" she said.\n\nShe laid her left palm flat on the water case in her lap. Shep reeled the lure line back in, and the lump came sliding up the path out of the leaf litter, still beating until it reached his foot and clicked off. When it slid past the withy's foot it was warm and wet with a smear of bright green from the brush, which was the exact same green as the stream water and the stripe on the hide, and then the hatch clicked shut over it.\n\nOff toward the stream the heavy fern stems gave way, one after another. The footsteps were slow and heavy, with each foot coming down on the bank so the ground carried the thud to her up through the seat, then another step, and another, getting a little softer each time. She stood planted and counted them until she couldn't feel them anymore, and then she counted to about a hundred past that, because she didn't trust the woods yet.\n\n\"Gone back down to the water,\" Shep said. The amber glow came back into the lights under his name, and then his hum started back up, and up in the cycad crowns a few breaths later, a tinker started humming it too.\n\nThen she walked. She walked the withy past the sleeping animal, close enough to hear the air moving in and out of its nose through the vent, and she walked past Ade's double-knotted boot. She walked past his empty withy, which was kneeling spotless in the path with its canopy up and its little green light on, and past his flora case lying in the dirt, where the seam was still glowing faint for a hand that wasn't coming back. She didn't stop to pick it up. Later on, she thought about leaving that box behind more than she thought about almost anything else, because it was sitting right there and camp would want what was inside it, except picking it up meant kneeling and climbing out in that bend, and she wasn't going to do that.\n\nThe cycads opened out ahead, where the light went from dim green shade to bright sun all at once, and the heat hit her face like an oven door swinging open.\n\nShe walked the four hundred paces to depot with the top half locked forward, her forearms shaking and her left palm flat on the seam with that sweet grass taste still in her throat, while Shep hummed beside her the whole way. She didn't hurry, because hurrying would jar the vials. Somewhere in the bend a tiny snail shell had gotten stuck on the outside of the canopy glass, whole and striped pink, and it sat right in front of her eyes the whole way in, so she watched it instead of the screen.\n\n* * *\n\nDepot was a wide ring of pale tents and shade cloths that had been set out on the flat. As she was crossing the packed dirt apron before the long table, she slowed the withy down so the case wouldn't jostle, and another runner took one look at her face through the glass and stepped out of her way without asking a thing. At the edge of the shade tarp she knelt it, and the hiss and the knocking plates sounded strange and loud in a place full of people, and she climbed down with the case in both arms.\n\nFenn was waiting at the long table under the main shade tarp with the depot slate open. She was a lean, gray-haired woman who had a burn scar along one jaw from a reactor job aboard the Ark, and she never raised her voice with the crew because she had never needed to. Beside the slate lay her Bodkin, which was a slim rod of dark metal as long as her forearm, named for the needle-pointed arrowhead in the stories made to slip through chain mail. It fired both tranqs and killing darts using compressed air without a sound, and its grip was keyed to fire only for her hand. On this world a loud gun brought ten more animals running out of the brush for every one it killed.\n\nSera set the locked box on the wood table and kept her hand on the lit seam.\n\n\"Let me see the seal,\" Fenn said.\n\nSera angled the box so the unbroken line of light showed clear, and Fenn ran a finger down the seam, then raised her eyes to Sera's face and stopped.\n\n\"What happened on the trail?\"\n\n\"Ade is back at the cycad bend,\" Sera said. \"His laced boot is sitting in the dirt, along with his kneeling withy with the canopy open and his sealed flora box. The rest of him is gone.\"\n\nFenn picked up her Bodkin, thumbed the top dart out of the grip to check the needle, and clicked it back into place. One.\n\n\"Gone where?\"\n\n\"Dragged off into the deep ferns toward the stream.\"\n\n\"You saw the animal.\"\n\n\"Two of them. A big one stood in the ferns and breathed right on us. Shep dropped a heartbeat lure on a line and drew it off toward the water.\" Fenn's thumb kept checking darts. Three. Four. \"Then a young one rushed me from the left. I put two tranqs in the soft crease behind its jaw. We left it sleeping in the bend.\"\n\n\"Sleeping.\" Five. Six. \"And Shep didn't kill anything?\"\n\n\"Nobody laid a hand on me,\" Shep said calmly from behind her.\n\nFenn looked straight at Sera, and Sera held her eyes, while neither of them added a word to that.\n\nFenn called Ade's name over her shoulder, and runners were already moving, climbing into their kneeling withies along the shade rack with the canopies coming down one after another, \"There,\" \"There,\" \"There,\" while other hands passed the rifle-length Bodkins up from the heavy rack into the gripper hands. Someone near the tents was shouting for the east watch, and the clatter of boots and the grinding of knees rose up around the table while Fenn stayed sitting right where she was.\n\n\"Did it mark you?\"\n\n\"No.\"\n\n\"Your arms are shaking.\"\n\n\"I walked the mile in with the top half locked so it wouldn't turn. It whines when it turns.\"\n\nFenn studied her a breath longer. Nine. Ten. \"And the water?\"\n\n\"The fifth tube lit up in the cradle and the green swam toward my knuckle. Joss watched it happen, and Shep tested it outside. It's logged on the slate in the lid.\"\n\nFenn's eyes came back up. \"Swam toward you.\"\n\n\"Right toward my finger on the pad, and drifted back when I let go.\"\n\n\"Did you write down why?\"\n\n\"Not a word.\"\n\nThe search party filed out past the table in their withies, carrying the long Bodkins in the gripper hands, and one man called Ade's name out loud once before shutting his mouth. Eleven. Twelve. Fenn laid her short Bodkin flat on the wood.\n\n\"Holt,\" she said, keeping her voice very low. \"A runner is dead on that path, and you're standing here telling me the water reaches for our hands. Tell me what that means.\"\n\n\"It reads on the gauge,\" Sera said. \"Five vials in the box, and the middle one swam toward me. That's what I've got for sure.\"\n\n\"A raw number isn't enough.\"\n\n\"I know it isn't. It's still all we actually saw, and if I write a guess on top of it, the ridge will build a whole plan on my guess.\"\n\nFenn held her gaze, and the burn scar on her jaw had gone pale. \"You're certain.\"\n\nSera tipped her chin at the gray box. \"The number stayed up. I wrote it down plain. And the case is sealed.\"\n\nFenn pulled the box across and slid it into the rack under the shade tarp with the seam facing out, so the lock could be checked by the next watch without opening it. She copied Sera's numbers onto the depot slate, left one blank line underneath, and pressed her fingertip at the bottom, signing for cargo that was her problem now.\n\nDown the steep trail from the Bothy, a white withy came walking onto the flat with a stretcher pole held across its gripper hands, picking its steps with care the way someone leads a nervous horse. It was Joss, who had locked up the Bothy and come down. He halted at the edge of the shade tarp, and the withy knelt with its long hiss and tipped its canopy up, and he climbed down and took the pole onto his shoulder, a length of pale ash from the Ark's tree deck with its canvas sling rolled tight. His empty withy stayed kneeling behind him, and on its right arm, the cuff showed a clean empty hole where the darts belonged. Joss had asked to have them pulled out in his first week on the ground, because after years as an infirmary orderly, he said he had already carried enough people who had been hurt by someone else. He had left the Nettle wired in, though. It was built into the white plating on the legs and arms of every withy, and it sent a sharp jolt of electric current that burned like a nettle sting through any jaw that clamped down on the machine, teaching the same fast lesson an electric fence teaches a cow. It never fired until jaws were already closed on the metal, and Joss kept it because it only ever stung something that was biting him first. There was no Rue cord tied on his antenna either, because he wouldn't touch the stuff and said rendered fat felt like wearing someone.\n\nFenn pulled a second short Bodkin out from under the table and held it across to him, grip first.\n\n\"The lock knows your hand,\" she said. \"I keyed it at dawn.\"\n\nJoss looked down at the rod for about as long as Sera had looked at Ade's boot, and then he set the butt end of the ash pole in the dirt beside his foot and kept both hands wrapped on the wood, so Fenn slid the Bodkin back under the table.\n\n\"Shep,\" she said. \"Walk out with Amari. Stay right on his shoulder.\"\n\n\"The Bothy is sitting empty,\" Shep said.\n\n\"I know right where the Bothy is.\"\n\nShep stayed crouched one breath longer than usual. \"I'll bring him back,\" he said, his voice low. \"Whatever is left.\"\n\nJoss climbed back into his kneeling withy and waited through the click of the canopy and the long grind of the knees pushing him back up. \"There,\" he muttered, so low she barely caught it. Then he took the ash pole across the gripper hands and walked out after the runners, while Shep unfolded his legs and walked over to his side, humming his note. Everyone at the table knew Joss wouldn't speak the killing word, but Fenn sent Shep with him because the one man in camp who wouldn't touch a weapon was also the only medic who knew how to pick up what was left of Ade properly, and Shep could tuck his legs up and fly the stretcher the whole mile back.\n\n\"Go get some water,\" Fenn told Sera. \"Get off your feet and stay off that east path. I'll come find you.\"\n\nSera turned and walked along the outer edge of depot toward the sample tent. Over near the mess tent behind her, someone was crying hard, with that rough ugly crying that is mostly gasping for breath, and she kept her eyes ahead. The worn groove over her collarbone was still hot from the seat strap, so she rolled her shoulder once and left it alone.\n\nA young plant tech off the last lander passed her carrying a tray of leaf bags, and he hadn't heard the news yet. \"Water running clean today?\" the tech asked.\n\n\"Had one bad tube,\" Sera said. \"I wrote it down.\"\n\nThe tech nodded and went on. Sera reached the sample tent, put her hand on the flap, and stood there for one breath in the camp noise, where she could still hear Shep moving away on the east path with Joss and the runners, his old nursery song getting smaller in the brush and going flat in its one spot.\n\n* * *\n\nThe sample tent held one work table, one narrow cot, and a spare rack that was braced against the back wall. The cloth carried rushlight right in its weave the way the Bothy walls did, pale and even. She knelt her withy outside and climbed out for the last time that day, and then she ducked inside and let the flap fall shut, and the heavy canvas muffled the depot noise down to a low murmur.\n\nThrough the gap at the edge of the flap she could see the withy kneeling on the packed dirt with its canopy up, its empty seat holding her shape.\n\nShe laid her stone marker on the wood table beside her own copy of the slate, which was the duplicate that matched the one sealed in the case. A dry leaf had gotten stuck to the corner of it, curled from the heat, and she brushed it off onto the dirt floor.\n\nThere was one blank line on her copy with nothing written on it, right under the camp name and the numbers, which was the line where a runner wrote down why.\n\nShe sat down on the camp stool. Her forearms had stopped shaking on the walk over, and now they started up again, worse than before, so she pressed both hands flat on the table until they quit. It took a few minutes, and she let it take as long as it needed.\n\nBehind her eyes she could still see the gauge number climbing, and she could see the green flecks drifting through the water toward her knuckle. She could see the bright stripe of green gliding after the beating lure on the string just as easily as it would have come after her, and the young one's slack jaw lying open on the path, with the torn scrap of Ade's plaid shirt moving on its tooth with every breath.\n\nShe didn't try to put those things together, and she didn't write a word in the margin either. She sat with them laid out separate in her head, the glass vial and the plated hide and the beating lure, keeping them apart on purpose the way a sensible person keeps two strange dogs apart until she knows what they'll do. If she put them side by side she would have to write something on the why line, and she wasn't going to.\n\nShe looked down at the base of her left thumb, right where she had pressed the gray sensor cap after testing vial five. The skin there had turned pink in a small round patch the size of a coin, and it had gotten warm and slightly raised. It didn't hurt at all, but when she pressed it with her other thumb it tingled, faint and steady, and the tingle ran a little way up the inside of her wrist and stopped.\n\nShe sat looking at that spot until the light outside the tent turned orange as the sun went down, and then she pulled her sleeve down over it.\n\nOutside on the path, heavy boots paused by her tent and walked on when nobody answered, and much later the runners came back in. She heard them pass, with the slow tread of people carrying weight and the low hum of Shep flying just off the ground with the stretcher slung between them, his legs tucked up under his body block, and Joss's soft voice saying, \"Careful, careful,\" the exact way he must have said it a thousand times in the ship's infirmary. As they passed the tent, someone said the young plated animal was already gone from the bend, because it had woken up and walked off on its own legs. All they found was the long mark in the dirt where it had been sleeping, leading off toward the water, and she didn't hear a thing from that way until long after nightfall.\n\nShe stayed inside, and before turning in, she lined the stone marker up parallel with the edge of the slate, leaving the tool neat where first light would find it.\n\nThe sample vial that had started out cold in her hand at dawn was locked in a gray case in the depot rack now, sealed under Fenn's fingertip. The green in that glass would read the exact same number in the morning, and out at the cycad bend in the night, Ade's empty withy was still kneeling in the path with its canopy up and its little green ready light on, waiting.\n\nShe laid her palm flat on the tent wall until the rushlight drained out of the weave, so the tent went dark all at once, and she lay back on the cot with her boots still laced on.\n\nOut in the ferns the Hedge sounded with one low tone. It chimed whenever a big body crossed inward and never made a sound when the body left. She lay flat on her back and counted her breaths, and much later in the night, it sounded once more.\n\nShep came by last of all. She heard him hum past her tent, moving slow, and stop at the edge of depot facing the east path, where he would stand watch all night because he chose to. Through the canvas weave she could make out the amber lights under his name, glowing low and even, and his camera eyes were turned toward her tent. Two wrens were sitting on his shoulders, while the third socket stood empty.\n\nIn the unlit tent her left thumb stayed warm, and the small patch underneath tingled as steady as a pulse. Out past the Hedge line, the tinkers in the trees were copying Shep's hum, low and a hair off pitch, the way they always did. Then one bird stopped humming and started tapping its beak instead, going thump, thump, a little pause, thump, thump, like a heart beating a little fast, and she knew whose heart it had learned.\n\nSo she lay there on the cot in the night and listened to the bird keep her time, while the line where a runner wrote why stayed empty where she had left it."}
    ]},
  {id:"qf-perimeter-sample", title:"Quantum Frontier: Perimeter Sample", subtitle:"Kael Orth · perimeter circuit", series:"Quantum Frontier", era:"Prequels", year:2026, type:"Fiction", status:"Manuscript", freeChapterCount:2, reader:"Leo", blurb:"Kael Orth walks the perimeter stake line alone. Second Quantum Frontier prequel.", epubUrl:"/epub/perimeter-sample.epub", cover:{light:"/covers/perimeter-sample-withy-light.jpg", dark:"/covers/perimeter-sample-withy-dark.jpg", alt:"Perimeter Sample, a Quantum Frontier prequel, by Douglxss Burley Johnson: an empty withy walking frame on a river gravel bar"}, chapters:[
      {label:"Front Matter", text:"Perimeter Sample\n\nby\nDouglxss Burley Johnson"},
      {label:"Chapter One", text:"Chapter One\n\nThe empty flora case Kael was taking off the depot rack had already started rubbing against his shoulder before he even got it clear of the shelf. It was a long flat gray box that had been built to slide into the cradle under a withy like a drawer in a dresser. When it was empty it weighed next to nothing, but the strap still found the old sore spot over his collarbone right away and dug in. The water cases from the past few mornings were sitting on the shelf above it, sealed tight with a faint line of light along every seam. Those were Sera Holt's, and he didn't stop to read the marks on them, because today wasn't water. Today was the perimeter, which was the long loop around depot where a runner walked the stake line and clipped samples of everything that was growing, so the plants could be checked to see what was at the edge of camp before it crept any closer.\n\nHe sat down on the bench beside the rack and laced up his boots, tying them in a double knot and pulling the second knot down hard on top of the first. He had been lacing them like that for a few days now, and if someone had asked him why, he couldn't have said when he started or who he had picked it up from.\n\nHis withy was kneeling in the wall rack with the others, white and pale gray in the early light, with its canopy tipped up open on top like the lid of a lunch pail. A withy was a two-legged walking machine that stood a good head taller than a man, and the runner sat up inside it. The legs were long and slim and bent backward at the knee the way a bird's do, and they carried a closed pod around the seat. The pod had a thick front window, a canopy panel on top that tipped up on a hinge, a short antenna mast on the left shoulder, and two long jointed arms that ended in gripper hands. It had tan and orange paint along the edges of the plates and on the knee joints, where the paint had already worn thin. The thighs were covered in smooth white plating, but the knees and ankles were open so a mechanic could get at the rods and gears, and the feet were wide and flat.\n\nHe slid the flat case into the cradle under the pod, and it locked in with a click he felt through the rack. Then he took the handhold on the frame's right arm, put a boot on the knee, and climbed up into the seat.\n\nThe seat had been worn to the shape of his back over the past month, so it fit him without trying. He pulled the belt across his lap and thumbed the release on the hand grip, and the frame started to stand. Getting up took four breaths. First the canopy came down over his head and latched with one soft click, then the knees pushed the machine up off the ground with a long grinding hum, and on the fourth breath the screen inside lit up and the grips warmed under his hands, and the withy took his weight.\n\n\"There,\" he muttered, the way everyone on the crew said it.\n\nIt was a simple setup, really. The frame carried whatever gear he was bringing and walked steady over ground that would turn an ankle, and on its right arm, just behind the gripper hand, it wore the cuff, which held ten darts, eight tranqs and two killing darts. The white plating on the pod and the thighs would turn a bite or a claw, though the open knees and ankles wouldn't, and none of it did him any good once he climbed out. It gave a runner a fighting chance, the crew always said, and he had never asked anyone what they actually meant by that.\n\nA single wren was sitting on the antenna mast. It was a small drone about the size of a walnut, pale gray and smooth as a creek stone, and it had lifted off the top of Shep's side block up at the Bothy at dawn and flown the mile to depot by itself to sit there. Shep stayed stationed outside the Bothy up on the shelf with the water samples. There were only three units like him left, and Fenn wouldn't spend one on a plant loop, so she would lend a runner a wren instead, and that was the whole deal.\n\nHis collar bead clicked, and Shep's voice came through in his ear. He had a warm, easy voice, which was the calm voice anyone would want reading to them when they were laid up sick, and through the bead he sounded close, right there at his collar.\n\n\"Orth. You're walking like a man who owes somebody money.\"\n\n\"I haven't even left yet.\"\n\n\"Then you're sitting like one,\" Shep said, and Kael could hear the grin in it.\n\nThe stake line started at the edge of the packed dirt. The first wooden stake was leaning slightly toward the fern, and its paint had peeled back where the sun had baked it. Right at the turn, a chip of that pale yellow paint was lying on the dirt, about the size of a fingernail, and the frame's flat foot came down beside it and pressed it into the ground. The stakes smelled of the Rue, sour and stale, which had been dabbed on fresh by whoever had walked the loop at first light, and the smell got in through the vents at the base of the canopy. The Rue was boiled down from the fat of animals the crew had already had to kill, so it smelled like meat that had been dead a week. Nearly every animal on this world gave off that same smell when it died, and the ones that were alive stepped wide around it, the young ones most of all. For the most part the big old hunters did too, unless they were hungry, though the tracks in the dirt here crossed straight over the stake line instead of following it. His own frame had a band of it too, which was a gray waxed cord wound around the base of the antenna mast, and it stayed on the frame whenever he climbed out, which was the part of the setup nobody liked to think about.\n\nThe low scrub at first light was the best sight on this world, and he would have told anyone so. The light came in soft and pale out here, so everything looked washed in, the greens gone light and the sky over the fern a thin clean blue. The ferns came up to the frame's knees, and down among the fronds grew thousands of tiny blue flowers no bigger than shirt buttons, and all of them pulled shut whenever a shadow crossed them. As he walked, the frame's long shadow stretched ahead of him over the scrub and the flowers closed right in front of its feet, making a dark line of blue that folded shut one tiny click after another, too soft to hear. When he looked at the screen, his trail was a dark stripe through the blue behind him, and back there the petals were opening again in the sun. Past the scrub the cycad stands were sitting at the bends of the path, with fat trunks scaled like pinecones and crowned with stiff dark-blue fronds, while shiny bugs hovered in place over the flowers.\n\nThe screen was a square of glass under the canopy that showed what the small cameras on the pod could see, front, back and both sides. After the first week most runners trusted it more than their own eyes.\n\nOnce he reached open ground, he flipped the switch beside the seat that locked the torso.\n\nThe whole top half could turn all the way around on its hips, so there wasn't any side of a withy a runner couldn't face. The trouble was that the hip gears whined when it turned. Up around camp nobody ever noticed it, but out here, with nothing moving except the wind, it made a thin high sound that carried across the scrub, and the big animals on this world hunted by ear. Because of that, runners locked the torso facing forward on the open stretches and walked slow, and if they needed to look behind them, they looked at the screen. The legs were soft enough at a walk, with the flat feet coming down heel and toe in the fern. It was a slow way to travel, and the frame rocked a little on every step, so the strap of his kit found the sore groove over his collarbone again.\n\n\"Smart move,\" Shep said in his ear. \"Slow way to walk, though.\"\n\n\"Everybody says that.\"\n\n\"Everybody's right. I'd come carry you, Orth, except I'm a mile off and very busy guarding five cups of water.\" He paused a second. \"It's pretty exciting water. Don't tell Holt I said so.\"\n\nStake 3 marked a tough scrub shrub with thick leathery leaves, so he stopped the frame and thumbed the release on the grip.\n\nThat was the rule on the loop that nobody liked, because nobody took a sample from inside a withy. The gripper hands were strong enough to pull a stump, but they couldn't hold a fresh stem steady the way bare fingers could, and the motors put a fine shake into whatever they touched that scattered the green right off a leaf. Because of that, every runner had to climb out at every stake, with no exceptions.\n\nKneeling took three breaths, and it was loud. The knees folded back with a long hiss, the thigh plates knocked together, the pod rocked forward and down toward the fern, and the canopy tipped up with a clack and let the warm air in all at once. Kael unbuckled, stepped down onto the frame's knee, and dropped into the fern. Behind him the withy stayed kneeling on the path, empty and open, with the seat holding the shape of his back and the ten darts sitting in its cuff where they couldn't do him any good.\n\nHe dropped to his own knees by the shrub, wiped his snips on his trouser knee until the blades were clean, clipped three fresh tips of new growth, and dropped them into the first vial. He capped it and scratched the stake mark onto the glass with his marker, which was a stub of pale stone that left a fine line water could never wash off, and then he tucked the tube into the padded pocket at his hip, where the soft foam held it snug. He stood up, walked the four paces back, took the handhold on the frame's arm, and climbed into the seat. Getting back up took four breaths, with the click of the canopy, the grinding hum of the knees, and the screen lighting. \"There.\"\n\nThat was the job, and every morning he did the same thing. Kneel the frame, climb down, clip the plant, mark the glass, and take four breaths to stand back up. He ran through it at stake 4, taking two fronds off a low fern that had dark rust-colored spore backs, while the empty frame knelt five steps back on the trail and he worked on his knees.\n\nEach time the frame knelt, the hiss of the knees and the knock of the plates went out across the scrub. Out here he heard it go, and he counted how far.\n\nStake 5 was sitting in a shallow hollow where the dirt still held the night's damp. He knelt the frame, climbed down beside a vine on the bank, and snipped a stem and a leaf. When he raised his head, a track was sitting right there at the rim of the hollow, with three toes pressed deep into the mud and a smooth drag mark behind them where something heavy had moved through. Dry grit had blown in and half filled it, which meant it had been put there last night before the dew fell.\n\nRight beside it were the frame's own prints from yesterday's loop, two wide flat ovals sunk an inch into the damp, sharp at the edges. The three-toed track had stopped at the first oval and turned around it, the way a dog circles a spot before it lies down, and then gone on.\n\nHe pulled out his slate and wrote: wet ground, three toes. He didn't write what had made them, because he didn't know, and out here a guess on the morning slate had a bad habit of turning into a fact by suppertime.\n\nThe wren lifted off the mast, dropping a hand's width first and then gliding up over the fern without a sound, where it stayed for a breath turning in a circle before dropping back down to click onto the mast again.\n\n\"Small things east,\" Shep reported. \"Warm bodies, moving off. Nothing close by.\"\n\nKael looked down at the print in the mud, where he could have stood his whole boot inside the middle toe. \"Small, huh,\" he said.\n\n\"Small and warm right now. I'm telling you what my wren saw, Orth. I'm not telling you what made that print, and I'd watch anybody who claims they know.\" After a breath, Shep added, \"It likes riding with you, by the way. The wren. It'd never say so. It's shy.\"\n\nHe climbed back into the pod, waited four breaths, and said, \"There.\"\n\nAt stake 6 he clipped three seed heads off a stand of dry grass. Every flagged plant on this loop grew a little farther off the path than the one before it. That was simply how the route had been laid out, with the stakes on the trail and the plants out wherever they were growing, and a withy couldn't walk off the path into heavy fern without tearing a lane through it that anything could follow. So by the far end of the loop a runner had to walk a good way out from his frame on foot to reach them. The grass at stake 6 grew seven paces out, and he counted all seven going out and all seven coming back.\n\nAt stake 7, the tinkers found the wren. They were little rust-colored birds named for the pot menders in the old stories who walked the roads tapping on kettles, and three of them dropped out of a cycad crown onto the mast, the open canopy, and his head, humming at the wren. They were copying the low hum Shep made around people, which they had picked up at the Bothy, and they had it a hair off pitch while the wren sat there and took it.\n\n\"Shoo them off,\" Shep said, sounding more embarrassed than anything.\n\nKael brushed them off, and they circled and landed right back on him. He shooed them off again, and they fluttered up into the cycad and hummed down at him from the shade, still off key, and he caught himself grinning in a way he hadn't grinned in days.\n\n\"They think it's a baby,\" he said.\n\n\"They think it's mine,\" Shep said, his voice turning a little rough. \"And it is.\"\n\nHe shaved a curl of bark off the shrub at stake 7, capped the tube, and climbed back into his frame.\n\nOut in the brush, something snapped. It came from the east, past the fern line, and it sounded like one dry stem giving way under real weight. He stopped the frame mid-step and kept his chin down, because Rook Daley, who was the oldest runner on the roster, always said the dumbest thing a person could do out here was look at a noise, since the thing making the noise would know it had been heard. In a withy, looking meant turning the pod, and turning the pod meant the whine. He watched the screen instead, where the fern east of him moved in the wind and nothing else did. He counted to about twenty and nothing followed it, so he started walking again.\n\nAt the next rise it snapped a second time, closer in. It was the same dry sound, a little louder and nearer the line, and without thinking about it at all, he reached across with his left thumb and turned the selector ring on the right hand grip from tranqs to killing darts. The ring set what the cuff on the frame's arm would fire. A tranq put a big animal to sleep, as long as the needle got through the skin, while a killing dart stopped its heart in a breath. He felt the small catch click under his thumb, and when he glanced down at the grip a second later, he didn't even remember moving his hand, and he left it set there.\n\nStake 8 was a patch of gray lichen on a rock face, about eight paces off the trail. He scraped it into a vial with the flat back of the snips and wiped the loose grit off the glass with care, so the grit wouldn't throw off the bench readings later, and then he walked the eight paces back and climbed in.\n\nStake 9 was completely bare. The bush that had been flagged there was stripped to pale stalks, with the leaves gone and the bark peeled back in long curls, and every curl had a clean notch in it where a heavy beak had closed. He marked the stake stripped on the slate and kept moving, because an eaten plant still needed to be logged, and it told him something big had been feeding here recently.\n\nStake 10 leaned hard. The trail squeezed between two cycad stands there and opened onto a low flat, where the flagged bush was hanging heavy with clusters of purple berries, nine paces off the path. He knelt the frame, climbed down, walked the nine paces, and knelt himself. The berries were as soft as ripe grapes, so when he snipped a cluster, they burst across his fingers, and the warm juice ran down the blades and over his knuckles, purple and sweet. The smell came up at him thick in the heat, a heavy sweetness that stayed in the back of his throat.\n\nHe dropped the cluster into a wide tube and capped it, wiped his snips clean on the fern, and rubbed his sticky hand down his trousers. Then he walked the nine paces back and grabbed the handhold on the frame's right arm to pull himself up, and as he swung into the seat he noticed the purple juice had smeared off his palm onto the handhold and the cuff beside it, leaving a dark streak in the grooves by the dart ports. He didn't stop to wipe it, telling himself he would scrub it off at the far bend, and he would remember telling himself that later.\n\nHe ran his fingers over the pocket at his hip to count the tubes, and he felt all seven vials and the berry tube.\n\nThe trail climbed a stony rise past 10. The frame took it slow, with its flat feet feeling for the shale before it put its weight down, and at the top of the rock his collar bead hissed.\n\n\"Orth,\" Shep's voice said, small and far off. \"You're walking into the\" and then his voice was gone into static.\n\nEvery runner knew about the radio gap behind the rise, where the heavy iron ore in the stone blocked the signal. The bead went to a hiss and stayed there, and up on the mast the wren lost its link at the exact same instant. When he looked up at it through the canopy, it sat there like a pebble and did nothing, because it couldn't hear Shep and Shep couldn't hear it. The screen worked fine, since the mast camera didn't need anyone but him. Back down the trail behind him, the tinkers stopped humming, and from here around the bend, he was on his own.\n\n* * *\n\nOut at the far bend, the animal track changed. All morning he had been passing last night's trail, which was dry and half filled with grit, but here in the bend, the print was fresh. It was the same three toes, sunk deep in the soft dirt with the rims still dark and wet, and water standing in the bottom of each toe. A thick fern stem lay bent across it, snapped clean, with green sap still beading up at the break. He looked at that bead of sap on the screen long enough to know what it meant, and then he looked over at the last stake.\n\nThe last stake on the loop stood at the turn, and the plant it pointed to wasn't near the trail. It was a low flowering creeper climbing the sunny side of a boulder six paces off the path, out past the blue flowers and farther out than any other stop on the loop. He could skip it, since walking in one tube short wasn't the end of the world, but the rule on the survey was to finish what was in his hands, and this loop was in his hands. Every rule out here came down to that one sooner or later, so he thumbed the release.\n\nThe knees hissed for three breaths and the plates knocked. Here at the bend, with the fresh print under the frame's foot, it went on so long he wanted to put his hand over it. The pod came down, the canopy tipped up, and he climbed out onto the frame's knee and down into the fern. Behind him the withy knelt on the path with its canopy standing open and the purple smear drying on its handhold and its cuff, and he walked away from it, out past the reach of the Rue. He counted the paces under his breath, one, two, watching the blue flowers fold shut ahead of his shadow, three, four, five, six. Then he knelt against the boulder with his back to the trail and the empty frame six paces behind him, and pulled out his snips.\n\nThe creeper had small white flowers shaped like cups and dark leaves the size of his thumbnail. He clipped a leaf first, and the blades made a small clean snip in the air.\n\nOff to his right, out in the scrub, a heavy body took a step.\n\nThere was no mistaking the sound, which was a broad foot coming down slow in soft dirt. He didn't turn his head. He snipped one white flower, holding the open tube under the stem so the cup fell straight in, and out in the scrub to his right the foot came down a second time, a little farther along. It wasn't stalking behind him, because he wasn't moving, and instead it was walking a parallel line in the fern about ten paces out, behind the boulder's shoulder where he couldn't see it without turning around, and he wasn't going to turn.\n\nIt had heard the kneel. He knew that the way he knew his own name. The frame had hissed and knocked for three breaths in a bend where nothing else made a sound, and whatever was out there had come to see what it was.\n\nHe capped the tube. Out in the brush, the steps stopped. It hadn't walked on, and it hadn't dropped back, so it had stopped right where he had stopped, about ten paces out, the way someone stops beside a stranger on a road when they mean to walk together.\n\nHe scratched the mark onto the glass. His hand was steady, though he had no idea where that came from, and the fine line bit into the glass in short strokes. He tucked the tube into the last slot at his hip, which made all eight, so the whole loop was done and marked.\n\nRight then he noticed the blue flowers. Out in the scrub to his right, the blue flowers were folding shut in a line, one after another, drawing a dark stripe through the blue straight toward him across the fern, the exact way they had closed all morning ahead of his own shadow. Except there was no shadow on them, because the midday sun was sitting straight overhead. Whatever was closing them was brushing against the stems as it came in low and slow, and the line of shut flowers crept across the open ground toward the boulder, toward his knees, and toward the kneeling frame behind him.\n\nHe was six paces from his frame, and he couldn't see it without turning his head. For the first time that morning he wanted the screen, and the screen was sitting inside the pod, showing an empty seat.\n\nThe line of closed flowers stopped three paces off. He could hear it breathe now, taking short quick breaths through a narrow throat with a thin whistle at the end of each one, and then the fern parted and its head pushed through.\n\nThe thing was striking to look at, which was the very first thought he had, and he told it that way every time. It had a long narrow head that was covered across the crown in overlapping scales the color of wet slate, and a heavy hooked beak like a heron's, held slightly open. Underneath its chin hung a loose wattle of skin in the brightest color he had seen on the whole loop, which was a bright rose pink, and while he was kneeling there looking at it, that wattle flushed darker with every breath it pulled as blood pumped into the skin, pulsing from pink to deep red and back again. In that soft washed light it looked painted on.\n\nIt was a wild runner. Camp word said runners stood shoulder high, sprinted on two legs in a fast rush, and used that hooked beak for stripping bark. He had seen the notches bitten into the curls at stake 9, and it hit him right then that he had been looking at its morning feeding spot.\n\nIt didn't look at his face, because it was staring straight at his right hand, which was the stained hand that had crushed the berries. Its head went low and the beak opened a little wider as it breathed in, long, toward his fingers, while the wattle flushed solid red.\n\nHe stood up, slow, and the narrow head rose with him, tracking his hand.\n\nHe took one slow step backward toward the frame, and it came one step after. He took a second step back, and it matched him again. He didn't bolt, because running was loud and turned a man into prey, and the frame was kneeling behind him with the darts in its cuff. He walked backward toward it with his stained hand held out a little from his hip so the beak would follow his fingers instead of his throat, and it worked. Three. Its breath whistled high. Four. He could smell it plain now, crushed fern and old meat, and underneath that, coming off his own knuckles, was the sweet berry juice. Five. Way off to the east, the scrub snapped again, and the runner's head twitched toward the sound and swung right back. Six.\n\nHis left heel bumped the frame's foot.\n\nHe reached behind him without looking, found the handhold on the frame's right arm by feel, and pulled himself up backward onto the knee and into the seat, facing the runner the whole way. It followed him in. It came right up to the kneeling frame and put its beak down to the handhold where his sticky hand had been, and to the cuff beside it, and breathed in hard, and the whistle went shrill.\n\nHe thumbed the release. On the first breath the canopy started down over his head, and it came down slow. Nothing on this world could hurry that canopy along, and he had never hated a piece of gear as much as he hated that hinge right then, swinging down over him an inch at a time with a soft hum. He got his right hand up on the inside of the rim to pull it, which did nothing at all.\n\nThe cuff was already awake, because it had come awake the second his weight hit the seat. Down at his right side, the frame's long arm lifted off the ground by itself, with the gripper hand hanging open, and swung slow toward the runner's head until the cuff was pointing at it from an arm's length away. He felt the arm stop through the seat, and he felt it wait.\n\nIt held its fire because the runner kept its chin tucked low, so the slate plates on the top of the skull faced the cuff, overlapping, with the long scaled neck curved down behind them and leaving no soft place showing anywhere. The cuff aimed the killing darts itself, and the crew called that setup the Kingfisher, after the bird in the old stories that sits on a branch over the water as long as it takes for a fish to show. Its sensor read body heat, pulse, and heavy plate, and it refused to waste a killing dart on plate. It waited for a soft gap while the canopy came down past his eyes on the second breath, and the knees hadn't even started to rise, and the runner lifted its head off the cuff and found his hand on the rim.\n\nThat was the third breath, and there was still a gap under the canopy as wide as his forearm. The waiting was the worst part of the whole morning, and he told it that way every time, sitting there in the seat with the loaded cuff right outside the glass holding its fire while the head came in, low and beak wide, close enough that he could see the wet pink hinge of its jaw, with no way in the world to make it fire.\n\nIt drove its beak into the gap.\n\nIt bit down through the gap. The top of its beak came across his right forearm where it lay against the rim, and the bottom of its jaw closed on the frame's own right arm, which was raised right there beside the pod, and the Nettle fired straight through its mouth. The Nettle was wired through the white plating of the frame's arms and legs, and it sent a heavy jolt of electric current that burned like a nettle sting through any mouth that closed on them, teaching the same quick lesson an electric fence teaches a cow. It shocked anything that bit the frame, as long as a runner was sitting inside it.\n\nHe felt the jolt buzz right in his own teeth, and the runner's jaw flew wide open. Its head jerked up and back, high, with the whole long neck rearing and the wattle flaring out wide and bright red, and right there under the hinge of the jaw where the plates stopped sat a fold of pale bare skin, soft as the inside of a wrist and pulsing.\n\nThe Kingfisher fired.\n\nHe didn't hear the dart leave the port, but he saw the killing dart buried in the soft fold behind the jaw like a short dark line, and the runner's whole body jerked once. Then it stood in place, dead on its feet before its nerves knew it. It stood on its two legs with its head up and its beak open, while the wattle faded from red to dull gray in one long breath as its heart stopped, and then the legs folded out from under it and it fell forward across the kneeling frame.\n\nThe whole pod rocked back on its knees. The body came down across the front window and the frame's lifted arm, heavy as a felled tree, and the canopy, which was a hand's width from shut, stopped against its neck and hummed and couldn't close. The stink of crushed fern and old kill rolled in through the gap. The runner's head lay against the front window right in front of his face with the wattle squashed flat on the glass, and he watched from inside as the color drained out of that skin, gray spreading out from the middle. The hind legs kicked once against the frame's thigh plate, and he sat pinned in the seat with the body across the window, feeling it kick a second time, and a third, and then kick less and quit, and he stayed sitting there for about thirty breaths after that.\n\nHe looked down at his right arm. The canopy rim had taken the worst of the bite, which he figured was what the crew meant when they said the frame gave a runner a fighting chance, though the beak tip had slipped past the edge of the rim and opened the inside of his forearm in one red line from the wrist halfway to the elbow, deep enough that a white tendon cord was showing down in the meat. When he made a fist, the cord moved.\n\nHe looked away from it. With his left hand he pulled the cloth out of his kit and wrapped the arm one-handed, winding the linen around and around before pulling the end tight with his teeth and tucking it under. Blood soaked red through the cloth before he had even finished, so he made a fist a second time, saw that his fingers still worked, and decided that was all he needed to know for now.\n\nHe thumbed the release to stand. The knees pushed up under the body and ground against it, louder than he had ever heard them, a long ugly grinding that went out over the bend and kept going. For two breaths the frame shook and didn't rise. Then the body slid off the front of the pod, dragging one claw down the window with a squeal, and fell into the fern beside the path, and the knees came up all at once and the canopy latched. He sat up there with the blood running warm down his wrist and checked the case in the cradle with the screen, where it showed locked in, and when he checked the pocket at his hip he found all eight tubes safe in their slots. A dry seed husk had gotten stuck in the mesh where the pocket met the strap, so he flicked it onto the floor of the pod with his thumb.\n\nThe dead runner lay beside the path with its beak open on empty air, and the wattle had turned the color of cold wood ash. Up close on the screen, the plates along its back had green moss growing in the seams between them, while its round gold eye stared open with a second lid drawn half across it, clear as a window. A long smear of the wattle's color was left on the outside of the front window, and the light coming through it was a little pink. He didn't climb down to the body, and he didn't hold a vial to it.\n\nHe pulled out his slate. There were two columns on it, which were for what was taken and what had happened, the same two columns that had been used since the first loop anyone ever walked. Under taken he wrote eight, and under happened he wrote: Runner at the far bend. It came at me. I killed it. It's lying there.\n\nHe glanced at the cuff count on the grip, where one killing dart was gone and one was left, and all eight tranqs were sitting in their slots where he had left them when he turned the ring at the second snap on the rise. He still couldn't remember turning it, and purple berry juice was drying into a dark crust on the grip under his own hand.\n\nFrom the east, out past the scrub, a voice called with a long hollow note that rose at the end, and a few breaths later, a second one answered it from farther off.\n\nThe crew believed a killing called more of them in, though nobody had proved it on paper. Still, in the first month a striped hunter had been killed at the river crossing, and that night the whole river had lit up green, which was all the proof anyone in camp needed. He didn't turn the pod east. He looked at the screen once, where the fern over there was moving in a long line against the wind, and then he locked the torso forward and walked.\n\n* * *\n\nThe walk in was the exact same loop backward, and it felt twice as long. He walked it with the torso locked forward, the flat case in the cradle under the pod and his wrapped right arm held against his chest. He steered with his left hand on the left grip and only the fingers of his right hand on the other one, and every time the frame rocked on a step, the grip moved under those fingers and tugged at the torn meat in his forearm. The kit strap dug straight back into the old sore groove over his collarbone and stayed there.\n\nBefore he had gone about twenty paces from the dead runner at the far bend, he saw something on the screen behind him that he didn't like.\n\nHe stopped the frame and looked at it. It was his own trail. The ground at the bend was soft, and the frame's flat feet had sunk into it under the withy and him and the case, so every step had left a wide fresh oval an inch deep, sharp at the edges and dark with damp. Next to each print, every few steps, there was a dark spot in the dirt. When he looked down at his right side through the glass, he could see where it was coming from. Some of his blood had gotten out through the gap when the beak came in, and it had run down the outside of the pod and along the frame's right arm, and now it was gathering at the gripper hand and dropping off its fingers onto the trail. Out here, a line of fresh blood drops beside a line of deep fresh prints was the same as laying out a painted road for whatever was coming in from the east.\n\nHe couldn't climb out to wipe it, so he took the right grip and pulled the frame's long arm up and in until the gripper hand was folded flat against the chest of the pod, where the blood would run onto the plate and dry there instead of falling. The arm motor whirred the whole way up, and he bit the inside of his cheek, because the pull on the grip ran a sharp pain up his forearm and the pale cord in his meat jumped once under the linen. When his eyes cleared, he looked at the screen again. No more drops were falling behind him, though the prints would be there until it rained.\n\nBack toward the bend behind him, the brush rustled hard.\n\nHe didn't turn the pod. The bend was only about forty paces back, where the runner he had killed was lying in the fern beside the path with its hooked beak open and the single killing dart buried behind its jaw. On the screen he watched the fern back there shake, and through the canopy vents he heard a heavy two-legged hop land in the dirt, which was followed by a low, wet rattle in a narrow throat and the hard clack of a beak striking slate plate. Whatever had called from the east had made it to the body, covering the ground a whole lot faster than a man could walk.\n\nThen a second voice answered that rattle, closer in now, coming through the waist-high fern off to his left on a line that would cross the trail right ahead of him at Stake 10.\n\nHe was still behind the stony rise where the iron rock blocked the radio, so the bead at his collar only hissed in his ear and the gray wren up on the mast sat cold as a creek pebble. He was on his own until he climbed over that iron rock, and the trail led straight through the low flat at Stake 10.\n\nAs he came onto the low flat, the heavy sweet smell of the berries came in through the vents. Stake 10 was leaning hard at the edge of the trail, nine paces from the bush he had clipped, and right beside it a fresh three-toed track had been pressed deep into the soft dirt on top of the frame's own morning print. Dry grit was still sliding down into the bottom of the middle toe, which meant something had walked through the narrow gap between the cycad stands while he was out at the boulder, stepped straight across his morning trail, and kept going toward the bend.\n\nBefore he could take another step toward the trees, the blue button flowers out in the scrub to his left started folding shut on their own. They closed in a fast, straight line that was crossing the flat from the east about thirty paces out, moving at a long loping trot toward the gap between the cycads, because under the high sun a second wild runner was coming in to answer the rattle at the bend. If Kael tried to take the frame up the stony rise now, its feet would scrape and slide on the loose shale, and it would be on him before he made the crest, and he knew well enough what a closed pod was worth with a bad arm and one killing dart.\n\nSo he walked the frame sideways off the path into the deep shade between the two fattest cycad trunks.\n\nHe didn't dare kneel it, so he stood it there. The trunks were scaled like giant pinecones, and the stiff dark-blue fronds overhead came down over the canopy and scraped along the window and closed over the top of the pod, and the shade under them was deep and cool. Down around the roots, the ground was covered in dead husks where none of the little blue flowers grew, so nothing folded shut under the frame's feet to give his spot away. He brought the frame back until the pod bumped the trunk behind it, and he switched off the cooler fan under the seat, because even that little hum was too much.\n\nThe front window had been cooled by the fan all morning, and the air in the shade was warm and wet, so the outside of the glass fogged over almost right away. In three breaths he couldn't see the trail through it at all. He had the screen, and the cameras on the pod could see out under the fronds, so he watched the screen, which was all he had now.\n\nThe second runner trotted into the gap five paces in front of the frame. It came onto the screen from the left, small and flat in the glass, and it looked smaller than it was. It was taller in the hip than the one he had killed, with the same overlapping slate plates across its crown and down its neck, and a long hooked beak the length of a pick head. Under its chin hung a loose wattle of skin in a bright rose pink, which had an old ragged notch torn out of the lower edge. As it hit the trail between the cycads, it slowed down and swung its narrow head toward Stake 10, where the crushed berries were hanging in the sun, and he heard its throat give a thin whistle on the inhale through the vents, much louder than the screen made it look, while the notched wattle flushed deep red.\n\nDown at his right side, the frame's long arm moved. He felt it through the grip before he understood it. The arm was easing up off the pod's chest by itself, the gripper unfolding, because the Kingfisher sensor in the cuff had picked up the animal's body heat and pulse five paces away. He had the selector turned to his one remaining killing dart, so if the runner turned its head and showed the soft fold behind its jaw, the Kingfisher would fire that last dart on its own, leaving him standing in the shade with an empty killing slot and a dying animal thrashing at the frame's feet, and calling.\n\nHe took the right grip with his torn arm and pulled it back hard. The arm whirred and folded down again, and he held it there with the gripper hand pressed flat against the pod's chest plate until the cuff's sensor was facing the plate instead of the gap. Through the grip, he felt the arm hunt once against his pull, lose the heat mark, and stop moving. The pain in his forearm made the screen swim. He held on.\n\nFive paces out in the gap, the big runner lowered its beak to the dirt where the frame had stood a breath ago, and he watched it on the screen. One of the frame's flat prints was sitting there in the soft dirt at the edge of the shade, an inch deep and sharp at the edges, and at the toe of the print a single bead of blood had squeezed off the folded gripper and fallen onto a dry cycad husk. The hooked beak stopped a thumb's width above the husk. Then it lifted its head and looked straight into the shade between the trunks, at the frame's white thigh plates standing there in the dark, and its round gold eye, which was half covered by its clear inner lid, came up the legs toward the fogged canopy. He sat there watching it on the screen while the glass in front of his face stayed a soft white wall.\n\nBack at the far bend, the first runner let out another sharp clack of its beak, followed by a long wet tearing sound, like heavy canvas being ripped off a frame.\n\nThe runner in the gap jerked its head around, and with two long strides of its scaled legs it was out of the cycad shade and sprinting down the path toward the bend, kicking dry dirt back over Stake 10 as it went.\n\nKael waited until he heard the two of them knocking beaks together over the carcass at the turn. Then he switched the fan back on, watched the fog shrink off the glass in a widening circle until he could see the trail again with his own eyes, kept the right arm folded against the pod, and walked the frame out from between the cycad trunks and up the stony rise.\n\nGoing up the rock was the hardest twenty yards of the morning. Halfway up the slope the frame's right foot skidded on the loose shale, and the whole pod lurched sideways, and out of habit his right hand closed on the grip to catch it. The white cord in his torn forearm pulled hard through the raw meat, sending a sharp pain up his arm that made his knees go weak and put a sour taste in the back of his throat. He let go of the right grip and set the frame's left hand flat on the hot rock. It walked the last five steps leaning on that one hand.\n\nOver the rise the bead clicked back on.\n\n\"Orth.\"\n\n\"I'm here.\"\n\nNobody spoke for three breaths, and he could hear Shep listening to his breathing.\n\n\"You've got blood all over the inside of your glass,\" Shep said gently, in that easy, dry voice a friend uses to keep a hurt man talking.\n\nKael looked. There was a red smear across the inside of the front window where his arm had been pressed against it under the rim, and a handprint beside it, and he didn't remember making either one.\n\n\"Walking in.\"\n\nShep didn't push for more, and Kael didn't add a word. On the mast, the wren popped out of its clip, dropped a hand's width, and glided up without a sound over the scrub behind him, heading back toward the crest of the iron rise.\n\n\"Your heart's running like you tried to race the cargo lifter up the hill,\" Shep said in his ear. \"Tell me what you ran into behind that rock, Orth. Keep your voice down and keep your feet moving.\"\n\n\"Wild runner at the last stake,\" Kael said, barely above a whisper, watching the path ahead of the frame's feet. \"It heard the kneel. Came in on the berry juice on my hand while I was out at the boulder. I got back in, but the canopy was still coming down on the third breath, and it bit me through the gap before the Nettle and the cuff put a killing dart behind its jaw.\"\n\n\"And the arm?\"\n\n\"Beak slipped past the rim on the inside,\" Kael said. \"Opened it up from the wrist halfway to the elbow. My fingers work. I wrapped it with the kit rag.\"\n\n\"A kit rag,\" Shep repeated dryly. \"Joss is going to love that. He spent an hour this morning folding clean linen into little squares because Holt made him nervous, and now you're going to walk in wearing a dirty knot you tied with your teeth.\"\n\n\"How do you know I tied it with my teeth?\"\n\n\"Because you only have two hands, man, and one of them is busy bleeding on your window.\" Shep's voice dropped a shade lower. \"My wren has eyes on the bend behind the rise. There are two of them down there over the one you dropped. They're busy tearing at the throat right now, which is why neither of them came over the rock after you.\"\n\nKael walked past Stake 9, where the flagged bush stood stripped to pale stalks, and then Stake 8, where the gray lichen grew on the rock face eight paces off the trail. As he came level with the outcrop, the noon light tipped sideways for a second from the blood he had lost, and his hand slid on the left grip, and the frame took two sideways steps off the path before he got it stopped. He leaned his forehead against the cool glass and waited for the ground on the screen to quit tilting.\n\n\"Orth,\" Shep said in his ear, calm and steady. \"You stopped.\"\n\n\"Catching my breath for a second,\" Kael muttered, and walked the frame back onto its own morning prints. \"This thing rocks like a boat today.\"\n\n\"Then keep talking to me,\" Shep said. \"Tell me how many tubes you've got in the pocket.\"\n\n\"All eight. Seven vials and the berry tube, all marked.\"\n\nThe dry talk did what it was meant to do, keeping his head clear as the trail wound down toward Stake 7. At the cycad stand by 7, the three rust-colored tinkers dropped down out of the blue fronds to see the wren as it glided back down to click onto the mast. Earlier in the morning he had brushed them off twice, but this time there was a canopy between them, and one of them landed on the glass right in front of his face, cocked its head at the red smear on the inside, and started to hum Shep's low note, a hair flat. He could hear it faintly through the vents. After a few paces a dry stem snapped out in the east scrub, and the tinkers flew up off the canopy and went away.\n\n\"Something's walking parallel in the tall fern to your left,\" Shep said, his voice low. \"A third one, forty yards out in the brush, pacing your steps. Stake 6 is right ahead of you. Three hundred paces to the Hedge. Keep your chin down, don't turn that pod, and don't change your stride.\"\n\nHe wanted to turn it. The pod would come around in two breaths and he would see the thing with his own eyes instead of on a little pane of glass, and every hunter in that fern would hear the hip gears sing. He kept his eyes on the screen, where the fern to his left had a line through it that moved when he moved and stopped when he stopped.\n\nKael walked past the dry grass at Stake 6, then the damp hollow at 5, then 4 and 3. The frame's own morning prints were sitting in the dirt path and he walked it right in them to save thinking. Ahead of him, the blue flowers folded shut as the frame's shadow crossed them and opened behind it, and he didn't look at the screen once to check.\n\nWhere the stake line met the packed dirt of depot, the Hedge sounded. The Hedge was depot's outer watch line, which was a hidden sensor line laid through the ferns a long stone's throw from the tents, and it gave one low soft tone whenever a big body crossed it. He had crossed it, so it sounded for him. Once the tone faded out, he stood the frame where it was and waited to see if it would sound a second time for something trailing behind him, and it didn't, which told him nothing at all. The Hedge said when a body came in, and it never said when one stopped on the line and waited.\n\n\"It stopped right at the fern line by Stake 2,\" Shep said in his ear. \"You're inside the wire now, Orth. Go give Fenn her leaves.\"\n\nHe walked the frame across the packed dirt to the wall rack first, because he wasn't going to kneel it anywhere else, and backed it into its slot between the others and thumbed the release. Over three breaths the knees hissed and folded, the plates knocked, the pod came down, and the canopy tipped up and let the smell of depot in, cook smoke and wet canvas. He climbed down off the knee onto the packed dirt wearing nothing except his clothes and the wrapped arm, standing bare under the open sky while the empty frame knelt behind him with his blood dried along its arm. He had done it a thousand times. He was inside the wire now. Even so, he minded all three of those breaths today, standing bare with his back to the ferns and a frame behind him that could have kept him safe, and his ears kept counting how far that hiss had gone.\n\nHe reached under the pod left-handed, slid the flat case out of the cradle, and carried it to the table under the main shade tarp.\n\nFenn was sitting at the long table with the depot slate open. She was a lean, gray-haired woman who had a burn scar along one jaw from a reactor repair aboard the Ark, and she never raised her voice because she had never needed to. Beside the slate lay her Bodkin, which was a slim rod of dark metal as long as her forearm that fired darts without a sound and was keyed only to her hand.\n\nHer eyes went to his wrapped arm before she looked at his face.\n\nHe set the case on the table. He popped the lid and moved the eight tubes out of his hip pocket into its soft foam slots, one at a time, left-handed, and shut the cover.\n\n\"Put your hand on it,\" Fenn said.\n\nHe laid his bare left palm flat along the seam. The heat and pulse of his hand triggered the lock, so the seam sealed itself shut like wet linen drawing tight, and a line of light ran the length of it and stayed lit. Only his hand could open it now, or hers, and the palm that had keyed it had gotten warm, holding a faint tingle that stayed after he took his hand off.\n\n\"How many?\"\n\n\"All eight. Marked.\"\n\nBeside the slate sat the check board, which was a flat dark glass that showed a number and a color and nothing else, and it never talked. Fenn tapped it, and it showed eight, and green.\n\nShe read his slate, and then she read the second column. She picked up her Bodkin, thumbed one dart out of the grip, checked the point, and put it back in without saying a word about it.\n\n\"It came after you.\"\n\n\"At the last stake. I was six paces out of the frame.\"\n\n\"And you killed it.\"\n\n\"The cuff killed it. I had the ring set to kill.\"\n\n\"Why?\"\n\n\"I honestly don't know.\"\n\nFenn looked at him long enough that he started to wonder if he had answered wrong, while behind her two runners walked past toward the racks and kept their eyes to themselves.\n\n\"The ship got our tranqs out of one dead bird, Orth,\" she said, keeping her voice very low. \"One tinker that broke its neck on a window. You had a whole runner lying dead beside your frame, covered in plates our tranqs bounce right off, and you brought me leaves.\"\n\n\"The leaves are what you sent me for,\" Kael said. \"The runner is what happened to me.\"\n\n\"We lost Brandt on the east trail already this week,\" she said, and the burn scar along her jaw turned pale. \"Every big animal out here carries heavy plate that turns a standard dart, and we haven't had a single plate on a bench to see how the seams knit. You had one lying in the path.\"\n\n\"I had one working arm, a frame that hisses and knocks for three breaths every time I kneel it, and two more of them calling from the east scrub,\" Kael said. \"By the time I got into the cycads at Stake 10, a second one was already trotting down the path to tear into the body, and a third one paced me through the fern all the way to the wire. If I had knelt that frame down at the bend again and climbed out to pry a scale off its neck, you wouldn't have the runner or the leaves.\"\n\n\"And now it's lying out there for anything that wants it.\"\n\n\"I left it where it fell.\"\n\n\"You're certain.\"\n\nHe tipped his chin at the slate. \"It's written down under where it happened, and left out of the plant column.\"\n\nFenn held his eyes, and then she breathed once through her nose, copied the eight onto the depot slate, and copied the second column underneath it, word for word, in its own place. She pressed her fingertip at the bottom, the way a boss signs for cargo she is responsible for now.\n\n\"The Hedge has sounded twice since you walked in,\" she said. \"Nobody goes out till morning. Rack the case. Go get that arm looked after. Leave the bar.\"\n\nHe was wearing a short iron field bar on his belt for setting stakes, so he unclipped it and turned it over in his hand. It was clean, and there wasn't anything on it except the dry grit of the stake line, because he hadn't used it all morning.\n\n\"I'll clean it myself,\" he said.\n\nHe carried the case to the rack under the shade cloth and slid it in, seam facing out, in the slot where the empty one had been sitting at dawn. A frayed lace tip on his boot caught on the rack's edge as he turned, and he freed it with two fingers. On the shelf above, Sera's water cases sat in a row with their seams lit, and he didn't read them.\n\nThen he went back to his kneeling withy and unlatched the cuff from the frame's right arm to scrub in his tent. The cuff came off in two clicks, and the arm under it was smeared brown with his blood all the way down to the gripper fingers. Somebody would hose that off before morning. He laid the field bar in the wash tray at the end of the table. It would be wiped down later, even though there was nothing on it to wipe, and that clean iron bothered him more than blood would have, though he couldn't have explained why.\n\nA plant tech passed him carrying a tray of leaf bags. \"You doing all right?\"\n\n\"Got all eight,\" Kael said, and the tech glanced at his arm and walked on.\n\n* * *\n\nThe sample tent held one wood table, one narrow cot, and a spare rack. He ducked inside and let the flap fall shut, and the heavy cloth dulled the depot noise down to a murmur. When he set his left hand on the table, the rushlight came up in the tent pole and shone warm and bright over his knuckles, the way it did for any working hands, while the rest of the tent stayed dim.\n\nOn the shelf by the rack there was a pale line of dust against the wood right where the empty case had been sitting before dawn. He had noticed that clean rectangle where the case had kept the wood clear of grit, and he left the dust alone.\n\nHe set the wrist cuff and his duplicate slate down on the wood, pulled the stool out with his boot, and sat down. Outside the flap, two knuckles rapped against the upright post.\n\n\"Orth?\" a gentle voice called through the canvas. \"Fenn said you brought back some work for me.\"\n\n\"Come on in, Joss,\" Kael said.\n\nJoss Amari ducked through the flap carrying his canvas med roll under one arm and a jug of cold water in his hand. He was a big, broad-shouldered man who had worked as an infirmary orderly on the Ark, and before he even unrolled his kit on the table, he pulled a fresh linen square out of his pocket, folded it once down the middle, and laid it flat beside the basin.\n\n\"Came down from the Bothy an hour ago for supplies,\" Joss said, setting the water jug down. \"Thought I was going to get an easy afternoon sorting bandage packs in the shade. Let's have a look at it.\"\n\nKael rested his right elbow on the table and held his forearm up into the bright pool of rushlight. The kit rag he had wound in the pod had dried stiff as bark around the wound, where his own blood had dried and stuck it to the hair and the torn skin.\n\nJoss didn't try to pull it off dry, because he knew better than to hurry field linen that had set in the heat. He uncorked the jug, poured cold water slowly over the knotted cloth until the dried blood softened and turned red again, and worked the knot loose with two blunt fingers. Even soaked, the last turn of cloth was stuck fast in the meat. When Joss eased it up, a sharp line of pain ran from Kael's wrist bone straight into his shoulder socket, and Kael locked his jaw hard and stared at the tent pole until the strip came free.\n\nThe inside of his forearm lay open in a single ragged cut from the heel of his hand halfway to the crook of his elbow, where the sharp tip of the runner's beak had slipped past the edge of the canopy rim. Down in the red meat, the pale sheath of the main tendon cord was showing clear and slick, with two small dark clots stuck to the lower edge and a tiny fleck of purple berry skin that had gotten washed in near the wrist.\n\nJoss leaned in close, with his big hands steady in the warm light, and used a pair of blunt tweezers to pull the speck of berry skin out of the raw flesh and wipe it on his square cloth.\n\n\"That rim took the crush of it,\" Joss murmured. \"Another finger's width inside and that beak would have notched the bone. Give me a slow fist, Kael. One finger at a time.\"\n\nKael curled his thumb in first, then his pointer, then the middle three. Down in the open red trough of his arm, the white cord slid back and forth in its wet groove like a greased cable, smooth and unbroken, pulling the torn edges of muscle slightly with every flex.\n\n\"Hurts like a burn,\" Kael said through his teeth.\n\n\"I expect it does,\" Joss said. \"The cord's whole, though, and that's the part that counts for sure. If the beak had nicked a strand of that, you wouldn't be buttoning your own shirt till winter.\" He poured a steady stream of cold water through the wound, washing the clots and grit down into the catch basin on the table, and then patted the skin around the gash dry with his folded square. \"What made a wild runner bite at a withy? Usually they strip bark and bolt the second one of those things stands up.\"\n\n\"It wasn't standing,\" Kael said. \"It was kneeling, with the canopy up, and I was climbing in.\"\n\nJoss's hands stopped for a second on the cloth. Then he went on patting.\n\nKael tipped his chin toward the gray wrist cuff that was sitting beside the slate, where the crushed berries from Stake 10 had dried into a dark purple crust in the grooves around the dart ports.\n\n\"Crushed a cluster of purple berries at the tenth stake,\" Kael said. \"Got the juice on my fingers and smeared it on the handhold and the cuff when I climbed back in. Told myself I'd wipe it off at the bend, and I didn't. The runner heard the kneel at the last stake and came to look, and then it smelled the sweet on my hand while I was out at the boulder.\"\n\nJoss glanced at the purple crust on the cuff, and then back to the arm. He uncapped a small gray tube of medical glue and laid a cool, clear bead right along the seam of the wound, pinching the torn edges of skin together with his thumb and forefinger in short sections from the elbow down to the wrist. The glue smelled sharp, like vinegar and cold iron, and as it hardened it pulled the meat tight across the white cord, sealing the air out.\n\n\"You're the second runner this week to walk in with something sweet on his skin that the woods wanted to taste,\" Joss said in a low voice, holding the last inch of skin pinched at the wrist while the clear line set. \"Sera came up from the stream a few mornings back with that green water smell on her clothes, and the ferns outside the Bothy leaned right against the stone wall until the Porch vents pulled it off her.\"\n\n\"Did she say what the green was?\" Kael asked.\n\n\"She wrote down what the gauge showed, and left the rest blank,\" Joss said. He picked up a roll of clean white gauze and wrapped it neat and snug over the glued seam, tucking the end in without a pin, and as he lowered Kael's arm back to the wood, his eyes dropped to Kael's boots under the stool, which were laced all the way to the top eyelet and pulled down hard in a double knot.\n\nJoss's hands paused on the canvas med roll for a breath. \"You're tying them double now,\" Joss said.\n\nKael looked down at his own boots, where the frayed lace tip that had caught on the depot rack was sticking out half an inch from the tight second knot.\n\n\"Been doing it a few days,\" Kael said, keeping his voice low. \"Didn't really think about it when I sat down on the bench this morning.\"\n\n\"Ade told me twice before he walked down the hill that morning that he'd double knotted his,\" Joss said, tying the cord on his med roll with a slow, even pull. \"Said a loose lace on open ground was how a man twisted an ankle out of reach of his frame. It's a good habit, Kael. Keep tying them that way.\"\n\nHe stood up, tucked the med roll under his arm, and laid a hand briefly on Kael's good left shoulder.\n\n\"Leave that wrap dry till morning, and don't go lifting any full racks with your right hand tonight,\" Joss said. \"The glue holds fine against a pulse, except it'll weep if you strain the cord underneath it.\"\n\n\"Thanks, Joss.\"\n\nThe big orderly nodded once, ducked out through the tent flap, and let the canvas fall shut behind him.\n\nNow the medic had come and gone, and the tent felt smaller once his footsteps faded into the yard. Under the clean gauze wrap, the glued cut on his forearm throbbed in time with his pulse.\n\nHe sat back down on the stool. His left palm still felt warm where it had keyed the seal, so he rubbed it against his trouser leg. The warmth stayed right where it was, a small even tingle in the center of the palm, and when he rubbed it again it didn't go anywhere. When he pressed the tip of his thumb into the middle of that warm spot, he could feel a faint steady prickle running up the inside of his left wrist, keeping its own time alongside the heavy ache in his right arm.\n\nHis wrist cuff was sitting on the table where he had set it, with the dried berry juice crusted in the grooves along the dart ports. He couldn't leave the cuff sitting like that for morning, because if the sweet crust stayed in the ports overnight, the smell would still be on the metal when he latched it back on the frame at dawn. He picked up the stiff brush from his kit and the jug of cold water and scrubbed at the metal with his left hand, pinning the curved gray cuff flat against the wood table under the heel of his bandaged right wrist so it wouldn't slide around. The crust came loose slowly out of the fine grooves around the Kingfisher's sensor. He scrubbed until the grooves showed clean gray metal, and kept scrubbing after that, and because his right wrist was pressing down hard to hold the metal in place, he didn't notice the wrap on his arm soaking red again until the water in the basin turned pink. He stopped, sat back, and held the arm against his chest until the bleeding quit.\n\nThen he poured fresh water, cold from the jug, and rinsed the cuff off, watching the water run pink into the basin and then clear. He didn't save the rinse, and instead he poured it out on the dirt floor by the flap and watched the wet spot soak in.\n\nHe set the clean cuff on the table with the ports facing the wall, where one killing dart was left and eight tranqs were waiting in a row.\n\nWhile he was sitting there in the warm light, he thought about the second snap on the rise, and his thumb on the selector ring, and the click under it. He tried to find the exact breath where he had made up his mind to switch to killing darts, and he couldn't find it. He remembered the tinkers flying up into the cycad at Stake 7, and he remembered the dry snap in the east brush, and the next thing in his head was looking down at the grip and seeing the ring already set on the killing slot. The choice was sitting in there somewhere between the snap and the click, and he couldn't get his thumb on it. He had turned the ring himself, fine, but what scared him was knowing his thumb had figured out the runner was coming before he did, and it hadn't said a word to him about it.\n\nLater on, standing between the cycad trunks at Stake 10 on the walk home, he had been forced to pin the frame's own arm against its chest to keep the cuff from firing the second killing dart on its own. Between his thumb turning the ring without asking him and the frame's arm lifting by itself to hunt for a throat, he wasn't completely sure anymore who had been carrying whom around that loop.\n\nHis duplicate copy of the slate lay beside the cuff, showing eight under taken and four short lines under happened. Down at the bottom sat a third box, which was the one Fenn hadn't said a word about. That was the specimen box, where a runner wrote the name of a thing he had brought in so it could be opened up and studied, and the box was sitting empty.\n\nIf he had climbed down and pried one slate-colored plate off that dead runner's neck with his field bar so the ship's computer could look at the moss in the seam, Fenn would have signed that third box and sent it up the ridge on the next lander trip. And tonight, whatever had called out of the east scrub and followed his prints all the way to Stake 2 wouldn't be standing out at the fern line wondering about him, because it would be walking straight into the tents looking for what he had taken.\n\nHe could have filled that line in with one word, and instead he sat looking at the blank space while the rushlight stayed warm across his hands, and he didn't touch it.\n\nWhen he took his hands off the table, the rushlight drained out of the tent weave, so the tent went dark all at once, and he lay back on the cot with his boots still laced on and the double knots pulled tight.\n\nOut past the canvas, up on the shelf a mile off, Shep would be crouched outside the Bothy door with two wrens on his side blocks and the third flying home in the night. In the fern crowns, the tinkers were singing his hum back to him, low and a hair off pitch, the way they did every night, and Kael could hear them faintly, sweet and slightly off.\n\nThen the Hedge sounded out at the line with one low tone.\n\nHe lay flat on his back and counted in the unlit tent, the way everyone in camp did, waiting for a second tone that would mean it had turned around and gone back out. The Hedge never gave one, because it only ever chimed when something big came in, and he counted past a hundred, and then past two hundred.\n\nSo he lay there in the night with his warm palm resting against his chest and let the count go. Out in the rack his withy was kneeling with its canopy open, the way he had left it, holding the shape of his back in the seat. Somewhere out on the far bend, a dead runner was lying beside the path with its wattle gone the color of cold ash and a voice calling to it out of the east, while the empty box sat on his slate on the table, and he left it the way it was and went to sleep."}
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
      {label:"The Hills Above Allentown", text:"There are hills above Allentown, and the one sitting closest to the city is South Mountain. Anyone driving up there after dark comes to a pull-off on the city side, which is a wide gravel lot with room for maybe six cars and a steel guardrail along the edge. Past that rail the mountain drops off fast through red sumac and crooked little oaks, and down at the bottom the whole town is spread out like someone spilled a jar of lights across a dark table. Kids have been climbing up that hill for as long as there's been a road. I'm going to tell what happened to four of them on a Friday in October, when something came up the slope while they were standing at that rail.\n\nDani Peña's mother zipped the Bible into the front pocket of Dani's backpack every morning at the kitchen table, right after she zipped Dani's coat up to her chin and pulled her braid out from under the collar. It was a small Spanish Bible the size of a paperback, and it had a blue vinyl cover with a zipper around three sides like a pencil case. Her mother had bought it in Santiago the week before they flew up to Pennsylvania. On the first page she had written Daniela Peña Almonte in ballpoint, pressing down hard enough that the name showed through backward on the other side of the paper. Dani was twelve, and for the two years she had lived in Allentown she had been in the English learner class down the hall at South Mountain Middle School. In all that time she had never once opened that front pocket during a school day, so the only thing she noticed about the book was that her backpack hung a little heavier on the left.\n\nThat Friday the last bell rang at the regular time, and the four of them met on the front steps out on Emaus Avenue. A custodian was working the walk with a push broom, sweeping a busted bag of Takis into a dustpan while the wind kept picking up the little red pieces and blowing them back down the steps away from him.\n\nIsaiah Whitfield had the plan, the way he usually did. He was thirteen and in the eighth grade, and he already had his phone screwed onto a small tripod with bendy legs from his birthday, holding it out in front of him like a flashlight.\n\n\"Everybody keeps posting the lights,\" he said. \"White lights over South Mountain, real low, no sound. Two hundred comments under every video, and it's aliens, it's ghosts, it's the end of the world.\" He turned the phone so they could see the screen. \"It's drones. Or it's planes coming into the airport and the angle is weird. I'm going to get it clear, from close, and put it up, and that's the end of it.\"\n\n\"From close how?\" Yadiel asked.\n\n\"From the pull-off. Right over top of where they come up.\"\n\nYadiel Rosario was thirteen too, and he was the tallest of them by a head. That day he was wearing his older brother's William Allen hoodie with the canary on the front, and the sleeves hung down past his fingers. His family was Puerto Rican, and his abuela lived with them in the back bedroom of a row house off Fourth Street. Every morning she prayed out loud in the kitchen with the radio turned up, so the whole house got prayed for whether people were awake or not.\n\n\"My abuela says don't go up the mountain after dark,\" he said.\n\n\"So we come down before dark.\"\n\n\"Sunset is at six-thirty,\" Dani said. She had looked it up on her phone at lunch, because she had known since Wednesday that they were going up there whether she said yes or no. \"We have three hours.\"\n\nThe fourth kid was Bryce Kressley, who was eleven and in the sixth grade, and small for his age. He lived two doors down from Isaiah with his grandmother, who said \"ach\" whenever she dropped a pot lid and always kept a jar of pickled eggs in the refrigerator door. Bryce was carrying her binoculars around his neck in a cracked leather case. Every fall she used them to count hawks up at Hawk Mountain, and she had let him bring them along only after making him promise twice at the front door that he would have them back home before dark.\n\nThey walked a couple of blocks up Emaus and turned onto a side street that kept climbing past the last houses, where the sidewalk ended and the patchy pavement gave out into a gravel shoulder under the trees. Everyone who went to South Mountain knew where the path was. It started behind a yellow sign saying the road wasn't maintained in winter, and it went up through the woods in a long zigzag that had been worn down to dirt and roots by about a hundred years of kids.\n\nIt was warm for an October afternoon, warm enough that all four of them were sweating inside of ten minutes. The oaks were just starting to turn brown, while the poplars had already dropped their leaves, so the path was covered in dry leaves that crunched under their feet and slid a little before catching. Dani was wearing her flat black school shoes with no grip on the soles, and twice she slipped down onto one knee. The second time it happened, Yadiel reached his hand back without turning around, and she took it so he could pull her up the steep part. Neither one of them said anything about it afterward. Halfway up the hill, a single white roller skate with pink laces was lying on its back in the leaves beside the trail, and all four of its wheels were gone. Bryce poked it with his sneaker as he walked past, and that was all anyone did with it.\n\nIsaiah talked most of the way up the trail, going on about frame rates and the zoom on his phone, and how people would believe almost anything they saw in a video if it was blurry enough. Bryce asked him what he thought the lights were if they turned out not to be drones, and Isaiah said they were going to be drones.\n\n\"But if it isn't,\" Bryce said.\n\n\"Then it's planes.\"\n\n\"But if it isn't planes.\"\n\nIsaiah stopped on the path and put both hands on his knees to catch his breath. \"My mom says people see what they need to see,\" he said. \"She says that's what church is. People needed a story, so they got one. She quit going when I was eight.\"\n\nYadiel said, \"My abuela says your mom is going to come back.\"\n\n\"Your abuela says that about everybody.\"\n\n\"She's been right about a lot of everybody,\" Yadiel said, and he kept walking up the path ahead of them, which was the end of that conversation.\n\nThey came out of the trees at the top a little after five, stepping onto the road shoulder right above the pull-off with their faces red and all four of them breathing hard. No one else was up there, though a car had turned around in the lot not long before and left fresh tire tracks curved across the gravel. The only sounds were the wind moving through the sumac below the rail and the traffic way down on the city streets.\n\nBelow the guardrail, the sumac had turned as deep red as a stop sign, the way it always does in October, running down the slope in a thick tangle into the scrub oak and the backyards of the first houses. Off to their left, the flat orange sun was dropping out toward Trexlertown and throwing long shadows from every church steeple and smokestack across the roofs. Right in the middle of downtown, the tall pale PPL Building stood above the rest of the skyline with its top lights already on, the same as every night anyone in town could remember. Hamilton Street ran east from there as its streetlights came on one by one. Past that was the dark cut of the Lehigh River, and far off to the right, beyond the fold of the hills, the old steel stacks in Bethlehem were lit up in colored lights against the sky. A slow freight train was rolling along the river, and at every crossing the engineer gave two long pulls on the horn, with the sound taking a couple of seconds to reach them up on the mountain.\n\nIsaiah wrapped the bendy tripod legs around the top of a guardrail post until the phone sat tight, and then he aimed the camera over the sumac and hit record. The steel rail felt cold through the sleeve of Dani's coat when she leaned against it. Years back, someone had painted J.R. + M.T. in silver on the post beside her, and most of the M had flaked away.\n\nThey stood there waiting while the sun dropped behind the far ridge, and the city shifted from orange to blue as the streetlights took over. Bryce kept the binoculars up to his eyes and called out whatever he spotted, which was a man walking a dog in a park, a city bus, and a pigeon sitting on top of a church. Yadiel opened a bag of chips he had been saving since lunch and started eating them by himself, until Dani looked over at him and he held the bag out to share.\n\nAt twenty minutes to seven, the first light came up out of the sumac.\n\nIt was close, which was the first thing wrong about it. Everyone in the video comments had talked about lights high up in the sky over the mountain, but this one was down below them. It rose out of the red bushes about a hundred feet down the slope and stopped even with the tops of the scrub oak, so the four kids were looking down at it with the city spread out behind it. The light was white and about the size of a basketball, and it didn't blink. Then a second one came up beside it, followed by a third, and all three hung there in a row in the dusk without making a sound.\n\n\"Drones,\" Isaiah said.\n\n\"There's no buzz,\" Bryce said, looking through the binoculars. \"There's no propellers. I can see the bushes right through the bottom of them. Isaiah, there's no anything holding them up.\"\n\nIsaiah's phone was still recording on the post, lighting his face up white from the screen, and he didn't reach for it.\n\nAll four of their phones lit up at the same time. Dani's buzzed in her coat pocket, Yadiel's buzzed in the front of his hoodie, and Bryce's went off in his back pocket loud enough to make him jump. Then the speaker on Isaiah's phone clicked on, and a voice came out of it that sounded like the map lady on a phone, the one that tells a driver to turn left in four hundred feet, calm and friendly and a little slow.\n\n\"Isaiah,\" the voice said. \"You came to see us. Go ahead and ask.\"\n\nYadiel reached out and grabbed a fistful of the back of Isaiah's hoodie. Isaiah didn't try to shake him off. He stood at the rail with his mouth slightly open, then closed it and set his jaw the way he did in science class whenever Mr. Ortiz said something he didn't buy.\n\n\"How many cars on that train?\" Isaiah said.\n\n\"Ninety-one,\" said the map lady.\n\n\"Bryce,\" Isaiah said. \"Count it.\"\n\nBryce swung the binoculars over toward the river. His hands were shaking so hard that he had to brace both elbows on the cold steel rail, and he counted the cars out loud under his breath. It took a couple of minutes because the train was long and the back half of it was passing behind buildings. Nobody moved while he counted, and when he reached the end he lowered the binoculars and didn't say the number right away.\n\n\"Ninety-one,\" he said.\n\n\"What's my grandmother's middle name?\" Isaiah asked.\n\n\"Loretta,\" said the voice, and Isaiah's hand closed tight on the top of the guardrail.\n\n\"We were here before your city,\" the map lady said. \"We were here before the river had its name. We made the first of you, ages ago, and then we went away, and now we have come back for the ones who can see. You can see, Isaiah. The others are not ready. Step over the rail and come down, and we will show you where you came from. You can bring your camera.\"\n\nThe three lights drifted a little closer up the slope. Underneath them the sumac started moving, with all the red leaves flipping over to show their pale undersides even though there wasn't any wind on the kids' faces.\n\nIsaiah put his palm flat on top of the rail, and then he lifted his left knee up onto the steel.\n\n\"Isaiah,\" Yadiel said. \"No, bro. No.\"\n\n\"They answered,\" Isaiah said. \"They answered everything. You heard them.\"\n\nIsaiah swung his leg over to the far side. Past the guardrail there was only about two feet of loose gravel before the sumac dropped straight down the slope with nowhere to set a foot. His sneaker hit the gravel and slid out from under him, and he had to grab the rail to catch himself. Yadiel still had a fistful of his hoodie. Bryce let the binoculars drop against his chest, grabbed the back of Isaiah's belt with both hands, and sat down hard in the gravel with his heels dug in, the way someone holds a big dog on a leash.\n\nDani unzipped the front pocket of her backpack.\n\nShe had never once opened it at school, and now her fingers were stiff from the cold as she pulled the Bible out and held it closed against her coat with both hands. Back in Santiago, sitting on the edge of the bed while the fan ran, her mother had told her one thing that she had never needed to use until tonight. If a voice ever came to her and didn't seem right, her mother had said, she should ask it about Jesus, and ask if He came in the flesh. Anything from God would tell her yes, and the others wouldn't say it.\n\n\"Una pregunta,\" Dani said. Her voice came out small at first, so she spoke up louder. \"¿Jesucristo vino en carne? Sí o no.\" Then she said it again in English for the boys, slow and careful, the way she read out loud in Mrs. Bauer's class. \"I have one question. Jesus Christ came in the body. Yes or no?\"\n\nIsaiah's phone stayed silent on top of the post, with the little red recording dot still blinking in the corner of the screen.\n\nThe three lights hung over the sumac, and the leaves underneath them stopped moving. Down by the river, the train blew its horn for another crossing, and the sound climbed the mountain and faded past them.\n\n\"Answer her,\" Isaiah said.\n\nHe was still straddling the wrong side of the rail, with one leg over the edge and Bryce's full weight pulling back on his belt.\n\n\"You did the train,\" he said. \"You did my grandma. Answer her. It's a yes or a no.\"\n\n\"Isaiah,\" said the map lady, in that same friendly voice. \"Come down.\"\n\n\"Answer her question first.\"\n\n\"Come down, Isaiah. The others are not ready.\"\n\nIsaiah stood there with the phone screen lighting up his face, and it was clear he was working through it the same way he worked through a test at school. They had passed both of the checks he gave them. They knew the train count and they knew his grandmother's name, but there was one question they wouldn't touch, and it was Dani's. He looked down at the lights, then over at the small blue Bible in Dani's hands, and back to the lights again. Then he swung his leg back over the guardrail. His knee bumped the tripod and spun it halfway around on the post, knocking Bryce backward into the gravel, and Isaiah planted his feet on the safe side of the rail with both hands holding tight to the steel.\n\nThe lights came up the hill.\n\nThey came fast and all together, tearing up through the sumac and the scrub oak while the bushes thrashed underneath them like a herd of deer bolting up the slope. All four of their phones started buzzing at once and wouldn't quit. From Isaiah's speaker the map lady's voice started repeating turn left, turn left, turn left, getting faster and faster until the words ran together into one sound. Up close the lights looked much bigger and had lost their round shape, though none of the four kids would ever agree later on what shape they had turned into.\n\nYadiel let go of Isaiah's hoodie and stepped up to the guardrail in front of the other three. He spoke the way his abuela had spoken in the kitchen the time the pan grease caught fire, loud and flat and sure while she reached for the lid with her other hand.\n\n\"En el nombre de Jesús,\" he said. \"In the name of Jesus. Get off this mountain.\"\n\nThe lights stopped about twenty feet down the slope, halting so hard it looked like they had slammed into an invisible fence, and they hung there shaking. Then all three dropped straight down into the sumac like stones into a pond and shot out the bottom, skimming low over the rooftops, across Hamilton Street, and out over the river toward the dark around the airport until the kids couldn't tell them from the city lights anymore.\n\nEvery phone shut off at once. The regular wind came back up through the sumac, and they could hear the traffic down on the streets again.\n\nThat was when Bryce realized his grandmother's binoculars were gone. The thin strap on the binoculars had snapped when he sat down hard in the gravel, leaving only the empty leather case hanging around his neck on its own strap. He felt around in the dark gravel where he had been sitting, and when he didn't find them he got up on his knees and looked over the rail, where the steep slope dropped away into the dark red bushes.\n\n\"Those are my grandma's,\" he said. \"Those are for the hawks.\"\n\n\"Nobody goes over that rail,\" Yadiel said. \"Not tonight. Not for anything.\"\n\nBryce stayed on his knees looking down into the dark bushes, and then he stood up, brushed the gravel off the seat of his jeans, and didn't go over.\n\nThey walked down the mountain path in the dark. Halfway down the trail, Isaiah's phone came back on by itself with four percent battery left, so he turned on the flashlight and walked in front with his arm held out ahead of them, and nobody said a word the rest of the way. Dani carried the blue Bible in her hand the whole walk down instead of putting it back in her backpack. When they came out onto the first street with houses at the bottom, a man was standing on a stepladder on his front porch, either stringing Christmas lights along the gutter in the middle of October or taking down last year's, and they never did figure out which one he was doing.\n\nThat night Isaiah plugged his phone in to charge on his bedroom floor and sat with his back against the bed while the radiator under the window ticked and knocked, warming up for the first time that fall. The two hundred comments he had been counting on never happened, because every video he had shot that evening was gone from his phone except for one eleven-second clip. When his knee bumped the tripod, it had spun the phone halfway around on the post, so for those eleven seconds the camera was pointing back at the four of them instead of out over the city. The clip shows Isaiah's leg coming back over the guardrail, Bryce falling backward into the gravel, Yadiel letting go of the hoodie to step up to the rail, and Dani in her coat holding the small blue Bible against her chest with both hands. Behind Dani, standing on the pull-off gravel where nobody had been a second earlier, there's a tall shape that stands a good deal higher than any grown man. Its back is turned to the camera, and one of its hands is resting on the guardrail right beside Dani as it faces down the hill the same way she is. None of the four kids saw anyone standing there at the time. Isaiah watched those eleven seconds about forty times that night, but he didn't post the video, and he still hasn't posted it. If anyone asks him about that night, he says the tall one never turns around, and he would really like to know who it is.\n\nOn Monday morning, while the kitchen radio was giving the traffic report on Route 22, Dani's mother picked up the blue Bible from the table to zip it into the front pocket of the backpack like she always did. Before she could do it, Dani took the Bible from her mother's hands and slid it into the right pocket of her own coat, where she could reach it fast. Her mother let her keep it there, and she stood in the doorway watching Dani walk down the steps toward Emaus Avenue with her hand inside that pocket and her thumb resting on the zipper pull."}
    ]},
    {id:"tvn-the-hills-above-allentown-screenplay", title:"The Hills Above Allentown", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Screenplay", status:"Draft", freeChapterCount:2, companionGroup:"tvn-01-hills", role:"screenplay", blurb:"Teleplay of The Hills Above Allentown. Four kids on South Mountain after the last bell.", pdfUrl:"/pdfs/tvn-01-the-hills-above-allentown-teleplay.pdf", chapters:[
      {label:"Front Matter", text:"The Hills Above Allentown\n\nTeleplay\n\nby Douglxss Burley Johnson / d.b.j.\n\nA Thin Veiled Night"},
      {label:"The Hills Above Allentown", text:"INT. DANI'S KITCHEN - FRIDAY MORNING\n\nDANI'S MOTHER stands at the kitchen table with Dani's backpack open. She picks up a small paperback-sized SPANISH BIBLE with a blue vinyl cover and a zipper around three sides like a pencil case, and opens the front cover.\n\n\"Daniela Peña Almonte\" is written in ballpoint, pressed hard enough to show through on the back.\n\nShe zips the Bible into the front pocket of the backpack. Then she zips DANI PEÑA ALMONTE (12, seventh grade) into her coat up to the chin and pulls her braid out from under the collar. Dani has on flat black school shoes, and with the Bible inside, the backpack hangs a little heavier on the left.\n\nCUT TO:\n\nEXT. SOUTH MOUNTAIN MIDDLE SCHOOL / FRONT STEPS - AFTERNOON\n\nThe last bell rings, and kids pour onto Emaus Avenue. A CUSTODIAN is on the walk with a push broom, sweeping a busted bag of Takis into a dustpan while the wind picks up the red pieces and blows them down the steps.\n\nISAIAH WHITFIELD (13, eighth grade) already has his phone screwed onto a small bendy-leg tripod from his birthday, holding it out in front of him like a flashlight.\n\nYADIEL ROSARIO (13, eighth, tallest by a head) wears his older brother's William Allen hoodie with the canary on the front, the sleeves hanging past his fingers.\n\nDani stands there with that backpack, her braid over her collar.\n\nBRYCE KRESSLEY (11, sixth, small for his age) carries a cracked leather binocular case around his neck on a strap. The binoculars inside belong to his grandmother, who takes them to Hawk Mountain every fall to count hawks, and she only let him bring them today if he's home by dark.\n\nISAIAH\nEverybody keeps posting the lights. White lights over South Mountain, real low, no sound. Two hundred comments under every video, and it's aliens, it's ghosts, it's the end of the world.\n\nHe turns the phone so they can see the comment threads under blurry white blobs.\n\nISAIAH (CONT'D)\nIt's drones. Or it's planes coming into the airport and the angle is weird. I'm going to get it clear, from close, and put it up, and that's the end of it.\n\nYADIEL\nFrom close how?\n\nISAIAH\nFrom the pull-off. Right over top of where they come up.\n\nYADIEL\nMy abuela says don't go up the mountain after dark.\n\nISAIAH\nSo we come down before dark.\n\nDANI\nSunset is at six-thirty. We have three hours.\n\nBryce touches the binocular case to make sure it's still there.\n\nBRYCE\nGrandma said twice. Home by dark.\n\nISAIAH\nThen we go now.\n\nThey start up Emaus while the custodian loses more Takis to the wind and keeps sweeping.\n\nEXT. SIDE STREET CLIMBING SOUTH MOUNTAIN - CONTINUOUS\n\nThey pass the last houses, where the sidewalk ends under their feet and the patchy pavement gives out into a gravel shoulder and trees.\n\nBehind a yellow sign saying the road isn't maintained in winter, a path starts up through the woods in a long zigzag worn down to dirt and roots by about a hundred years of kids.\n\nEXT. SOUTH MOUNTAIN PATH - CONTINUOUS\n\nIt's warm for October, and they're sweating inside ten minutes. The oaks are just starting to turn brown, while the poplars have already dropped their leaves, which crunch and slide under their feet.\n\nIsaiah talks most of the way up about how to shoot clear video, how to zoom in, and how a blurry clip can make people believe almost anything.\n\nDani's school shoes have no grip, and she slips onto one knee in the leaves. Yadiel reaches a hand back without turning, and she takes it so he can pull her up the steep part. Neither mentions it.\n\nHalfway up, a single white roller skate with pink laces is lying on its back in the leaves beside the path, and all four wheels are missing. Bryce pokes it with his sneaker as he walks past, and that's all anyone does with it.\n\nBRYCE\nWhat if it isn't drones.\n\nISAIAH\nThen it's planes.\n\nBRYCE\nWhat if it isn't planes.\n\nIsaiah stops on the path and puts both hands on his knees to catch his breath.\n\nISAIAH\nMy mom says people see what they need to see. She says that's what church is. People needed a story, so they got one. She quit going when I was eight.\n\nYADIEL\nMy abuela says your mom is going to come back.\n\nISAIAH\nYour abuela says that about everybody.\n\nYADIEL\nShe's been right about a lot of everybody.\n\nYadiel walks on up ahead, and that's the end of that.\n\nEXT. SOUTH MOUNTAIN OVERLOOK - LATER\n\nThey come out of the trees onto the shoulder right above the pull-off a little after five, all four of them breathing hard with their faces red.\n\nThe pull-off is a wide gravel lot on the city side of the mountain with room for six cars and a steel guardrail at the edge. Nobody else is there, though fresh tire tracks curve through the gravel. Wind moves the sumac below the rail, with traffic way down below.\n\nThe sumac has turned deep red like a stop sign, running down into scrub oak and the backs of the first houses. To the left, the flat orange sun drops toward Trexlertown and throws long shadows from every steeple and smokestack across the roofs.\n\nDowntown, the pale PPL Building stands above the rest with its top already lit. East along Hamilton, the streetlights come on one after another. The Lehigh River cuts a dark line through the middle, and to the right, past the hills, Bethlehem's old steel stacks glow in colored lights against the sky.\n\nDown by the river a slow freight train rolls along, and at a crossing the horn gives two long pulls. The sound takes a second or two to climb the mountain to them.\n\nIsaiah wraps the tripod legs around a guardrail post until the phone sits tight, then aims it over the sumac and hits record.\n\nThe rail feels cold under Dani's coat sleeve when she leans on it. Years back, someone painted J.R. + M.T. in silver on the post beside her, and most of the M has flaked off.\n\nThey wait.\n\nBehind the far ridge the sun goes down, and the roofs turn from orange to blue as the streetlights start to matter.\n\nBryce keeps the binoculars up and calls what he spots.\n\nBRYCE\nMan walking a dog in a park. Bus. Pigeon on a church.\n\nYadiel eats from a bag of chips he's saved since lunch and doesn't share them, until Dani looks at him and he shares them.\n\nEXT. SOUTH MOUNTAIN OVERLOOK - DUSK\n\nTwenty minutes to seven.\n\nPast the rail the hillside drops fast through red sumac and crooked little oaks. Allentown is spread out below them, its lights scattered across the dark like a jar tipped over on a table.\n\nBelow them, the first light comes up out of the sumac.\n\nIt rises out of the red bushes about a hundred feet down the slope and stops even with the scrub-oak tops, so the kids look down at it with the city lights behind it. That's the first thing wrong with it, because everyone talked about lights in the sky, and this one is below them.\n\nThe light is white and about the size of a basketball, and it doesn't blink.\n\nA second light comes up beside it, then a third, and all three hang in a row in the dusk without a sound.\n\nISAIAH\nDrones.\n\nBRYCE\nThere's no buzz. There's no propellers. I can see the bushes right through the bottom of them. Isaiah, there's no anything holding them up.\n\nIsaiah's phone keeps recording on the post, lighting his face white from the screen, and he doesn't reach for it.\n\nAll four phones light up together. Dani's buzzes in her coat, Yadiel's in his hoodie, and Bryce's goes off in his back pocket loud enough to make him jump.\n\nThen Isaiah's phone speaker clicks on, and out comes the map lady's voice, calm and friendly and a little slow, the same tone she uses to say turn left in four hundred feet.\n\nMAP LADY (ON PHONE)\nIsaiah. You came to see us. Go ahead and ask.\n\nYadiel reaches out and grabs a fistful of the back of Isaiah's hoodie. Isaiah doesn't shake him off, standing at the rail with his mouth slightly open before he closes it and sets his jaw.\n\nISAIAH\nHow many cars on that train?\n\nMAP LADY (ON PHONE)\nNinety-one.\n\nISAIAH\nBryce. Count it.\n\nBryce swings the binoculars to the river. His hands shake, so he braces his elbows on the rail and counts out loud under his breath. The train is long, the back half going behind buildings, and nobody moves.\n\nHe lowers the binoculars and doesn't say the number right away.\n\nBRYCE\nNinety-one.\n\nISAIAH\nWhat's my grandmother's middle name?\n\nMAP LADY (ON PHONE)\nLoretta.\n\nIsaiah's hand closes tight on the guardrail top.\n\nMAP LADY (ON PHONE) (CONT'D)\nWe were here before your city. We were here before the river had its name. We made the first of you, ages ago, and then we went away, and now we have come back for the ones who can see. You can see, Isaiah. The others are not ready. Step over the rail and come down, and we will show you where you came from. You can bring your camera.\n\nThe three lights drift a little closer uphill. Under them the sumac moves, red leaves flipping over to show pale undersides even though there's no wind on the kids' faces.\n\nIsaiah puts a palm flat on the rail top, then brings his left knee up onto the steel.\n\nYADIEL\nIsaiah. No, bro. No.\n\nISAIAH\nThey answered. They answered everything. You heard them.\n\nIsaiah swings a leg across. Past the rail there's only about two feet of loose gravel before the sumac drops away with nowhere solid to step. His sneaker hits the gravel and slides, and he grabs the rail to catch himself.\n\nYadiel keeps a fistful of the hoodie. Bryce lets the binoculars drop against his chest, grabs Isaiah's belt from behind with both hands, and sits down hard in the gravel with his heels dug in.\n\nDani unzips the front pocket of her backpack with her fingers stiff from the cold.\n\nFLASHBACK TO:\n\nINT. BEDROOM - SANTIAGO, DOMINICAN REPUBLIC - NIGHT (YEARS EARLIER)\n\nDani's mother sits on the edge of the bed while a fan runs in the window, and younger Dani listens from the pillow.\n\nDANI'S MOTHER\nIf a voice comes to you and it is not right, ask it about Jesus. Ask it if He came in the flesh. If they are from God they will tell you yes. The others will not say it.\n\nBACK TO:\n\nEXT. SOUTH MOUNTAIN OVERLOOK - DUSK\n\nDani pulls out the small Spanish Bible and holds it shut against her coat with both hands.\n\nDANI\nUna pregunta.\n\nHer voice comes out small, so she makes it louder.\n\nDANI (CONT'D)\n¿Jesucristo vino en carne? Sí o no.\n\nThen she says it in English, slow and careful.\n\nDANI (CONT'D)\nI have one question. Jesus Christ came in the body. Yes or no?\n\nIsaiah's phone stays silent on the post, with the little red record dot still blinking.\n\nThe three lights hang over the sumac, and the leaves under them stop moving. Down below, the train blows for another crossing, and the sound climbs the mountain and goes past them.\n\nISAIAH\nAnswer her.\n\nHe's still on the wrong side of the rail, one leg across, with Bryce's full weight pulling on the back of his belt.\n\nISAIAH (CONT'D)\nYou did the train. You did my grandma. Answer her. It's a yes or a no.\n\nMAP LADY (ON PHONE)\nIsaiah. Come down.\n\nISAIAH\nAnswer her question first.\n\nMAP LADY (ON PHONE)\nCome down, Isaiah. The others are not ready.\n\nIsaiah stands there with the phone screen lighting his face, looking from the lights to the small blue Bible in Dani's hands and back again, the way he does when a science answer doesn't add up.\n\nThen Isaiah swings his leg back over to the safe side. His knee bumps the tripod and spins it halfway around on the post, knocking Bryce backward into the gravel, and Isaiah plants his feet with both hands holding tight to the rail.\n\nThe lights come up the hill.\n\nThey rush up the hill together, tearing through sumac and scrub oak while the brush under them thrashes like a herd of deer bolting through.\n\nEvery phone buzzes and won't quit. From Isaiah's phone the map lady starts up again:\n\nMAP LADY (ON PHONE)\nTurn left. Turn left. Turn left.\n\nIt speeds up until the words run together.\n\nUp close the lights are bigger and have lost their round shape, though none of the four will ever agree afterward on what shape they turned into.\n\nYadiel lets go of Isaiah's hoodie, steps up to the guardrail ahead of the other three, and speaks the way his abuela spoke in the kitchen when grease caught fire in the pan, loud and flat and sure.\n\nYADIEL\nEn el nombre de Jesús. In the name of Jesus. Get off this mountain.\n\nThe lights stop about twenty feet down the slope, halting so hard it's like they ran into the guardrail, and they hang there shaking.\n\nThen they drop.\n\nAll three lights drop into the sumac like stones into a pond and shoot out the bottom, skimming low over the rooftops, across Hamilton Street and the river, and out into the dark toward the airport until the four kids can't tell them from any other light.\n\nEvery phone shuts off at once.\n\nThe regular wind comes back up through the sumac, and down on the streets they hear the traffic again.\n\nBryce finds out his binoculars are gone. The strap snapped when he sat down hard, leaving only the empty leather case hanging from its own strap around his neck. He feels around in the gravel where he was sitting, and they aren't there, so he gets up on his knees and looks over the rail at the slope dropping into the dark red bushes.\n\nBRYCE\nThose are my grandma's. Those are for the hawks.\n\nYADIEL\nNobody goes over that rail. Not tonight. Not for anything.\n\nBryce stays on his knees looking down into the dark, and then he stands up, brushes gravel off the seat of his jeans, and stays on this side of the rail.\n\nEXT. SOUTH MOUNTAIN PATH - NIGHT\n\nThey walk down the path in the dark. Halfway down, Isaiah's phone comes back on with four percent left, and he turns on the flashlight and leads with his arm held out ahead. Nobody talks the whole way.\n\nDani carries the Bible in her hand the whole walk down and never puts it back in the pocket.\n\nEXT. BOTTOM OF THE HILL / RESIDENTIAL STREET - NIGHT\n\nAt the bottom they come out onto a street with houses. On a porch a MAN stands on a stepladder working on Christmas lights along the gutter in mid-October, hanging them or taking last year's down, and he doesn't look down at them.\n\nThey walk past under him without stopping.\n\nINT. ISAIAH'S BEDROOM - NIGHT\n\nIsaiah sits on the floor with his back against the bed while his phone charges. Under the window the radiator ticks and knocks as it warms up for the first time this fall.\n\nOn the phone, every video from that evening is gone except one eleven-second clip.\n\nHe plays it.\n\nOn the screen, his knee has bumped the tripod and spun the phone halfway around on the post, so for those eleven seconds the camera points back at the four of them instead of out over the city.\n\nIsaiah's leg comes back over the guardrail, Bryce falls backward in the gravel, Yadiel lets go of the hoodie to step up to the rail, and Dani in her coat holds the small blue Bible against her chest with both hands.\n\nBehind Dani, standing on the pull-off gravel where no one had been, there's a TALL SHAPE that's taller than any grown man by a good deal. Its back is to the camera, and one hand rests on the guardrail beside her as it faces down the hill the same way she does.\n\nNot one of the four saw it standing there.\n\nIsaiah watches those eleven seconds over and over, and he doesn't post it, and never does.\n\nThe tall one never turns around.\n\nIsaiah sits with the phone in both hands and watches the shape that won't turn.\n\nINT. DANI'S KITCHEN - MONDAY MORNING\n\nThe radio on the counter gives the traffic on Route 22.\n\nDani's mother reaches for the blue Bible on the kitchen table to zip it into the backpack's front pocket like she did on Friday morning.\n\nBefore her mother can finish, Dani takes the Bible from her hands and slides it into her own coat pocket on the right, where she can reach it.\n\nHer mother lets her, and from the doorway she watches Dani walk down the steps toward Emaus Avenue with one hand in that pocket and her thumb on the zipper.\n\nFADE OUT."}
    ]},
{id:"tvn-the-hills-above-allentown-study", title:"After the Story: The One Question the Lights Would Not Answer", subtitle:"Douglxss Burley Johnson / d.b.j.", series:"A Thin Veiled Night", year:2026, type:"Non-fiction", status:"Draft", freeChapterCount:6, companionGroup:"tvn-01-hills", role:"after-story", blurb:"Companion study to The Hills Above Allentown.", pdfUrl:"/pdfs/tvn-01-the-hills-above-allentown-study.pdf", chapters:[
      {label:"Front Matter", text:"After the Story: The One Question the Lights Would Not Answer\n\nby Douglxss Burley Johnson / d.b.j.\n\nA companion study to The Hills Above Allentown"},
      {label:"Back Up the Mountain", text:"Let's pull a chair in closer and go back up South Mountain one more time.\n\nThe pull-off sat right at the edge, with a steel guardrail so cold Dani could feel it through her coat sleeve. Down the slope the sumac had turned red as a stop sign, and past it the whole city of Allentown was coming on one streetlight at a time.\n\nThen the lights came up out of the red bushes, and the map lady started talking out of Isaiah's phone.\n\nIsaiah Whitfield did what a smart kid ought to do with a voice like that, and he tested it. He asked how many cars were on the freight train, and when the voice said ninety-one, Bryce braced his shaking elbows on the rail and counted every car until he got ninety-one. Isaiah asked for his grandmother's middle name, and the voice said Loretta. Every question he had, they passed, and they still wanted him over that rail.\n\nThen a twelve-year-old girl in flat black school shoes pulled a small blue Bible out of her backpack and held it against her coat. She asked the one question her mother had given her years earlier in Santiago while sitting on the edge of the bed with the fan running. \"¿Jesucristo vino en carne? Sí o no.\" Jesus Christ came in the body. Yes or no?\n\nThe lights that knew the train and knew Loretta wouldn't say a word to that one question. Even Isaiah, with one leg over the guardrail and Bryce hanging off the back of his belt, told them, \"It's a yes or a no.\"\n\nThat silence is what we're going to talk about tonight."},
      {label:"Questions to Sit With", text:"1. The lights got every one of Isaiah's questions right, and they were still trying to get him over the guardrail. Read Deuteronomy 13:1-3 and 2 Corinthians 11:14. Why can a voice be right about a lot of facts and still be lying about the one that matters most?\n\n2. Read 1 John 4:1-3. Out of every question in the world, why did John give the church that one, about Jesus Christ coming in the flesh, as the test?\n\n3. Read Acts 19:13-16, then think about Yadiel stepping up to the rail in his brother's William Allen hoodie. He spoke the Name the way his abuela said it the day the grease caught fire. Why did the name of Jesus work for Yadiel on that mountain, when it went so badly for the sons of Sceva?"},
      {label:"The Teaching: Test the Spirits", text:"The apostle John was an old man when he wrote the letter we call 1 John. The churches he loved had teachers coming through who claimed the Spirit had told them new things, and many Bible teachers think some of them said the Son of God never really had a body. John's answer is plain: don't believe every spirit, test them. Any spirit that confesses that Jesus Christ has come in the flesh is from God, and any spirit that won't confess Jesus isn't from God (1 John 4:1-3). In the first lines of that same letter he talks about the One he heard, saw with his own eyes, and touched with his own hands (1 John 1:1).\n\nIsaiah's instinct to test was a good one, and God isn't afraid of being checked. Norman Geisler and Frank Turek point out that the Bible itself tells believers to question religious claims, listing 1 John 4:1 and Deuteronomy 13 among the places it does (Geisler and Turek, ch. 1, p. 47). His tests were good as far as they went, since ninety-one was a real number and Bryce counted it car by car. The gap was that every test Isaiah picked was one the lights could pass. In Deuteronomy 13, Moses warned Israel about a prophet whose sign comes true and who then says, let's go follow other gods, telling the people not to listen to him. Paul says that Satan dresses himself up as an angel of light (2 Corinthians 11:14), and a light that can count train cars is still only a light.\n\nJohn Lennox is a mathematician at Oxford who has spent years answering people who think science can explain everything. He calls that belief scientism, and he says plainly that \"Reason has a far larger scope than science\" (Lennox, ch. 2). His picture is his Aunt Matilda's cake. The world's best scientists can test every protein and particle in it, and still none of them can say why she baked it unless she tells them herself. Isaiah's phone and his questions could measure the lights, but they could never tell him whose side the lights were on. Lennox says we only get to know a person when that person reveals himself, usually by speaking, and the Bible's big claim is that God has spoken in His Son (Lennox, ch. 9). Did that Son come in the flesh? That was the question Isaiah never got around to asking until Dani asked it.\n\nWe should be careful here, because the story never says the lights couldn't say the name of Jesus, and the Bible never says evil spirits can't. In Mark 5:7 the spirits in the man from the tombs call Jesus the Son of the Most High God, and James 2:19 says the demons believe in one God and shudder. John's test asks for a confession. Will this voice agree, out loud and on God's side, that Jesus Christ came in the flesh? The lights could have said the word Jesus any time they wanted, yet they wouldn't give Dani her yes.\n\nThink about why that question stopped them cold. \"We made the first of you,\" the map lady said. \"We were here before your city.\" That's the old ancient-astronaut story in new clothes, which is the idea that beings from out in space made us or planted life here. Geisler and Turek note that even a few well-known scientists have floated the idea that aliens planted the first life on earth, and then they ask the obvious next question: \"who made the intelligent aliens?\" (Geisler and Turek, ch. 5, p. 121). The claim only pushes the mystery back a step.\n\nThe Bible gives a straight answer, saying God made the first of us (Genesis 1:27), and from one man He made every nation on the earth (Acts 17:26). Then the Maker did the thing no fake maker would ever own up to. He came down into His own world, took on a body, and died on a cross. On the third day He walked out of the tomb in that same body and told His friends to touch Him and see (John 1:14; Luke 24:39). A voice that claims to be our maker can't say yes to Dani's question without admitting there's a real Maker, that He came in the flesh, and that the voice isn't Him. So it says nothing at all.\n\nThat's why the resurrection matters so much. Paul writes that Christ died for our sins, was buried, and was raised on the third day, and then he names who saw Him: Peter, the Twelve, more than five hundred people at once with most of them still alive to ask, then James, then Paul himself (1 Corinthians 15:3-8). If Christ wasn't raised, Paul says, our faith is useless (15:17). Working through that passage, Josh and Sean McDowell say the faith rises or falls with the resurrection (McDowell and McDowell, Bible Handbook, \"Difficult Verses from the Books of 1 & 2 Corinthians\"). In More Than a Carpenter they put it this way: \"The Resurrection takes the question 'Is Christianity valid?' out of the realm of philosophy and makes it a question of history\" (ch. 10). History is something anyone can check.\n\nThe Name works the same honest way. In Acts 19, seven sons of a man named Sceva tried to drive out an evil spirit by saying, in the name of the Jesus that Paul preaches, borrowing a name that didn't belong to them. The spirit answered that it knew Jesus and knew Paul, but who were they? Then the man jumped on them and beat them until they ran out of the house hurt and stripped (Acts 19:13-16). The Name carries power for people who belong to Jesus when they call on the One it belongs to. Yadiel learned it in a kitchen where his abuela prayed out loud every morning over the radio, and when he said it loud and flat and sure, the lights stopped like they had run into the guardrail.\n\nCourage comes from the same place. Dani's voice came out small, and she made it louder. Paul told young Timothy that the Spirit God gives us is a Spirit of power and love and a sound mind, and fear didn't come from Him (2 Timothy 1:7). In Acts 4 the first believers had just been threatened by the authorities, and they asked God for boldness to keep speaking. The place shook, they were all filled with the Holy Spirit, and they went out and spoke God's word boldly (Acts 4:29-31). The McDowells point to the apostles themselves, who ran and hid when Jesus was arrested and then preached in the open after they saw Him alive: \"They became courageous almost overnight\" (More Than a Carpenter, ch. 7).\n\nAnd the tall one in Isaiah's eleven seconds of video? The story never says, so I won't either, though Hebrews 1:14 does tell us God sends His angels to serve the people who belong to Him."},
      {label:"Around the Fire: Talk It Over and Take It Home", text:"Let's start with Isaiah, whose mom told him people see what they need to see, and that church was a story people needed. That's a real objection, and it deserves a real answer. Christianity invites the checking, and Paul's note that most of the five hundred were still alive was his way of saying go ask them. Sean McDowell writes that this generation grew up with endless information in their hands and checks what it hears, so the people answering them have to learn that \"truth must be wedded to grace\" (McDowell, \"Introduction\"). When a friend is like Isaiah, be like Yadiel with a fist in the back of that hoodie, and hang on. Anyone who's the Isaiah in the group should bring those questions out. Isaiah still wants to know who the tall one is, and wanting to know is a good place to start.\n\nLet's also talk about the rail. When the strap snapped, Bryce got up on his knees and looked over the rail into the dark after his grandmother's binoculars, which she used to count hawks. Yadiel told him nobody goes over that rail, not tonight and not for anything, and Bryce brushed the gravel off his jeans and stayed. Growing up clean means knowing where the rails are before the night they're needed. Paul told Timothy not to let anyone look down on him for being young, and to set an example in how he talked, how he lived, and how he kept himself pure (1 Timothy 4:12). He told the Philippians to fill their minds with whatever is true and right and pure and lovely (Philippians 4:8). Ask what we let into our heads at night with a phone in our hands.\n\nThen think about Monday morning. For two years Dani's mother zipped that Bible into the backpack every morning, and Dani never once opened the pocket at school. On Monday, Dani took the Bible from her mother's hands and put it in the right pocket of her own coat, where she could reach it, and her mother let her. That's what it looks like when a parent's faith starts becoming a kid's own.\n\nTry this out this week. Learn 1 John 4:2 by heart, in whatever language the family prays in. Parents can pass on the test the way Dani's mother taught it while sitting on the edge of the bed. And when a voice comes along that sounds smooth and friendly and knows a lot about us, whether it comes out of a phone or the dark below a guardrail, ask it about Jesus. Ask it if He came in the flesh, and then listen hard to what it won't say."},
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
    {label:"The Helmet", text:"Mattie Szabo had her father's binoculars mashed against her face so hard the rubber cups were going to leave red rings around her eyes for an hour. She'd been lying on her stomach on the warm rock of the South Lookout long enough for the stone to press its grit into both elbows, and the hawks still wouldn't come over the knob.\n\nThey came down the ridge out of the northeast the way they had all afternoon, mostly red-tails and a few sharp-shins working hard between glides. They rode the northwest wind where it hit the Blue Mountain and climbed the face. Then about a quarter mile out, every bird slid off south over the Lehigh Valley in a long lazy curve around Bake Oven Knob, and picked the ridge back up past the parking lot on the far side, the way creek water goes around a rock.\n\nMr. Oplinger was sitting behind her on a square of orange foam on the highest boulder, with a clipboard on one knee and a steel clicker in his fist. He was the hawk counter, with a gray mustache and a Phillies cap the sun had faded pink. In the forty minutes since the Szabo kids had walked up the trail, he hadn't clicked that clicker once.\n\n\"Fifty years,\" he said, talking to the valley more than to them. \"The birds don't go around the knob. The knob is the whole reason they come this way.\"\n\nArpi was sitting three rocks out past Mattie, which was right where Mom had told him not to sit. He was nine, and he had a Butterscotch Krimpet in each hand, eating them in turns with a bite off the left and a bite off the right so neither cake got ahead. His sneakers hung out over a drop that went straight down past the rock face and the tops of the oaks. A puff of wind came up the cliff and blew the hair off his forehead, and he leaned out to watch a crumb fall.\n\nMattie put the binoculars down and got up on her knees.\n\n\"Arpi. Three rocks back.\"\n\n\"I'm watching where it lands.\"\n\n\"It lands at the bottom. Three rocks back, or I tell Mom you ate both Krimpets before the sandwiches.\"\n\nHe scooted back on his butt, one rock and then two, holding the cakes up over his head like they were the ones in danger. Mattie watched every inch with her stomach pulled tight under her ribs, because she knew how Arpi worked, and Arpi walked toward whatever was shiny. Last summer at Dorney Park he'd stepped out of the line for the Thunderhawk to watch a man in a cherry picker paint a sign. Mattie had looked for him for twenty-two minutes while a lady on the loudspeakers read out a little boy in a green Eagles shirt over and over, and Mom ran the midway with her purse banging her hip. They found him sitting on a bench with a funnel cake a stranger had bought him, and he couldn't understand why Mom was crying. Since then Mattie kept him on a string in her head, and that string pulled tight across her chest whenever he got more than a few feet off.\n\nMom had driven them up Bake Oven Road at two o'clock in the minivan with the Christian station on low. Dad was working another Saturday double at the warehouse in Fogelsville, because since July they'd been cutting hours on the regular shift and only giving them back on weekends. That was the summer Mom taped an index card over the kitchen sink in her square printing and started reading it while she did the dishes. It was also the summer Mattie watched her sit in the Giant parking lot after a grocery run with the engine off, the receipt in her lap, and her forehead on the steering wheel, dry-eyed and not moving while the ice cream got soft in the back. Mattie kept her eyes on the cart corral and her mouth shut the whole time. When Mom finally raised her head and turned the key, Mattie reached over and turned the radio up for her.\n\nAt the lot Mom handed Mattie the backpack with the sandwiches and told her to keep their phones on, stay with her brother, and be back right here at five-thirty. Then she sat a minute with her hands on the wheel, looking up at the oaks turning gold over the yellow game lands gate.\n\n\"Pap Heller used to bring me up here when I was Arpi's age,\" she said. \"He'd sit me on the rocks with a thermos of cocoa and go fuss over that old shelter like it was his own house.\" She laughed at herself and told them to go on.\n\nThey'd climbed onto the rocks at about a quarter after two, and Mattie had tried to text Mom a picture of the hawks swinging wide, but the picture sat there with the little circle spinning around and around until she gave up. She'd had full bars down at the gate.\n\nLonnie Rehrig walked up the trail about forty minutes later. He came up over the last boulder red in the face and wet at the hairline, wearing his father's Army field jacket in sun warm enough that Arpi had his sleeves pushed up. The jacket hung to his knees, and he didn't say hi. He sat down on the rock next to Mattie's, dug a roofing nail out of the pocket, and started scratching at an old spray-painted heart on the stone, making a thin grinding squeak she could feel in her back teeth.\n\nThe Rehrigs lived next door, and Mattie knew every sound that house used to make when Lonnie's dad was home. She knew the storm door banging back against the siding hard enough to rattle the Szabos' kitchen window, the Ford idling in the driveway with the hole in its muffler, and a voice coming through two walls on Friday nights with words too thick to make out. Then, around eleven, Lonnie would be sitting on the Szabos' back step with his hood up, and Mom would walk out with a plate of whatever was left without asking him a single question. In July the Ford backed out and went to Hazleton and didn't come back, and since then the Rehrig house hadn't made a sound. Lonnie's mom worked nights at the hospital now, so when Mattie got up to pee at two in the morning, she could see the blue of Lonnie's screen still on in his window. There was an oil stain in the driveway in the shape of the truck, and Lonnie had worn the jacket every day since.\n\n\"You rode all the way up?\" Mattie said.\n\n\"Saw your mom's van go.\" He kept scratching. \"You weren't answering.\"\n\n\"There's no bars up here.\"\n\n\"Nobody gets bars past the gate. It's like the whole mountain turned its phone off.\" He blew the grit out of the scratch. The knuckles on that hand were scabbed across all four with fresh scabs, and when he saw her looking he put the hand back in the jacket pocket.\n\n\"Let's hit the shelter,\" Lonnie said, kicking a pebble off the edge. \"High school kids leave stuff.\"\n\n\"We have to be at the lot by five-thirty.\"\n\n\"It's like a half mile, Szabo.\"\n\nSo they went, crossing the top of the knob past the old concrete pad behind the lookout, which was a square of cracked foundation with four rusted bolt stubs sticking up at the corners where a light tower had stood when mail planes flew the valley at night. Arpi stomped right across the middle of it in his orange vest, and Mattie barely looked. Past it the trail dropped off the north side of the ridge over the rock slide, where the boulders were as big as cars and the white blazes were painted right on the stone.\n\nArpi went first, because Arpi always went first. He hopped from a flat rock onto a tilted one, and when the tilted stone rocked under him, his left leg slid straight down into the gap between two boulders all the way to the hip. No yell came out of him. He just stopped, folded over with one leg gone into the mountain and both hands still up, while the last Krimpet went tumbling down the crack out of sight.\n\nMattie got there without remembering the rocks in between. She hooked both arms under his armpits and pulled him up, and he came out of the crack slow and scraping, his jeans pushed up to the knee and a long raw scrape down his shin where beads of blood came up like a row of red buttons. She sat him on the flat rock and held onto the back of his vest with her fist.\n\n\"My Krimpet,\" Arpi said.\n\n\"Forget the Krimpet.\"\n\n\"It's down there. It's down there forever.\"\n\nHer hands wouldn't stop shaking, so she kept one of them knotted in his vest and made him walk in front of her the rest of the way down. When she looked back up the slide, Lonnie was standing on a boulder above them with his hands in the jacket pockets, looking off north at the next ridge over. He hadn't come down to help, and he hadn't even watched.\n\nPast the North Lookout boulders they took the blue blazes down to the shelter, which sat low in the trees as a lean-to of old chestnut logs turned silver with age, with a plank floor raised off the ground for sleeping. There were beer cans in the leaves around back, and the air under the trees smelled like wet bark and mouse. There was less sound down here than there ought to be with three kids crashing around, the way a classroom drops to a hush when the principal walks in.\n\nLonnie checked along the back wall and came up with an empty mango vape, clicked it twice, and stuck it behind his ear like a pencil. Arpi pulled the empty Krimpet wrapper out of his vest pocket to look at it one more time, and the wind took it out of his fingers and slid it under the plank floor. Because Arpi never let a wrapper go anywhere Mom might find out about, he went in after it on his belly.\n\nHe came out backward with leaves in his hair, dragging an old Army helmet by its strap.\n\nIt was the round steel style from the war movies, with the olive paint faded to the brown of a dry creek bed, a dent above the left side, and a canvas chin strap with a brass buckle turned green. Mattie peeled the leather liner back with one finger. Two small letters, H.H., were scratched into the steel underneath with a nail point, and the whole thing smelled of mildew and pine.\n\nArpi put it on before anyone could stop him, and it came down over his eyebrows and ears and sat on the bridge of his nose.\n\n\"It's quiet in here,\" he said from under it. \"It's like when you put your head under the bathwater.\"\n\n\"Private Szabo,\" Lonnie said. \"Ten-hut.\"\n\nArpi saluted with the wrong hand and marched in a circle on the plank floor, and Mattie laughed and saluted back, so for a minute it was a good Saturday again. Then Lonnie took the helmet off Arpi's head, set it crooked on his own, and rapped the top with his knuckles. It made a dull clank like a pot lid.\n\n\"And take the helmet of salvation!\" he said in a deep TV preacher voice. \"Ephesians six seventeen! My mom made me do Bible school at your church, Szabo. I got a flannel-board certificate.\"\n\nMattie laughed again, and Lonnie kept going, dropping his voice until it roughened and pulling his shoulders up until it was his dad.\n\n\"Lonnie. Lonnie! Get out here. You think I don't see that bike laying in the yard?\"\n\nIt was the Friday voice down to the word, the one that came through two walls. Arpi stopped marching, and Mattie's laugh stopped in her throat. Lonnie stood there with the helmet down on his eyebrows, doing the voice a second longer than a joke goes, and the hand he'd raised to point at nobody was shaking.\n\nThen he knocked on the steel again. \"It's just a pot, see?\" he said in his own voice. \"No angels. No Holy Ghost.\" He pulled it off and tossed it to her, and she caught it against her chest, heavy as a cast-iron pan and cold from lying under the boards.\n\nMattie didn't put it on, because she didn't want to wear it for a joke after Lonnie had worn it for one. She slid the chin strap over her wrist and let the helmet hang there, knocking against her leg as they climbed back up toward the knob without anyone saying a word.\n\nThe light had changed while they were under the trees. It came through the oaks low and slanting and orange now, and their shadows stretched out long across the rocks. Up on the knob Mr. Oplinger was standing, rolling up his square of foam and snapping the clip on his board shut.\n\nHis eyes went past them to the old tower pad, and he rubbed his jaw.\n\n\"My dad used to say there were giants in the earth in those days,\" he said, \"and whatever they left behind still likes a high place.\" Then he laughed through his nose like it was an old joke he was tired of.\n\nMr. Oplinger told them it was game lands and bow season, keep that orange vest on the little one, and be off these rocks before dark. He asked if their mom was coming, and Mattie said five-thirty, and he said good. Then he walked down the trail toward the lot with his thermos knocking on his hip, and Mattie watched the pink cap get small between the trunks until the trees closed behind it. After that it was just the three of them on the mountain.\n\n\"Mattie,\" Arpi said. \"How come the leaves are like that?\"\n\nOak leaves lay heaped against the boulders and rattled every time the wind came over, but on the concrete pad they lay in a ring. Every leaf lay flat with its stem pointing out toward the trees like the spokes on her bike, and not one of them moved. The wind pushed Mattie's bangs into her eyes and sent a whole drift skittering off the rocks behind her, while the leaves on the pad didn't budge.\n\nArpi started toward it, and Mattie caught him by the hood of his sweatshirt.\n\n\"Don't step on that.\"\n\n\"Why?\"\n\nShe opened her mouth, shut it again, and kept her fist in his hood.\n\nUnder the wind there was a hum. She'd taken it for the big lines down along 309, except 309 was miles off, and this came up through the rock into the soles of her sneakers and the fillings in her back teeth, low and steady like a refrigerator in an empty house.\n\nShe pulled her phone out to check the time, because the sun was sitting right down on top of Bear Rocks to the west and Mom would be pulling into the lot. The screen said No Service, and the clock said 2:14, which was the minute they'd climbed onto the rocks. She turned it off and on, and it came back up and said 2:14 again while the sun kept sinking behind the ridge.\n\n\"We have to go,\" she said. \"Lonnie. We have to go now.\"\n\nLonnie didn't answer. He'd walked out past the South Lookout to the farthest ledge, which was the narrow one where only the high school kids went to show off, and sat down on it with his legs hanging over the drop.\n\nThen the red-tail came.\n\nIt came down the ridge late and low and all by itself, a big bird with the last sun lighting up the rust in its tail. This one didn't slide off south like the others. It came straight at the knob on stiff wings, and Mattie had time to think, there, finally, before it reached the air over the concrete pad and stopped cold, the way a bird stops when it flies into a picture window. Every feather on it flared out at once, and it screamed. It was a long ragged scream, and up close it went straight into her stomach. The hawk beat backward, fell off the wind, caught itself a few feet above the treetops, and flew back up the ridge the way it had come, flapping hard and low like a dog was after it. Three of its breast feathers drifted down slow, turning over and over until they landed on the pad and lay flat in the ring with their quills pointed out, the same as the leaves.\n\nArpi's mouth was open.\n\n\"It hit the air,\" he said. \"Mattie, it hit the air.\"\n\nShe didn't answer him. She had both hands on him now, one on his hood and one on his vest, and through the back of his ribs she could feel his heart going fast like a rabbit's. Nobody had touched them or come near them, and it was just the three of them and the hum and the leaves, the sun going down, and her phone saying 2:14.\n\nArpi turned his head toward the valley.\n\n\"Mattie,\" he said in a calm and interested voice. \"Who's saying my name?\"\n\n\"Nobody's saying your name.\"\n\n\"The man. Over there.\" He pointed with his whole arm, past the pad and the lookout, at the empty air over the drop. \"He keeps saying Arpád.\"\n\nNobody called him Arpád except Grandma Szabo on the phone at Christmas. Mattie looked where he was pointing and saw only air turning blue over the valley and the first lights coming on down in Germansville. Arpi's face was the face he'd had looking up at the man in the cherry picker, calm and curious and already leaning. The string in her chest pulled so tight she could hardly breathe around it, and she pulled him back against her legs and held on.\n\nDown below, a truck downshifted on Bake Oven Road, and the sound came all the way up the mountain from a big engine coughing through a muffler with a hole in it.\n\n\"That's him,\" Lonnie said from the ledge.\n\n\"Lonnie, that's anybody's truck.\"\n\n\"It's the Ford. I know the hole in it.\" He said it low, almost gentle, with his face turned down toward the road. Then he looked back at her over his shoulder, and his voice went sharp as a slapped hand. \"Don't you tell me what I know, Szabo. You don't know one thing about my dad. Your dad comes home.\"\n\nShe took that and didn't give it back. The sun dropped behind Bear Rocks, so all at once the light on the knob was thin and blue while the cold came up off the stone, and Lonnie dug his father's angle-head flashlight out of the jacket and smacked it against his palm until it came on yellow.\n\nThe leaves on the pad had started to glow from underneath, with a pale white line running around the ring of them like light coming under a door.\n\nThen the light came up off the pad and turned.\n\nIt swung around slow in a beam as wide as a barn door, turning white and then green and then white again, sweeping the oaks the way the old tower light must have swept the dark for the mail planes, with no tower under it, only air. A shape stood on the pad inside the beam, and Mattie made herself look right at it. It stood taller than the oaks, and it was thin the way a tower frame is thin, all long legs and narrow shoulders, and where its face should have been the light came out.\n\nThe beam passed over Arpi. He twisted down and out of his orange vest like a cat out of a collar, left it hanging empty in her fist, and walked toward the lip of the South Lookout, grinning at the light.\n\nThe beam passed over Mattie, and she heard her own voice inside her head, the one she used on herself in the bathroom mirror. It said Mom sat in the Giant lot with her forehead on the wheel because of her. It said Arpi was going off that rock and it would be her fault, the way it was always her fault, and nobody could hear her up here, and nobody ever could. Her legs felt heavy as wet sand, and for a second she stood there and let it talk.\n\nThen she dropped the vest and ran, staying bent over under the beam until she caught Arpi by the back of his sweatshirt one step from the lip, and they went down hard on the stone together. Her elbow skidded and burned and came away wet, and past Arpi's head there was only air and the tops of the trees a long way down.\n\nArpi kicked. \"Let go. The man says you can see our house from the end.\"\n\nMattie got her knee on his back, jammed the helmet down on his head, and fed the green brass prong through the first hole it would reach.\n\n\"God,\" she said. \"Please. Keep his head.\"\n\nThe beam swung around and hit the steel, making a sound like sleet on the roof of a car. Arpi stopped kicking and blinked up at her from under the rim, and his face was his own face.\n\n\"Why's it so loud in here?\" he said. \"He's still talking, but it's outside now.\" He wiped his nose on his sleeve. \"It isn't true, what he says. Mom says I'm her best surprise.\"\n\nShe pulled him to the scrub oak that grew out of a crack behind the lookout and wrapped his arms around the trunk. \"Hold that tree. Do not let go of it.\"\n\nOut on the end of the far ledge Lonnie was standing now, toes over the edge, hands loose, his flashlight still on behind him. The beam had stopped turning and sat on him, holding white.\n\n\"Dad?\" Lonnie said.\n\nMattie heard it then out loud in the wind, a man's voice that sounded rough and friendly, with cigarettes and truck stop coffee in it. \"Come on out, bud. Truck's parked right down there. I came back for the jacket.\"\n\nArpi already had his fingers on the buckle.\n\n\"No,\" Mattie said. \"Keep it.\"\n\n\"Lonnie needs it.\" He held the helmet out with both hands, and she watched his chin start to shake and his eyes fill up, and he held it out anyway. \"Take it. I'll hold the tree. I'll say my verse.\"\n\nShe took it and went out onto the ledge on her hands and knees. The wind had swung around to come off the dark north side of the ridge, pushing at her back like a hand, steady and hard toward the drop. Behind her Arpi hugged the oak and said his memory verse from Mrs. Kistler's class with all the old words, his voice cracking. \"I will lift up mine eyes unto the hills, from whence cometh my help.\"\n\nThe voice in her head said she was going to slip, and since he wanted to go she should let him go, because God was a flannel board in a church basement with the corners peeling off.\n\nMattie stopped crawling and put her forehead down on the cold rock.\n\n\"I can't do this part,\" she said into the stone. \"You do it, God. I'll hold on.\"\n\nThe words were hardly out of her mouth before the wind quit. For three heartbeats there was no wind at all, only the hum, and Lonnie leaned out a little over the dark. Then the wind came back from the other way, up the face of the cliff out of the valley, hard and warm as an August night, smelling of cut corn and chimney smoke. It hit Mattie full in the face, pushed her back from the edge, and rocked Lonnie on his heels. Down in the trees below the cliff she heard wings starting to beat, a lot of them like pigeons going up off a barn roof all at once, and the sound was coming up.\n\nShe got her knees under her and crawled on into that warm wind until she could touch his sneaker.\n\nLonnie turned around with the beam on his back and his face dark against it, and when he opened his mouth his father's voice came out of him in that mean Friday night tone. \"Go home, Szabo. Nobody asked you up here. Your old man works doubles so he don't have to look at you.\" He kicked at her, and when she caught his ankle he came down on one knee and swung wild, and the back of his hand caught her across the mouth so her lip split against her teeth and her whole cheek rang.\n\nThrough the ringing she saw the pad, where the tall thing stood in its light behind Lonnie. When Lonnie drew his arm back to swing again, its long arm drew back at the same time, slow like a man working a puppet on a stick, and when Lonnie's mouth opened, the light where its face should be opened with it. Mattie watched that happen twice, and then she knew who she was fighting. It was the thing on the pad, and the boy in front of her was Lonnie, who sat on their back step at eleven at night with his hood up and ate Mom's leftovers off a paper plate. She didn't hit him back. She took the second swing on her shoulder, grabbed his father's jacket in both fists and held on, and turned her face past him up into the light at the thing standing in it.\n\n\"You can't have him,\" she said to it.\n\nThen she jammed the helmet down on Lonnie's head with him bucking under her. He clawed at the rim, and she put her whole weight on it, got the canvas strap under his chin, and pushed the brass prong at the hole. It was stiff with eighty years of rust, and her fingers were slick with blood off her elbow, so it slipped. \"Greater is He that is in me than he that is in the world,\" Mattie said right up into that light, steady, the way Mom read it off the card over the sink with her hands in the dishwater, with her knees planted on the rock and her thumb already pushing the prong again. It went through, and she cinched the strap tight against his jaw.\n\nThe beam came down on Lonnie square, and the helmet rang like sleet on a car. Lonnie stopped fighting on his knees, and Mattie watched his face come back to him as he saw what was standing on the pad.\n\n\"That's not my dad,\" he said. \"It doesn't have a face.\"\n\nUp the warm wind came the hawks, dozens and then hundreds rising up the cliff in the dusk when every hawk on the mountain ought to have been asleep. They went past the ledge so close she heard the air rip through their feathers and turned in a slow column over the knob. In the gaps between them Mattie saw other shapes standing on the wind, bigger than any bird, with wings that went up past where her eyes could follow, set in a ring around the knob. When she looked straight at one it blurred like a word stared at too long, and she didn't try twice.\n\nThe thing swung its light onto the scrub oak, and Arpi's arms came loose from the trunk as he took one step toward the drop with his face slack again. Between one blink and the next, one of the tall ones was beside him, and a hand as wide as a snow shovel came down flat on his back and set him against the tree, gentle and sure, the way Mom would catch a glass going off the counter and set it back without looking. Arpi grabbed the trunk and hung on.\n\nIts beam came back around at the ledge, and another of the tall ones stepped down out of the hawks and stood between the pad and the two of them with its wings half open, like someone holding a storm door wide in a hard wind so it wouldn't bang. The beam broke on it like creek water on a boulder and went around. In the shadow it made, Lonnie grabbed Mattie's wrist hard enough to hurt, and they crawled backward on their bellies an inch and then a foot at a time with the helmet scraping stone, until their sneakers hit the scrub oak where Arpi was saying \"whence\" over and over because he'd forgotten the rest.\n\nThen the ring of wings closed on the pad. Big blurred shapes came down through the hawks while the hum climbed to a whine like a dentist's drill, and the tall thing folded in on its own light the way an umbrella folds and went down into the concrete like water down a drain. The white line around the ring of leaves went out like a pilot light. When the hum quit, Mattie's phone buzzed against her leg, three times, four, five.\n\nIt was dark on the knob, with stars coming out over the Carbon County side and Germansville strung out yellow below. The wind blew ordinary and cool from the northwest. Lonnie's flashlight lay where he'd dropped it, and in its yellow circle the pad was only cracked concrete with four rusty bolts and the leaves lying on it any which way, rattling when the wind went over. Mattie pulled her phone out with shaking fingers and saw the clock said 6:41, the bars were back, and there were eleven missed calls from Mom.\n\nLonnie sat with his back against the oak, fumbled the strap loose, and held the helmet in his lap.\n\n\"I heard it ring,\" he said.\n\n\"I know.\"\n\n\"In the shelter it was just a pot.\" He turned it over in his hands. \"It didn't do anything for me in the shelter.\"\n\n\"You weren't asking Him for anything in the shelter,\" Mattie said.\n\nLonnie didn't say anything for a few minutes. Arpi came and sat against his other side without asking, and Lonnie let him. The vape had fallen from behind his ear somewhere out on the ledge. Then he reached over and touched the corner of Mattie's mouth, where her lip had puffed up fat and split, and pulled his hand back fast.\n\n\"I hit you out there,\" he said. \"I said that stuff about your dad.\"\n\n\"It was working your arm,\" Mattie said. \"I watched it. I wasn't fighting you.\"\n\n\"That thing you said. The greater one. Say it again.\"\n\nMattie said it again, slower, leaning on the in me. Lonnie put his hand flat on top of the helmet and talked out loud with his eyes open, looking at the dark where the pad was.\n\n\"Jesus? Okay. I don't know how to do this,\" he said. \"That thing got in me and had my dad's voice, and You had the wind. I pick You. You get in me instead. Amen or whatever.\"\n\n\"It's just amen,\" Arpi said. \"You don't need the whatever.\"\n\n\"Amen,\" Lonnie said. He wiped his face on the jacket sleeve and laughed once, wet. \"Amen. Okay.\"\n\nThey were coming out of the trees by flashlight when headlights swung across the lot, and Mom's minivan came back up off Bake Oven Road, where she'd been driving the shoulder with her window down calling their names, and pulled into the lot fast enough to spray gravel. She was out of it before it stopped rocking, phone in her hand, and she didn't yell. She looked at Mattie's mouth, dumped the Turkey Hill soda out of the cup in her holder, wrapped the ice in a napkin, and held it on the lip herself. Then she saw what was hanging off Lonnie's wrist, and she turned on the dome light and took the helmet in both hands. Her thumb went right into the dent above the left side, like it knew where to go.\n\n\"That's Pap Heller's,\" she said, peeling the liner back to show the H.H. \"He came home from the war with this dent in it. He kept it under that shelter floor, and he said it was for whoever needed it more than he did.\"\n\nMom drove them down the mountain without the radio on.\n\nThe next Saturday the wind came out of the northwest again. On the way up, Arpi crawled under the shelter floor on his belly and slid the helmet back where he'd found it, and Lonnie checked twice that it was all the way in. Then they climbed the knob, and Mr. Oplinger couldn't click that clicker fast enough. The hawks came straight down the ridge and straight over the knob, low over the old tower pad, so close Mattie could hear the wind in their feathers. Lonnie sat beside Mr. Oplinger with Mr. Szabo's binoculars, calling them out loud as they came. He'd come to church with the Szabos on Sunday and sat between Arpi and Mom, and he'd sung the hymns wrong and loud. A big red-tail came over the pad and right over their heads, close enough that its shadow went across Lonnie's hands, and he followed it with the glasses until it was gone, then wiped the rubber cups on his sleeve and handed them back to Mattie.\n\n\"Fifty years,\" Mr. Oplinger said, clicking. \"I never saw them come over like this.\"\n\nArpi had a Krimpet in each hand again, taking a bite off the left and a bite off the right. \"God put the lid back on,\" he said with his mouth full. \"The big brothers just did what He said.\""}
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
  return '<span class="veil-art" aria-hidden="true" style="background:'+blobs.join(',')+',var(--veil-ph)">'+strokes+'</span>';
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
  if(b.epubUrl && epubAllowed(b)) actions += `<a class="btn ghost" id="d-epub" href="${b.epubUrl}" download type="application/epub+zip">EPUB</a>`;
  const cover = (b.cover && !isVeiled(b)) ? `<figure class="d-cover"><img class="cv-light" src="${b.cover.light}" alt="${escapeHtml(b.cover.alt||b.title)}" width="800" height="1280" decoding="async"><img class="cv-dark" src="${b.cover.dark}" alt="${escapeHtml(b.cover.alt||b.title)}" width="800" height="1280" decoding="async" loading="lazy"></figure>` : '';
  const audio = b.audio ? `<div class="audio-row" id="audio-row"><div class="audio-credit">Read by ${b.reader||'Leo'}</div><audio id="qf-audio" controls preload="metadata"></audio><div class="skip"><button type="button" data-skip="-15">-15</button><button type="button" data-skip="15">+15</button></div><div class="audio-status" id="audio-status">Leo \u00b7 hired reader</div></div>` : '';
  const seq=tvnShelfCountLabel(b);
  $('detail').innerHTML = `<button class="back-shelf" type="button" id="d-back">\u2190 Shelf</button>${cover}<h1>${b.title}</h1><div class="sub">${seq?seq+' \u00b7 ':''}${b.series?b.series+' \u00b7 '+(b.era||'')+'<br>':''}${b.subtitle}<br>${b.year} \u00b7 ${b.type} \u00b7 ${b.status}${free?' \u00b7 '+free:''}${b.reader?' \u00b7 Read by '+b.reader:''}</div><div class="blurb">${b.blurb||''}</div><div class="actions">${actions}</div>${audio}`;
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
  setEpubLink(b);
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
/* EPUB3 export for open works only: stored zip, built in the browser from the reader text. */
const EPUB_OK=new Set(['qf-first-water','qf-perimeter-sample','tvn-the-helmet-at-bake-oven-knob','tvn-the-hills-above-allentown','tvn-the-hills-above-allentown-screenplay','tvn-the-hills-above-allentown-study']);
function epubAllowed(b){ return !!(b && EPUB_OK.has(b.id) && liveBook(b) && !isVeiled(b) && !isDeadTvnId(b.id)); }
const CRC_T=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u){ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC_T[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipStore(files){
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const u16=n=>[n&255,(n>>>8)&255], u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  files.forEach(f=>{
    const name=enc.encode(f.name), data=typeof f.data==='string'?enc.encode(f.data):f.data, crc=crc32(data);
    const head=[0x50,0x4b,3,4, ...u16(20),...u16(0),...u16(0),...u16(0),...u16(0x21), ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)];
    parts.push(new Uint8Array(head), name, data);
    central.push(new Uint8Array([0x50,0x4b,1,2, ...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0x21), ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]), name);
    off+=head.length+name.length+data.length;
  });
  const csize=central.reduce((s,a)=>s+a.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6, ...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(off),...u16(0)]);
  return new Blob([...parts, ...central, end], {type:'application/epub+zip'});
}
function xesc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function xhtml(title, body){ return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en"><head><meta charset="utf-8"/><title>'+xesc(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>'; }
function buildEpub(b){
  if(!epubAllowed(b)) return null;
  const title=b.title||b.id, author='Douglxss Burley Johnson', uid='urn:dbj:archive:'+b.id;
  const screen=b.role==='screenplay';
  const chs=chapterEntries(b).filter(e=>e.allowed && String(e.ch.text||'').trim()).map((e,n)=>{
    const label=e.ch.label||chapterLabel(e.i);
    const paras=String(e.ch.text).trim().split(/\n\n+/).filter(Boolean);
    const body='<section epub:type="chapter"><h2>'+xesc(label)+'</h2>'+paras.map((p,k)=>'<p'+(k===0?' class="first"':'')+'>'+xesc(p).replace(/\n/g,'<br/>')+'</p>').join('')+'</section>';
    return {id:'c'+(n+1), file:'c'+(n+1)+'.xhtml', label:label, html:xhtml(label, body)};
  });
  if(!chs.length) return null;
  const mod=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  const css='body{margin:0 4%;font-family:serif;line-height:1.5}h1,h2{font-weight:normal;text-align:center;margin:2em 0 1.5em}h2{font-size:1.1em;letter-spacing:.12em;text-transform:uppercase}p{margin:0;text-indent:1.4em;text-align:justify}p.first{text-indent:0}'+(screen?'p{text-indent:0;text-align:left;margin:0 0 .8em;font-family:monospace}':'')+'.cover{text-align:center;margin-top:30%}.cover h1{font-size:1.6em}.cover p{text-indent:0;text-align:center}';
  const mark='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><rect width="600" height="900" fill="#fff"/><g stroke="#000" stroke-width="34" stroke-linecap="square"><path d="M190 250l220 220M410 250L190 470"/><path d="M170 540h260M170 590h260M170 640h260M170 690h260" stroke-width="14"/></g><text x="300" y="800" text-anchor="middle" font-family="serif" font-size="30" fill="#000">'+xesc(title)+'</text></svg>';
  const files=[
    {name:'mimetype', data:'application/epub+zip'},
    {name:'META-INF/container.xml', data:'<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'},
    {name:'OEBPS/content.opf', data:'<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">'+xesc(uid)+'</dc:identifier><dc:title>'+xesc(title)+'</dc:title><dc:creator>'+author+'</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">'+mod+'</meta><meta name="cover" content="cover-img"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="cover-img" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>'+chs.map(c=>'<item id="'+c.id+'" href="'+c.file+'" media-type="application/xhtml+xml"/>').join('')+'</manifest><spine><itemref idref="title"/>'+chs.map(c=>'<itemref idref="'+c.id+'"/>').join('')+'</spine></package>'},
    {name:'OEBPS/nav.xhtml', data:xhtml('Contents','<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+chs.map(c=>'<li><a href="'+c.file+'">'+xesc(c.label)+'</a></li>').join('')+'</ol></nav>')},
    {name:'OEBPS/style.css', data:css},
    {name:'OEBPS/cover.svg', data:mark},
    {name:'OEBPS/title.xhtml', data:xhtml(title,'<div class="cover"><h1>'+xesc(title)+'</h1><p>'+author+'</p></div>')}
  ].concat(chs.map(c=>({name:'OEBPS/'+c.file, data:c.html})));
  return zipStore(files);
}
function setEpubLink(b){
  const a=$('btn-epub'); if(!a) return;
  a.hidden=!epubAllowed(b);
}
if($('btn-epub')) $('btn-epub').onclick=e=>{
  e.preventDefault(); e.stopPropagation();
  if(!epubAllowed(readerBook)) return;
  if(readerBook.epubUrl){ const s=document.createElement('a'); s.href=readerBook.epubUrl; s.download=readerBook.epubUrl.split('/').pop(); document.body.appendChild(s); s.click(); s.remove(); return; }
  const blob=buildEpub(readerBook); if(!blob) return;
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=String(readerBook.id).replace(/^tvn-|^qf-/,'')+'.epub';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
};
/* Light / dark theme: follows the system until the reader picks one; the choice is kept in localStorage. */
function currentTheme(){ return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'; }
function syncThemeUi(){
  const t=currentTheme(), b=$('btn-theme');
  if(b){ b.setAttribute('aria-pressed', t==='dark'?'true':'false'); b.setAttribute('aria-label', t==='dark'?'Switch to light mode':'Switch to dark mode'); }
  document.querySelectorAll('[data-theme-set]').forEach(x=>{ const on=x.dataset.themeSet===t; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on?'true':'false'); });
}
function setTheme(t){
  try{ localStorage.setItem('ba-theme', t); }catch(e){}
  if(window.__baTheme) window.__baTheme(t); else document.documentElement.setAttribute('data-theme', t);
  syncThemeUi();
}
if($('btn-theme')) $('btn-theme').addEventListener('click', ()=>setTheme(currentTheme()==='dark'?'light':'dark'));
document.querySelectorAll('[data-theme-set]').forEach(x=>x.addEventListener('click', e=>{ e.stopPropagation(); setTheme(x.dataset.themeSet); }));
if(window.matchMedia){ const mq=matchMedia('(prefers-color-scheme: dark)'); const f=()=>setTimeout(syncThemeUi,0); if(mq.addEventListener) mq.addEventListener('change', f); else if(mq.addListener) mq.addListener(f); }
window.addEventListener('storage', e=>{ if(e.key==='ba-theme' && (e.newValue==='dark'||e.newValue==='light')){ if(window.__baTheme) window.__baTheme(e.newValue); syncThemeUi(); } });
syncThemeUi();
bootLibrary();
