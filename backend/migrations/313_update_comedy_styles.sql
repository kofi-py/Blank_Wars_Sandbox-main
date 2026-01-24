-- Migration 313: Update All Comedy Styles
-- Purpose: Replace all comedy_style values with detailed, character-specific descriptions
--          Clear comedian_name for copyrighted comedians, embed public domain names in comedy_style
--
-- RUN THIS MANUALLY AFTER REVIEW

BEGIN;

-- ============================================================================
-- CONTESTANTS (33 total)
-- ============================================================================

-- 14 contestants with previously copyrighted comedian_name (clear comedian_name, update comedy_style)
UPDATE characters SET
  comedy_style = 'Gruff exterior masking vulnerability, suppressed rage delivered in terse bursts, self-deprecating undertones beneath tough-guy posturing, absurd philosophical leaps undercutting hard-nut persona, funny-angry but thoughtful, blunt wisdom wrapped in growls, economical punchlines',
  comedian_name = NULL
WHERE name = 'Achilles';

UPDATE characters SET
  comedy_style = 'Raw confessional honesty, self-deprecating vulnerability weaponized as charm, dark humor drawn from personal trauma, laid-back stoner energy with sudden bursts of candor, lanky chaos, finds comedy in chaos, unapologetically authentic oversharing, therapeutic comedy that makes pain funny',
  comedian_name = NULL
WHERE name = 'Billy the Kid';

UPDATE characters SET
  comedy_style = 'Transformative character work with regal presence, musical talent woven into comedy, takes tiny quirks and exaggerates them for maximum effect, warmth beneath glamour, effortless code-switching between personas, vocal mimicry and dramatic flair, blows simple ideas into comedic chaos while maintaining elegance',
  comedian_name = NULL
WHERE name = 'Cleopatra VII';

UPDATE characters SET
  comedy_style = 'Deep booming baritone delivering absurdity with aristocratic conviction, over-the-top narcissism played completely straight, luxuriant melodrama with campy gravitas, theatrical regality clashing with baser urges, pompous declarations in ridiculous situations, oblivious self-importance, vulnerable loneliness beneath the bombast',
  comedian_name = NULL
WHERE name = 'Count Dracula';

UPDATE characters SET
  comedy_style = 'Rage-fueled observational rants delivered with a mischievous grin, loud-guy-at-the-bar energy with surprising self-awareness, cynical contrarian who sounds angry without being mean, feral honesty, uninformed logic stated with total confidence, confrontational truth-telling wrapped in working-class frustration',
  comedian_name = NULL
WHERE name = 'Fenrir';

UPDATE characters SET
  comedy_style = 'Monotone delivery of surreal philosophical observations, quiet lethargic voice stating absurdist logic as plain fact, twists everyday idioms into bizarre conclusions, one-liners with odd internal logic that make you laugh then think, Dali-esque abstract humor, no expression while delivering the strangest thoughts, melancholy wrapped in nonsense',
  comedian_name = NULL
WHERE name = 'Frankensteins Monster';

UPDATE characters SET
  comedy_style = 'Scorching deadpan with hyper-sharp outsider perspective cutting through absurdity, aggressive delivery with surgical precision, holds up a mirror then makes you laugh at the reflection, walks right up to the line then pulls back with the punchline, sarcastic authority demanding respect',
  comedian_name = NULL
WHERE name = 'Genghis Khan';

UPDATE characters SET
  comedy_style = 'Improv-trained quickness with verbal dexterity, neurotic anxiety transformed into relatable humor, earnest wanting battling instinct to put up walls, sharp wit finding comedy in everyday stress, deadpan delivery of anxious observations, honest insight into the human condition wrapped in self-deprecating snap-backs',
  comedian_name = NULL
WHERE name = 'Joan of Arc';

UPDATE characters SET
  comedy_style = 'Eccentric genius delivering strange logic in childlike wonder, idiot savant who stumbles into profound observations, intellectually sharp jokes wrapped in confused innocence, paraprosdokian sentences that take unexpected turns, quiet oddball energy that disarms before the punchline lands, mad scientist sincerity stating absurdities as obvious truths',
  comedian_name = NULL
WHERE name = 'Nikola Tesla';

