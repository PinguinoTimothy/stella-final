// Skills quick reference (DCs and modifiers). Source: Archives of Nethys skill pages, condensed.
// Each entry: [name, ability, flags ("T" trained only, "A" armor check penalty), sections[[title, lines[]]]]
export const SKILLS = [
  ["Acrobatics", "Dex", "A", [
    ["Balance (DC by surface width)", ["Over 3 ft: 0 · 1–3 ft: 5 · 7–11 in: 10 · 2–6 in: 15 · under 2 in: 20", "Surfaces over 1 ft wide only need a roll if modifiers push the DC to 10+", "Half speed while balancing; flat-footed and no Dex to AC. Taking damage: new check at the same DC or fall"]],
    ["Surface modifiers (stack, worst of each kind)", ["Slightly obstructed: +2 · severely obstructed: +5", "Slightly slippery: +2 · severely slippery: +5", "Slope under 45°: +2 · slope over 45°: +5", "Unsteady (rough water): +2 · storm: +5 · earthquake: +10", "Full speed on a narrow or uneven surface: +5 (not for jumps)"]],
    ["Moving past foes", ["Through a threatened square: DC = foe's CMD (half speed; full speed +10)", "Through an enemy's space: DC = foe's CMD + 5", "Each extra foe passed in a round: +2", "Moving while prone: +5 (full-round action per 5 ft)"]],
    ["Jumping", ["Long jump 5 ft: 5 · 10 ft: 10 · 15 ft: 15 · 20 ft: 20 (then +5 per 5 ft)", "High jump 1 ft: 4 · 2 ft: 8 · 3 ft: 12 · 4 ft: 16 (then +4 per ft)", "No 10 ft run-up: DC doubles. Standing long jump: halve the result", "Speed over 30 ft: +4 per 10 ft. Under 30 ft: –4 per 10 ft", "Fail by 4 or less: DC 20 Reflex to grab the far edge. Fail by 5+: fall (or land prone)"]],
    ["Falling and defense", ["Deliberate fall: DC 15 to ignore the first 10 ft", "3+ ranks: fighting defensively gives +3 dodge AC (not +2); total defense +6 (not +4)"]]
  ]],
  ["Appraise", "Int", "", [
    ["Value of items", ["DC 20: common item. Rare or exotic: DC 25 or more", "Beat DC by 5+: you also learn if it is magical", "Fail by less than 5: price within 20% of the real one", "Fail by 5+: wildly wrong price (GM decides)", "Treasure hoard: DC 20, up to 30 for a very large one"]],
    ["Time and retries", ["Standard action per item; full-round action for a whole hoard", "Retrying gives the same result"]]
  ]],
  ["Bluff", "Cha", "", [
    ["Lie modifiers", ["Target wants to believe you: +5", "Believable: +0 · unlikely: –5 · far-fetched: –10 · impossible: –20", "Target drunk or impaired: +5", "Convincing proof: up to +10", "Retry after failing: –10"]],
    ["Feint", ["DC = 10 + foe's BAB + foe's Wis mod", "If the foe is trained in Sense Motive: 10 + its Sense Motive bonus, if higher"]],
    ["Secret messages", ["DC 15 simple message, DC 20 complex. Takes twice as long", "Fail by 5+: the wrong message is delivered", "Receiver rolls Sense Motive against your Bluff"]],
    ["Inconspicuous action", ["Opposed by observers' Sense Motive; the action takes twice as long (standard → full-round, free/move/swift → standard)"]]
  ]],
  ["Climb", "Str", "A", [
    ["Climb DC by surface", ["Slope too steep to walk, or knotted rope against a wall: 0", "Rope against a wall, knotted rope, or rope trick: 5", "Ledges to hold and stand on (very rough wall, rigging): 10", "Adequate hand and footholds, unknotted rope, pulling up while dangling: 15", "Uneven surface, narrow holds (typical dungeon wall): 20", "Rough natural rock or brick wall: 25", "Overhang or ceiling with handholds only: 30", "A perfectly smooth surface cannot be climbed"]],
    ["Modifiers (cumulative)", ["Chimney or bracing two opposite walls: –10", "Corner (bracing perpendicular walls): –5", "Slippery surface: +5", "Accelerated climb (half speed instead of quarter): –5"]],
    ["Results and falling", ["Fail by 4 or less: no progress. Fail by 5+: you fall", "Catch yourself on a wall while falling: wall DC + 20", "Catch yourself on a slope while falling: slope DC + 10", "Catch a falling ally: wall DC + 10 (after a melee touch attack)", "Pitons: DC 15 handholds, 1 minute and 1 piton per 5 ft", "Climb speed: +8 racial bonus on Climb"]]
  ]],
  ["Craft", "Int", "", [
    ["Item DCs", ["Acid: 15 · alchemist's fire, smokestick, tindertwig: 20", "Antitoxin, sunrod, tanglefoot bag, thunderstone: 25", "Armor or shield: 10 + its AC bonus", "Longbow, shortbow, arrows: 12 · composite: 15 (high strength rating: 15 + 2 × rating)", "Crossbow or bolts: 15", "Simple weapon: 12 · martial: 15 · exotic: 18", "Very simple item: 5 · typical: 10 · high-quality: 15 · complex or superior: 20", "Fragile weapon: DC –5"]],
    ["Firearms and siege", ["One- or two-handed firearm: 20", "Heavy siege firearm: 25 · medium: 30 · light: 35", "Heavy ranged siege engine: 20 · medium: 25 · light: 30"]],
    ["Progress and money", ["Weekly progress = check × DC, compared to the price in sp (1 gp = 10 sp)", "Raw materials cost 1/3 of the price", "Fail by 4 or less: no progress. Fail by 5+: half the materials ruined", "Voluntary DC increase: +10 (to finish faster)", "Earning money: half the check result in gp per week", "Improvised tools: –2 · masterwork artisan's tools: +2 · alchemist's lab: +2"]],
    ["Masterwork and repair", ["Masterwork component: Craft DC 20 (weapon 300 gp, armor or shield 150 gp)", "Repair: same DC as making it, 1/5 of the price"]],
    ["Salvaging", ["Potion: DC 15 + 3 × spell level (1 hour per spell level)", "Raw crafting materials: creation DC + 5, yields 1/4 of the price", "Raw magic materials or costly components: DC 10 + caster level, yields 2/3 of the creation cost"]]
  ]],
  ["Diplomacy", "Cha", "", [
    ["Change attitude (DC = base + target's Cha mod)", ["Hostile: 25 · unfriendly: 20 · indifferent: 15 · friendly: 10 · helpful: 0", "Success: one step better, +1 step per 5 over (max two)", "Fail by 5+: one step worse"]],
    ["Request modifiers", ["Simple advice or directions: –5 · detailed advice: +0 · simple aid: +0", "Unimportant secret or lengthy aid: +5", "Dangerous aid or important secret: +10 or more", "Aid that risks punishment: +15 or more", "Each additional request: +5"]],
    ["Gather information", ["Common facts or rumors: DC 10", "Obscure or secret knowledge: DC 20 or higher"]],
    ["Other uses", ["Call the guard: DC 5 + settlement law modifier; arrival 1d6 minutes, –1 minute per 5 above", "Direct a crowd: Diplomacy DC 15 (full-round) or Intimidate DC 20 (free)", "Hypnotism: DC 20 + subject's Will modifier; +10 if unwilling"]]
  ]],
  ["Disable Device", "Dex", "TA", [
    ["Devices", ["Simple: DC 10, 1 round (jam a lock)", "Tricky: DC 15, 1d4 rounds (sabotage a wagon wheel)", "Difficult: DC 20, 2d4 rounds (disarm or reset a trap)", "Extreme: DC 25, 2d4 rounds (complex trap, clockwork)", "Leave no trace: +5 DC"]],
    ["Open locks", ["Simple lock: 20 · average: 25 · good: 30 · superior: 40", "No thieves' tools: +10 DC"]],
    ["Traps and failure", ["Magic trap: DC 25 + spell level", "Fail by 4 or less: you can retry", "Fail by 5+: the trap triggers, or the sabotage seems to work but does not", "Rigged device fails after 1d4 rounds or minutes of use", "Rogue bypass: beat the trap DC by 10 or more"]],
    ["Technology", ["Arm an explosive: DC 10 to connect the detonator (fail by 5+: it triggers)", "Disarm an explosive: usually DC 10, 2d4 rounds (fail by 5+: it triggers)", "Electronic lock without an e-pick: –5. Cannot take 20"]]
  ]],
  ["Disguise", "Cha", "", [
    ["Modifiers (cumulative)", ["Minor details only: +5", "Different gender: –2 · different race: –2", "Different age category: –2 per step", "Different size category: –10", "Magic that alters form (disguise self, alter self, polymorph…): +10"]],
    ["Viewer knows the person (their Perception bonus)", ["Recognizes on sight: +4 · friends or associates: +6", "Close friends: +8 · intimate: +10"]],
    ["Time", ["Making a disguise: 1d3 × 10 minutes", "Magic: only the casting time"]]
  ]],
  ["Escape Artist", "Dex", "A", [
    ["Escape DCs", ["Ropes or bindings: binder's CMB + 20", "Net, animate rope, command plants, control plants, entangle: 20", "Snare spell: 23", "Manacles: 30 · masterwork manacles: 35", "Tight space: 30", "Grappler: the grappler's CMD"]],
    ["Action needed", ["Ropes, manacles and other restraints: 1 minute", "Net or entangling spell: full-round action", "Grapple or pin: standard action"]],
    ["Limit", ["Escaping ropes is impossible if the DC is over 20 + your Escape Artist bonus"]]
  ]],
  ["Fly", "Dex", "A", [
    ["Maneuver DCs", ["Move less than half speed and stay up: 10", "Hover: 15", "Turn more than 45° (costs 5 ft): 15", "Turn 180° (costs 10 ft): 20", "Fly up at more than 45°: 20"]],
    ["Other checks", ["Taking damage while flying: DC 10 or lose 10 ft of altitude", "Collision with something of equal or larger size: DC 25", "Avoid falling damage: DC 10", "Fail by 5+ (wings): you plummet"]],
    ["Wind", ["Strong (21–30 mph): Tiny checked, –2", "Severe (31–50): Small checked, Tiny blown away, –4", "Windstorm (51–74): Medium checked, Small blown away, –8", "Hurricane (75–174): Large checked, Medium blown away, –12", "Tornado (175+): Huge checked, Large blown away, –16", "Checked: DC 20 to move. Blown away: DC 25 or pushed back 2d6 × 10 ft and 2d6 nonlethal"]],
    ["Modifiers", ["Size: Fine +8 · Diminutive +6 · Tiny +4 · Small +2 · Medium 0 · Large –2 · Huge –4 · Gargantuan –6 · Colossal –8"]],
    ["Maneuverability", ["Clumsy: –8 · poor: –4 · average: 0 · good: +4 · perfect: +8"]]
  ]],
  ["Handle Animal", "Cha", "T", [
    ["Core DCs", ["Handle an animal: 10 · push an animal: 25", "Teach a trick or train for a purpose: 15 or 20", "Rear a wild animal: 15 + its HD", "Hurt animal (damage or ability damage): +2 to handle or push", "Non-animal with Int 1–2: +5", "Animal companion of a druid or ranger: +4"]],
    ["Tricks known", ["Int 1: up to 3 tricks · Int 2: up to 6 tricks", "Attack against all creatures counts as 2 tricks"]],
    ["Core tricks", ["Come, down, fetch, heel, perform, seek, stay, work: 15", "Attack, defend, guard, track: 20"]],
    ["General purposes (DC, weeks)", ["Heavy labor: 15 (2 weeks)", "Riding: 15 (3 weeks)", "Performance: 15 (5 weeks)", "Fighting: 20 (3 weeks)", "Guarding: 20 (4 weeks)", "Combat training or hunting: 20 (6 weeks)", "Riding to combat riding: 20 (3 weeks)"]],
    ["Other tricks by DC", ["Bury, deliver, serve, sneak, throw rider, watch: 15", "Aid, bombard, break out, exclusive, flank, flee, get help, hunt, maneuver, menace: 20", "Detect, entertain: 25"]],
    ["Milking venom", ["DC 10 + donor's HD + donor's Wis mod, 10 minutes per dose", "Fail by 5+: you are injected. Doses per day: Con modifier (minimum 1)"]]
  ]],
  ["Heal", "Wis", "", [
    ["Heal DCs", ["First aid: 15 · long-term care: 15", "Caltrops, spike growth or spike stones wounds: 15", "Treat deadly wounds: 20", "Treat poison: the poison's save DC · treat disease: the disease's save DC"]],
    ["Effects", ["Healer's kit: +2", "Treat poison or disease and beat the DC: +4 competence on the save", "Deadly wounds: heals 1 hp per level (+ Wis mod if you beat the DC by 5+)", "Deadly wounds uses 2 kit uses; each missing use: –2", "Long-term care: up to 6 patients. 8 hours rest: 2 hp per level and 2 ability points. Full day of rest: 4 and 4"]],
    ["Other", ["Antivenom blood extraction: DC 20 (Craft alchemy or Heal)", "Faith healing: against the effect's save DC (remove an affliction: double the DC)"]]
  ]],
  ["Intimidate", "Cha", "", [
    ["Check", ["DC = 10 + target's HD + target's Wis mod", "Success: acts friendly for 1d6 × 10 minutes", "Fail by 5+: the target turns against you"]],
    ["Demoralize (standard action, 30 ft, must see and hear you)", ["Same DC. Shaken for 1 round, +1 round per 5 over the DC", "Trying again: +5 DC per extra check; resets after 1 hour"]],
    ["Modifiers", ["You are larger than the target: +4 · smaller: –4", "Half-orc: +2"]],
    ["Coercion (long term)", ["Lasts 1d6 hours, +1 hour per 5 over the DC"]]
  ]],
  ["Knowledge", "Int", "T", [
    ["Subjects", ["Arcana, dungeoneering, engineering, geography, history, local, nature, nobility, planes, religion"]],
    ["General DCs", ["Basic question in your field: 10 · harder: 15 · very tough: 20–30", "Identify a monster's abilities: 10 + CR (common 5 + CR, rare 15 + CR or more)", "Every 5 over the DC: one extra piece of information", "Untrained: cannot beat DC 10. Cannot retry"]],
    ["Arcana", ["Identify an aura (detect magic): 15 + spell level", "Spell effect in place or magic-made material: 20 + spell level", "Spell that targeted you: 25 + spell level", "Spell by its material component: 20"]],
    ["Dungeoneering", ["Underground hazard: 15 + its CR", "Mineral, stone or metal: 10 · slope: 15 · depth: 20"]],
    ["Engineering", ["Dangerous construction: 10 · style or age: 15 · weakness: 20"]],
    ["Geography", ["Ethnicity or accent: 10 · regional terrain: 15 · nearest community or site: 20"]],
    ["History", ["Recent or significant event: 10 · approximate date: 15 · obscure or ancient event: 20"]],
    ["Local", ["Local laws, rulers, locations: 10 · common rumor or tradition: 15 · hidden groups or rulers: 20"]],
    ["Nature", ["Natural hazard: 15 + its CR · common plant or animal: 10", "Unnatural weather: 15 · artificial feature: 20"]],
    ["Nobility", ["Current rulers and symbols: 10 · etiquette: 15 · line of succession: 20"]],
    ["Planes", ["Names of planes: 10 · recognize current plane: 15 · creature's planar origin: 20"]],
    ["Religion", ["Common deity symbol or clergy: 10 · common mythology or tenets: 15 · obscure deity or clergy: 20"]],
    ["Occult: phrenology (1 minute, once per day)", ["Race and age: 10 · gender: 15", "Alignment: 15 + HD · class: 20 + HD · level or HD: 25 + HD"]],
    ["Occult: recall intrigues (identify class features and feats)", ["Class feature: 10 + class level when granted (prestige class: +10)", "Combat, metamagic or teamwork feat: 10 + character level", "Other feat: 15 + character level"]]
  ]],
  ["Linguistics", "Int", "T", [
    ["Deciphering", ["Simplest messages: DC 20 · standard texts: 25 · intricate, exotic or very old: 30+", "One page takes 1 minute", "Fail: DC 5 Wis check or you draw a false conclusion"]],
    ["Modifiers", ["Document type: unknown –2 · somewhat known 0 · well known +2", "Handwriting: unknown –2 · somewhat known 0 · intimately known +2", "Only casual review: –2 · contradicts orders or knowledge: +2"]],
    ["Forgery", ["Opposed by the examiner's Linguistics check, with the same modifiers", "Seen a similar document: +8 · signature available: +4", "Making one: 1 to 1d4 minutes per page. Detecting: 1 round per page"]],
    ["Automatic writing (once per week, 1 hour)", ["Augury-level result: DC 20 (1 rank) · divination-level: DC 30 (10 ranks)", "Coherent writing chance: 60% + 5% per point over the DC (max 90%)"]]
  ]],
  ["Perception", "Wis", "", [
    ["DCs", ["Sound of battle, stench of rotting garbage: –10", "Smell of smoke, details of a conversation, a visible creature: 0", "Spoiled food: 5 · a creature walking: 10", "Whispered conversation: 15 · average concealed door: 15", "Key turned in a lock, average secret door: 20", "Bow being drawn, burrowing creature below you: 25", "Pickpocket: opposed by Sleight of Hand · creature hiding: opposed by Stealth", "Taste a potion: 15 + its caster level"]],
    ["Modifiers to the DC", ["Distance: +1 per 10 ft · through a closed door: +5", "Through a wall: +10 per foot of thickness", "Favorable –2 · unfavorable +2 · terrible +5", "You are distracted: +5 · asleep: +10", "Invisible creature or object: +20"]],
    ["Bonuses", ["Elves, half-elves, gnomes, halflings: +2", "Scent: +8 to detect by smell · tremorsense: +8 against creatures touching the ground", "Hawk or owl familiar: +3"]],
    ["Occult: read aura (10 minutes, once per day, 30 ft)", ["Alignment: 15 + HD · health: 15 + HD", "Emotion (intelligent items): 20 + HD · magic: 20 + HD or caster level"]]
  ]],
  ["Perform", "Cha", "", [
    ["Quality and earnings (prosperous city)", ["DC 10 routine: 1d10 cp per day", "DC 15 enjoyable: 1d10 sp per day", "DC 20 great: 3d10 sp per day", "DC 25 memorable: 1d6 gp per day", "DC 30 extraordinary: 3d6 gp per day"]],
    ["Modifiers", ["Masterwork instrument: +2", "Retry: +2 DC per previous failure"]]
  ]],
  ["Profession", "Wis", "T", [
    ["Checks", ["Basic question about the profession: DC 10 · complex: DC 15 or higher", "Income: half the check result in gp per week, cannot retry", "Untrained laborers earn about 1 sp per day", "Gnome: +2 on one Craft or Profession skill"]],
    ["Herbalist", ["Gathering while traveling halves overland speed", "Success by 5+: +1 extra yield · by 10+: +2 extra yields", "Preparation uses Craft (alchemy) DC; with Profession (herbalist): +5 DC", "Raw herb spoils after 24 hours"]]
  ]],
  ["Ride", "Dex", "A", [
    ["Task DCs", ["Guide with knees, stay in saddle: 5", "Fight with a combat-trained mount: 10", "Cover, soft fall, leap, spur mount: 15", "Control mount in battle: 20 · fast mount or dismount: 20"]],
    ["Modifiers", ["Ill-suited mount: –5 · bareback: –5", "Military saddle: +2 to stay in the saddle"]],
    ["Failure", ["Soft fall: 1d6 damage and prone · leap: fall, at least 1d6", "Spur mount: +10 ft speed for a round, 1d3 damage to the mount, fatigued after rounds equal to its Con"]]
  ]],
  ["Sense Motive", "Wis", "", [
    ["DCs", ["Hunch (something is off): 20", "Sense enchantment: 25 (against a dominated target: 15)", "Secret message: opposed by the sender's Bluff, –2 per missing piece of information"]],
    ["Secret message results", ["Succeed by 4 or less: you know something is hidden", "Beat by 5+: you intercept and understand it", "Fail by 5+: you may infer false information"]],
    ["Rules", ["Takes at least 1 minute. No retry, but you may check once per Bluff made against you"]],
    ["Occult: prognostication (10 minutes, once per day)", ["Alignment: 15 + HD · class: 20 + HD", "Level or HD: 25 + HD · fortune as augury: 25 + HD", "Crafted item: +2"]]
  ]],
  ["Sleight of Hand", "Dex", "TA", [
    ["DCs", ["Palm a coin-sized object or make a coin vanish: 10", "Lift a small object from a person: 20", "Palm weapon (draw a light weapon unnoticed): 20", "Untrained cannot beat DC 10 (except hiding an object on your body)"]],
    ["Modifiers", ["Concealing a dagger: +2 · an extraordinarily small object: +4", "Heavy or baggy clothing: +2", "Searcher frisking you: +4 to their Perception", "As a move action: –20", "Each retry against the same target: +10 DC"]]
  ]],
  ["Spellcraft", "Int", "T", [
    ["Task DCs", ["Identify a spell as it is cast: 15 + spell level", "Learn a spell from a spellbook or scroll: 15 + spell level", "Prepare from a borrowed spellbook: 15 + spell level", "Identify a magic item (detect magic): 15 + item's caster level", "Decipher a scroll: 20 + spell level"]],
    ["Modifiers", ["Specialist wizard: +2 for his school, –5 for opposition schools", "Elf: +2 to identify magic item properties", "Identifying a spell as it is cast: same penalties as Perception (distance, conditions)"]],
    ["Time and retries", ["Learning a spell: 1 hour per spell level (30 minutes for level 0)", "Identify item properties: 3 rounds per item, one attempt per item per day", "Failed learning: wait 1 week · failed borrowed book: retry next day · failed identify: no retry"]],
    ["Salvaging", ["Potion: 15 + 3 × the potion's spell level", "Magic item materials or costly components: 10 + item's caster level"]]
  ]],
  ["Stealth", "Dex", "A", [
    ["Modifiers", ["Opposed by observers' Perception", "Moving up to half speed: no penalty · between half and full speed: –5", "Moving to an unobserved spot after a distraction: –10", "Sniping (after a ranged attack from 10+ ft): –20", "Invisible and immobile: +40 · invisible and moving: +20"]],
    ["Size", ["Fine: +16 · Diminutive: +12 · Tiny: +8 · Small: +4 · Medium: 0", "Large: –4 · Huge: –8 · Gargantuan: –12 · Colossal: –16"]]
  ]],
  ["Survival", "Wis", "", [
    ["General DCs", ["Get along in the wild: 10 (feeds 1 other per 2 over 10)", "Avoid getting lost or natural hazards: 15", "Severe weather: 15 (+2 Fort while moving, +4 if stationary)", "Predict weather 24 hours ahead: 15 (+1 day per 5 over)", "Make fire: 20, 10 minutes"]],
    ["Following tracks (surface)", ["Very soft: 5 · soft: 10 · firm: 15 · hard: 20", "Half speed: no penalty · normal speed: –5 · double speed: –20", "Every 3 creatures: –1", "Every 24 hours since the trail: +1 · each hour of rain: +1 · fresh snow: +10", "Poor visibility (largest creature only): overcast or moonless: +6 · moonlight: +3 · fog or rain: +3"]],
    ["Tracks: size modifier", ["Fine: +8 · Diminutive: +4 · Tiny: +2 · Small: +1 · Medium: 0 · Large: –1 · Huge: –2 · Gargantuan: –4 · Colossal: –8"]],
    ["Hiding tracks", ["DC 15: +4 to the DC to follow you (half speed, or +5 to the DC)", "Party hides trail at half speed: +5"]],
    ["Foraging and dowsing", ["Foraging, standard terrain: 15 · barren: 20 · abundant: 10 · rugged terrain: +5", "Dowsing water: 15 · grave: 20 · mineral: 25 (range 400 ft + 40 ft per rank)"]],
    ["Poison, snares", ["Harvest poison from a dead creature: 15 + CR (24 hours); fail by 5+: exposed", "Snare: DC 15 to build, 20 minutes; trap DC 13; spot with Perception 15, hide with Stealth 20"]]
  ]],
  ["Swim", "Str", "A", [
    ["Water DCs", ["Calm water: 10 · rough: 15 · stormy: 20 (cannot take 10)", "Each hour swimming: DC 20 or 1d6 nonlethal damage"]],
    ["Results", ["Fail by 4 or less: no progress. Fail by 5+: you go under", "Success as a move action: quarter speed · as a full-round action: half speed"]],
    ["Holding breath", ["2 × Con score in rounds (move or free actions only)", "Standard or full-round actions cost an extra round", "After that: Con check each round, DC 10 and +1 per round"]],
    ["Modifiers", ["Swim speed: +8 on checks for special actions or hazards"]]
  ]],
  ["Use Magic Device", "Cha", "T", [
    ["Task DCs", ["Activate blindly: 25 (+2 if you already activated it before)", "Decipher a written spell: 25 + spell level (1 minute)", "Use a scroll: 20 + caster level", "Use a wand, staff or spell trigger item: 20", "Emulate a class feature: 20", "Emulate a race: 25 · emulate an alignment: 30", "Intentional mishap: 30"]],
    ["Results", ["Activate blindly, fail by 9 or less: nothing. Fail by 10+: mishap (2d6 damage)", "Natural 1 on a failed activation: no retry for 24 hours", "Emulate an ability score: effective score = result – 15", "Emulate a class feature: effective level = result – 20", "Emulation: check once per hour. Cannot take 10 or aid another"]]
  ]]
]
