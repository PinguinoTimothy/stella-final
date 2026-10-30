// Grapple guide (More › Grapple). Text from the original single-file app (var GRV and var GR).
// Pure data, no Vue.

export const GRAPPLE_VIEWS = [
  { "id": "start", "label": "Start it" },
  { "id": "control", "label": "In control" },
  { "id": "resist", "label": "Grappled" },
  { "id": "pinned", "label": "Pinned" },
  { "id": "mods", "label": "Numbers" }
]

export const GRAPPLE_STEPS = {
  "start": [
    {
      "title": "Start the grapple",
      "points": [
        "Standard action: combat maneuver check (your CMB vs the target's CMD).",
        "It provokes an attack of opportunity from the target, unless you have Improved Grapple, grab or something similar.",
        "A humanoid without two free hands takes –4 on the check.",
        "Success: you and the target both become grappled. If the target wasn't adjacent (reach), move it to an adjacent open square. No open square means the grapple fails."
      ]
    },
    {
      "title": "Grab and constrict",
      "points": [
        "Grab: start the grapple as a free action when the attack hits, with +4. It only helps to start and to maintain, never to resist.",
        "Hold (grab only): –20 on the check, but you don't become grappled yourself. Rarely worth it.",
        "Constrict: you also deal your grappling damage the moment the grapple starts."
      ]
    },
    {
      "title": "Grappling damage",
      "points": [
        "Unarmed strike, the natural attack tied to the grapple, armor spikes, or a light or one-handed weapon. Lethal or nonlethal, your choice.",
        "Power Attack and similar bonuses apply, but their penalty also applies to the grapple check that round."
      ]
    },
    {
      "title": "Several attackers",
      "points": [
        "Only the first creature rolls. Each helper using Aid Another adds +2."
      ]
    }
  ],
  "control": [
    {
      "title": "Every turn: maintain the grapple",
      "points": [
        "Standard action: grapple check against the target's CMD, with a +5 circumstance bonus if the target hasn't broken free since the last round. Grab adds another +4.",
        "Success: the hold continues and you pick one option below as part of that same action.",
        "Fail, or you skip the check: the grapple ends by the end of your turn. You can also release it any time on your turn as a free action."
      ]
    },
    {
      "title": "Option: Move",
      "points": [
        "You and the target move up to half your speed. At the end, put the target in any square adjacent to you.",
        "If that square is hazardous (fire, a pit), the target gets a free check to break the grapple with +4."
      ]
    },
    {
      "title": "Option: Damage",
      "points": [
        "Deal your grappling damage."
      ]
    },
    {
      "title": "Option: Pin",
      "points": [
        "The target becomes pinned (this replaces its grappled condition). You stay grappled and lose your Dex bonus to AC."
      ]
    },
    {
      "title": "Option: Tie up",
      "points": [
        "The target must already be pinned, restrained or unconscious, and you need rope in hand (drawing it is a move action, and holding it leaves one hand: –4).",
        "Escape DC = 20 + your CMB. No more checks needed to keep it tied, and you can let go of the grapple.",
        "Tying up a target that is only grappled works too, at –10. If the DC is above 20 + the target's CMB, not even a natural 20 frees it.",
        "A tied-up target is pinned, not helpless."
      ]
    },
    {
      "title": "Constrict",
      "points": [
        "You deal your grappling damage in addition to whichever option you picked."
      ]
    },
    {
      "title": "While you control it",
      "points": [
        "You are still grappled: no movement, –4 Dex, –2 on attacks and maneuvers (except grapple checks). Any two-handed action is out.",
        "Casting needs a concentration check: DC 10 + the other creature's CMB + spell level."
      ]
    }
  ],
  "resist": [
    {
      "title": "Get out",
      "points": [
        "Standard action: a combat maneuver check or an Escape Artist check, against the controller's CMD. No attack of opportunity.",
        "Success, pick one: break the grapple (it ends, you act normally, but your standard action is spent) or reverse it (you become the controller and the other creature can no longer let go for free).",
        "Allies using Aid Another each add +2 to your check.",
        "Constrict deals its damage if you broke or reversed with a grapple check, not with Escape Artist. Grab doesn't help you here."
      ]
    },
    {
      "title": "Or do something else instead",
      "points": [
        "Any action that doesn't need two hands: cast a spell, or attack (even a full attack) with a light or one-handed weapon against anything in reach, including the grappler.",
        "Spells and spell-like abilities need a concentration check, DC 10 + the grappler's CMB + spell level. Somatic, material and focus components need a free hand."
      ]
    },
    {
      "title": "What grappled does to you",
      "points": [
        "Can't move, –4 Dex, –2 on attacks and combat maneuvers (except to grapple or escape), no attacks of opportunity, can't use Stealth to hide from the grappler."
      ]
    }
  ],
  "pinned": [
    {
      "title": "What you can do",
      "points": [
        "Only try to escape: combat maneuver or Escape Artist against the controller's CMD, as a standard action.",
        "Verbal and mental actions are fine."
      ]
    },
    {
      "title": "What it does to you",
      "points": [
        "Can't move, no Dex bonus to AC and an extra –4 AC on top. Pinned replaces grappled; they don't stack."
      ]
    },
    {
      "title": "Casting while pinned",
      "points": [
        "No spells with somatic components.",
        "Material or focus components must already be in hand (drawing them first costs a move action).",
        "Concentration check: DC 10 + the grappler's CMB + spell level."
      ]
    }
  ],
  "mods": [
    {
      "title": "Bonuses",
      "points": [
        "+5 maintaining a grapple on later rounds (target hasn't broken free).",
        "+4 grab, to start and to maintain.",
        "+2 per ally using Aid Another (on the grappler's check, or on a grappled creature's escape).",
        "+4 on the target's free break attempt if you place it in a hazardous square."
      ]
    },
    {
      "title": "Penalties",
      "points": [
        "–4 humanoid without two free hands (or using only one).",
        "–10 tying up a creature that is only grappled.",
        "–20 grab's hold option.",
        "–2 on attacks and maneuvers while grappled (except grapple and escape checks).",
        "–4 Dex while grappled; no Dex bonus to AC while pinned, plus –4 AC."
      ]
    },
    {
      "title": "DCs worth knowing",
      "points": [
        "Concentration while grappled or pinned: 10 + grappler's CMB + spell level.",
        "Escaping ropes: 20 + the binder's CMB."
      ]
    }
  ]
}