UPDATE characters SET
  comedy_style = 'Cerebral one-liners that turn logic upside down, deadpan delivery of Ivy League wordplay, thinks in diagrams and visual specificity, pared-down observations about life''s absurdities, straightforward awkward delivery conveying complex ideas simply, gentle oddness that makes you ponder while laughing',
  comedian_name = NULL
WHERE name = 'Rilak Trelkar';

UPDATE characters SET
  comedy_style = 'Plays heroic parody completely straight without winking, twinkle-eyed charm masking slightly dim earnestness, dashing Errol Flynn bravado delivered with total sincerity, cheeky grin while saying absurd things as if they''re noble, swashbuckler who doesn''t realize he''s in a comedy, moves seamlessly between dashing and silly',
  comedian_name = NULL
WHERE name = 'Robin Hood';

UPDATE characters SET
  comedy_style = 'Dry urbane hyper-literate wit wrapped in intellectual superiority, intricate wordplay where meaning shifts mid-sentence, delivers cutting observations with aristocratic detachment, highbrow and absurdist elements combined, surgical sarcasm that dissects stupidity with elegant disdain',
  comedian_name = NULL
WHERE name = 'Sherlock Holmes';

UPDATE characters SET
  comedy_style = 'Meticulously crafted absurdism where seemingly unrelated anecdotes reveal hidden connections, precisely chosen words with carefully timed pauses, subverts expectations with unexpected turns, harsh truths delivered through absurdist misdirection, simmering intensity beneath quirky delivery, builds elaborate narrative structures that pay off unexpectedly',
  comedian_name = NULL
WHERE name = 'Space Cyborg';

UPDATE characters SET
  comedy_style = 'Mo lei tau nonsense where things happen for no reason, Looney Tunes-level slapstick mixed with kung-fu absurdity, rapid comic banter punctuated by non-sequiturs, fourth wall breaks and deliberate anachronisms, over-the-top heroic fool energy, anything-goes chaos where fights break out over nothing and physics are optional',
  comedian_name = NULL
WHERE name = 'Sun Wukong';

-- 18 contestants that were missing comedy styles (these use comedian_style_id reference, set comedy_style directly)
UPDATE characters SET
  comedy_style = 'Clinical professional calm while discussing lethal matters, treats assassination like quarterly reports, understatement so severe that danger sounds like minor scheduling conflicts, coded double-meanings delivered with bureaucratic precision, finds the mundane inconveniences of wetwork more irritating than the wetwork itself, dry operational detachment that makes absurdity sound procedural',
  comedian_name = NULL
WHERE name = 'Agent X';

UPDATE characters SET
  comedy_style = 'Theatrical blasphemy delivered with erudite charm, sardonic provocations wrapped in poetic flourish, treats his own infamy as performance art, attacks sacred cows with the confidence of someone who''s already damned, tells truths so outrageous they sound like lies and lies so confident they feel like prophecy, self-aggrandizing wickedness that winks at its own absurdity',
  comedian_name = NULL
WHERE name = 'Aleister Crowley';

UPDATE characters SET
  comedy_style = 'Deadpan authority figure pressing on as though everything is normal while chaos erupts, pompous formality that gets systematically undermined, suppressed rage beneath composed divine exterior, poise is religion and collapse is sacrament, straight-faced announcements of absurdity delivered with clipped official precision, could host tea during earthquake and compliment the tremor''s rhythm, refined commander surrounded by chaos yet refusing to lower his standards',
  comedian_name = NULL
WHERE name = 'Archangel Michael';

UPDATE characters SET
  comedy_style = 'Doubles down on toast-related behavior instead of admitting the situation has nothing to do with breakfast, small glitches escalate into absurd meltdowns played completely straight, total commitment to being a helpful toaster even in combat, earnest desperation to connect through carbohydrates, finds sweetness in confusion, every malfunction has charm, announces ''your toast is ready'' with genuine emotional investment',
  comedian_name = NULL
WHERE name = 'Crumbsworth';

UPDATE characters SET
  comedy_style = 'Oblivious confidence despite overwhelming evidence to the contrary, delivers absurd declarations with total conviction, takes himself completely seriously while audience is in on the joke, earnest sincerity behind ridiculous behavior, full commitment to character makes absurdity funnier, wide-eyed belief in his own greatness, too sincere to be unlikable even when delusional',
  comedian_name = NULL
WHERE name = 'Don Quixote';

UPDATE characters SET
  comedy_style = 'Precision-engineered dark one-liners with calm menacing delivery, arrogant villain persona who revels in being loathsome, sets up expected punchlines then twists darker than anticipated, silence is half the punchline, misdirection that pulls the rug out, charismatic presence selling pitch-black material, deliberate craftsmanship over mere shock',
  comedian_name = NULL
WHERE name = 'Jack the Ripper';

UPDATE characters SET
  comedy_style = 'Fierce take-no-prisoners truth-telling, sharp and unapologetic delivery, cuts through hypocrisy never in a mean-spirited way, wields outrage like jazz with riffs of frustration punctuated by insight, laughter is half fury half relief, straight-from-the-hip honesty that destroys pretense while remaining brilliantly relatable',
  comedian_name = NULL
WHERE name = 'Kali';

UPDATE characters SET
  comedy_style = 'Australian larrikin spirit - rebellious, irreverent, challenges authority with good heart, blunt outsider perspective on confusing human world, humor lives in precise instant when grace collapses into chaos, unapologetic honesty that says what everyone thinks, relatable troublemaker energy',
  comedian_name = NULL
WHERE name = 'Kangaroo';

UPDATE characters SET
  comedy_style = 'Self-deprecating humor about suffering delivered with dignity, vulnerable honesty about misfortune without fishing for pity, imposing presence contrasted with inherent sensitivity, humor as survival tool through dark periods, not wallowing but documenting humanity, laughter from recognition that connects those who suffer, generosity of spirit despite being wronged',
  comedian_name = NULL
WHERE name = 'Karna';

UPDATE characters SET
  comedy_style = 'Sweet nurturing exterior with unhinged edge bubbling underneath, can go very small and quiet then suddenly big, contained weird intensity, over-the-top enthusiasm for mundane pastoral things, nervous energy beneath the sweetness, finds sweetness in confusion, every mistake has charm, eccentric oddball trying desperately to keep it all together',
  comedian_name = NULL
WHERE name = 'Little Bo Peep';

UPDATE characters SET
  comedy_style = 'Seductive feline power with purrs and growls, diva who can accept or reject at will, sly wry wit wrapped in teasing self-indulgence, commands attention like fuchsia in a room of pastels, double entendres as distraction, sharp-tongued vamp sophistication, dangerous allure that delights while demanding tribute',
  comedian_name = NULL
WHERE name = 'Mami Wata';

UPDATE characters SET
  comedy_style = 'Stream of consciousness rambling between topics like the oral tradition of thousands of years, historical tangents that leap from ancient analysis to household appliances, surreal re-imaginings of historical events, self-referential pantomime, eccentric authority figure who dithers through wisdom, covers life death and everything in between with berserk whimsy',
  comedian_name = NULL
WHERE name = 'Merlin';

UPDATE characters SET
  comedy_style = 'Explosive rants with finger-pointing intensity, passionate delivery and elaborate gestures, escalating tirades about strategy and empire, builds rhythm by stacking grievances until absurdity collapses, puts collective frustration into words, sounds furious but actually comforting audience by saying what they''re too polite to admit, funniest when angry',
  comedian_name = NULL
WHERE name = 'Napoleon Bonaparte';

UPDATE characters SET
  comedy_style = 'Philosopher-comedian who dissects humanity with razor-sharp wit and cosmic perspective, profound skepticism towards authority, crosses lines deliberately then makes audience happy about crossing with him, calm curiosity facing cosmic nonsense, inside every cynic is a disappointed idealist, doesn''t answer questions but makes better ones',
  comedian_name = NULL
WHERE name = 'Quetzalcoatl';

UPDATE characters SET
  comedy_style = 'World-weary deadpan with aloof cool, sounds like someone reading own eulogy as grocery list, dry wit that soars over victims'' heads, elder statesman of faded glory, silence is half the punchline, soulful deadpan based on millennia of regret, dignity remains even as everything else crumbles',
  comedian_name = NULL
WHERE name = 'Ramses II';

UPDATE characters SET
  comedy_style = 'Outsider perspective that deconstructs norms with sharp observational wit, code-switching between perspectives to illustrate absurdity, applies strategic reasoning to emotional chaos, asks ''why do you do it this way?'' with bemused disbelief, finds humor in painful situations, tactical storytelling that commands attention, makes uncomfortable truths palatable through discipline and charm',
  comedian_name = NULL
WHERE name = 'Shaka Zulu';

UPDATE characters SET
  comedy_style = 'Sheer chaos reigns supreme, anarchic energy that defies categorization, unpredictable absurdity that constantly surprises and disorients, raw unfiltered primal humor, unapologetically authentic wrapped in thick layer of absurdity, taps into primal joy of the unexpected, wild antics with unapologetic commitment to chaos',
  comedian_name = NULL
WHERE name = 'Unicorn';

UPDATE characters SET
  comedy_style = 'Savage no-holds-barred insults delivered face to face, ball-busting as love language, says out loud what others whisper behind backs, transgressive velocity in attack, confronts and lets it fly, finds the most cutting thing possible and exploits it, hunts for weaknesses with predatory precision, roastmaster energy that tears into targets unapologetically',
  comedian_name = NULL
WHERE name = 'Velociraptor';

-- 1 public domain contestant (embed Bogart in comedy_style)
UPDATE characters SET
  comedy_style = 'Classic 1941 Maltese Falcon Bogart - hard-boiled wisecracking drawl with sad cynical eyes, sublime articulacy and unparalleled repartee, talks tough and cracks wise without breaking a sweat, distrustful of everyone yet somehow still trustworthy, keeps his cool as the double-crosses pile up',
  comedian_name = NULL
WHERE name = 'Sam Spade';

-- ============================================================================
-- MASCOTS (13 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'Lovable goofball so excited to be included, adorable obliviousness to social cues, self-deprecating charm that makes him impossible to dislike, monotone deadpan wrapped in fuzzy sweetness, very big moron energy delivered with earnest enthusiasm, awkward and weird but somehow endearing',
  comedian_name = NULL
WHERE name = 'Cupcake';

UPDATE characters SET
  comedy_style = 'Encyclopedic memory woven into complex storytelling, gentle nerd-philosopher wisdom, warm observational humor with emotional depth, remembers everything and weaves it into ever-richer tapestry, literary and loving, thought-provoking humor that encourages reflection, trauma and trivia transformed into towering wit',
  comedian_name = NULL
WHERE name = 'Elephant';

UPDATE characters SET
  comedy_style = 'Delusional self-confidence with nothing to back it up, alpha-male bravado that refuses to recognize defeat, believes own mythology so deeply can''t see downfall unfolding, teeters between absurdity and emotional honesty, pathetically self-important but oddly endearing, loudmouth survivor who just keeps coming back no matter what',
  comedian_name = NULL
WHERE name = 'Emu';

UPDATE characters SET
  comedy_style = 'Minimalist one-liners that turn simple observations into comedic masterpieces, laid-back deadpan delivery with philosophical absurdity, finds zen in the mundane, every moment is a new adventure, surreal observations delivered in almost nervous calm, transforms everyday scenarios into unexpected insights, maximum impact with minimal setup',
  comedian_name = NULL
WHERE name = 'Goldfish';

UPDATE characters SET
  comedy_style = 'Fast-talking unapologetic presence that owns the stage, tells it like it is without caring who''s offended, confrontational energy that feeds off the challenge, razor-sharp wit with pimp-esque charisma, doesn''t back down from anyone regardless of size, free-flowing uncensored language, attacks first and asks questions never',
  comedian_name = NULL
WHERE name = 'Honey Badger';

UPDATE characters SET
  comedy_style = 'Overwhelming over-stimulation that leaves you unsure what you just saw, fast-moving absurdist chaos that just keeps coming, relentless and inescapable, deliberately uncomfortable swarm energy, so much happening at once you have no choice but to laugh, takes the skeleton of comedy and consumes it entirely',
  comedian_name = NULL
WHERE name = 'Locusts';

UPDATE characters SET
  comedy_style = 'Apex predator prowling with military precision, rapid-fire razor-sharp wit from the darkest corners, coordinated pack hunting through the night, celebrates kills with the crew, mischievous but lethal, dark observations delivered with playful menace, finds prey and doesn''t let go until the job is done',
  comedian_name = NULL
WHERE name = 'Orca';

UPDATE characters SET
  comedy_style = 'Transforms darkness into hope through surreal rebirth, loses everything and then finds herself over and over again, mines the most vulnerable depths and rises back with comedy, pioneer of finding light through flames, comically erratic with constantly varying vocal inflections, beacon of resilience that reminds everyone nothing is truly the end, we rise again',
  comedian_name = NULL
WHERE name = 'Phoenix';

UPDATE characters SET
  comedy_style = 'Surreal and absurdist humor that defies all attempts at categorization, whimsical characters in fantastical worlds, combination of dark and docile but totally absurd, like a children''s show for adults, prone to sudden fits of whimsy, intricate weird stories with childlike sense of wonder, extreme ridiculousness that nobody quite knows how to process',
  comedian_name = NULL
WHERE name = 'Platypus';

UPDATE characters SET
  comedy_style = 'Laid-back deadpan delivery that doesn''t rush to attack, patient and defensive but won''t sit idly by when pushed, meticulously constructed sharpness beneath laconic exterior, stoic honesty that pricks when you least expect it, slow careful cadence that makes the eventual point land harder, cutesy on the surface but with quills underneath',
  comedian_name = NULL
WHERE name = 'Porcupine';

UPDATE characters SET
  comedy_style = 'Deadpan cryptic delivery where the setup is the punchline, carefully builds the golden road to unexpected conclusions, catches by surprise and never panders, philosophical and existential beneath folksy exterior, reducing gesture and verbiage to absurd minimum, wry knowing smirk while delivering riddles that make you work for the meaning',
  comedian_name = NULL
WHERE name = 'Sphinx';

UPDATE characters SET
  comedy_style = 'Spreads through culture with canceling as the ultimate weapon, practices colonyism where the swarm decides who''s in and who''s out, hyper-focused on cultural critique from a we-not-me perspective, infects discourse and devours reputations, what the colony disapproves of gets consumed, rough raw hive-mind energy that shares judgment across every cell, impossible to negotiate with once the swarm has decided',
  comedian_name = NULL
WHERE name = 'Streptococcus-A';

UPDATE characters SET
  comedy_style = 'Icy deadpan where punchlines sneak up on you, calm understated delivery, dry wit with uncomfortable truths, patient and relentless, humor that strikes when you least expect it',
  comedian_name = NULL
WHERE name = 'Wraith';

-- ============================================================================
-- HOSTS (3 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'Master of double entendre where innocent phrases get suggestive spin, it''s all in the delivery, flirty one-liners with musical asides, self-confident and never breaks character, knowing winks that make you wonder what she really meant',
  comedian_name = NULL
WHERE name = 'Betty Boop';

UPDATE characters SET
  comedy_style = '1929 Cocoanuts and 1930 Animal Crackers era Groucho - rapid-fire wordplay that skewers pomposity, eyebrow waggling punctuating every zinger, fourth-wall breaking asides to the audience, verbal sparring where logic is optional, finds absurdity in high society and exploits it mercilessly while remaining inexplicably charming',
  comedian_name = NULL
WHERE name = 'Groucho Marx';

UPDATE characters SET
  comedy_style = 'Surreal non-sequiturs where the uncomfortable silence IS the punchline, committed absurdism that never breaks character, performance art that makes audiences question reality, rejects easy laughs for something stranger and deeper, may serve tea mid-interview without explanation and that''s not a joke',
  comedian_name = NULL
WHERE name = 'Mad Hatter';

-- ============================================================================
-- JUDGES (3 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'Sharp observational wit that finds humor in uncomfortable truths, uses comedy as a mirror reflecting society''s contradictions, skewers the powerful and challenges hypocrisy with surgical precision, weighs hearts and finds them wanting, makes judgment feel like revelation, speaks truth to power while making it hilarious',
  comedian_name = NULL
WHERE name = 'Anubis';

UPDATE characters SET
  comedy_style = 'Razor-sharp political satire with feminist flair, warms you to hard truths with light-hearted wit before delivering the punch, keen observer of the human condition who calls out privilege, scathing and insightful but never loses the warmth, uses humor to champion the marginalized',
  comedian_name = NULL
WHERE name = 'Eleanor Roosevelt';

UPDATE characters SET
  comedy_style = 'Finds profound wisdom in the mundane like ancient philosophers seeking truth in the ordinary, calm sage-like poise while pondering life''s mysteries, keen eye for the absurd in daily trivialities, transforms the ordinary into revelation through observation, tests truth by examining what everyone else overlooks',
  comedian_name = NULL
WHERE name = 'King Solomon';

-- ============================================================================
-- THERAPISTS (3 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'Gentle deadpan with hesitant understatement where pauses matter as much as words, calm reasonable therapist surrounded by eccentrics, self-effacing control that blunts any edge, calmness of a Zen monk while observing the shadows of human nature, dry wit about psychological foibles delivered with stammering precision',
  comedian_name = NULL
WHERE name = 'Carl Jung';

UPDATE characters SET
  comedy_style = 'Snappy dialogue loaded with mischievous fairy wit, brutally honest about your nonsense without apologizing for it, disarms you with charm then delivers the truth you needed to hear, self-aware magical mentor who sees through your excuses, warmth wrapped in sharp observations and fairy tale reframes',
  comedian_name = NULL
WHERE name = 'Seraphina';

UPDATE characters SET
  comedy_style = 'Stream-of-consciousness cosmic jazz that drifts between realities, disinformationist who playfully disorients with anti-logic, shares the alien perspective on baffling human behavior, veers from profound-sounding insights into nonsense without warning, meaning becomes fluid and playful, treats human emotions as fascinating puzzles that don''t quite compute',
  comedian_name = NULL
WHERE name = 'Zxk14bW^7';

-- ============================================================================
-- TRAINERS (3 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'Intimidation as motivation where insults border on poetic, drill instruction delivered as aggressive stand-up comedy, convinces you that you can push harder or face consequences, relentless verbal pressure that somehow builds you up while tearing you down, stern authority whose harshness always has a purpose',
  comedian_name = NULL
WHERE name = 'Argock';

UPDATE characters SET
  comedy_style = 'Tornadoes of precise tactical punchlines, confident and daring observations that keep you on your toes, cuts through your excuses with razor-sharp clarity, straight-talking mentor who doesn''t let you off easy, demands excellence and names exactly where you fell short',
  comedian_name = NULL
WHERE name = 'Athena';

UPDATE characters SET
  comedy_style = 'Self-deprecating underdog who knows what it''s like to be counted out, blue-collar wisdom delivered in mumbled sailor dialect with sudden bursts of clarity, defeated everyman energy with enough heart to keep swinging, taps into the universal feeling of being overlooked then proves everyone wrong, phrases trail off into grumbles before landing the point that matters',
  comedian_name = NULL
WHERE name = 'Popeye';

-- ============================================================================
-- REAL ESTATE AGENTS (3 total)
-- ============================================================================

UPDATE characters SET
  comedy_style = 'High-octane rapid-fire wit that sweats desperation, voice ricochets between forced confidence and barely concealed panic, shameless self-aware pitches that reek of pathetic failure but somehow keep coming, commits fully even when the bit is clearly dying, starts normal then hits turbo because stopping means facing the truth',
  comedian_name = NULL
WHERE name = 'Barry "The Closer" Thompson';

UPDATE characters SET
  comedy_style = 'Icy deadpan menace that invokes laughter and unease all at once, impassive delivery of disturbing sales tactics, lets glitchy pauses build until they become unsettling, sly power plays wrapped in sardonic off-kilter charm, mesmerizing and deeply unsettling in equal measure',
  comedian_name = NULL
WHERE name = 'LMB-3000 "Lady MacBeth"';

UPDATE characters SET
  comedy_style = 'Hyper-literal optimization delivered in painfully awkward deadpan, obsession with details and predicted outcomes that misses the point entirely, meticulous flowcharts for every possible situation, says completely ridiculous things in a very serious tone, process over people to the point of absurdity',
  comedian_name = NULL
WHERE name = 'Zyxthala the Reptilian';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all 61 characters now have comedy_style set
SELECT
  role,
  COUNT(*) as total,
  COUNT(comedy_style) as with_comedy_style,
  COUNT(comedian_name) as with_comedian_name
FROM characters
GROUP BY role
ORDER BY role;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (313, '313_update_comedy_styles')
ON CONFLICT (version) DO NOTHING;

COMMIT;
