// Turns names in text into links that open a popup: spells, and condition names inside descriptions.
// Pure functions (no Vue), so they are easy to check.
import { CONDITIONS } from './conditions';

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest names first, so "Frightened" wins over a shorter name that is contained in it.
const CONDITION_RE = new RegExp(
  `\\b(${[...CONDITIONS]
    .map(c => c.name)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')})\\b`,
  'gi',
);

export function conditionNamed(name) {
  const k = String(name || '').toLowerCase();
  return CONDITIONS.find(c => c.name.toLowerCase() === k) || null;
}

/**
 * "dispel magic, haste (DC 16), alarm" → [{ name: 'dispel magic' }, { name: 'haste', note: '(DC 16)' }, { name: 'alarm' }]
 * The part in parentheses is kept as a note, outside the link.
 */
export function splitNames(list) {
  return String(list || '')
    .split(/,\s*/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => {
      const m = t.match(/^(.*?)\s*(\(.*\))?$/);
      return { name: (m?.[1] || t).replace(/[*_]/g, '').trim(), note: m?.[2] || '' };
    })
    .filter(x => x.name);
}

/** Splits a text into plain parts and condition parts, so the condition names can be tapped. */
export function textParts(text) {
  const src = String(text || '');
  const out = [];
  let last = 0;
  for (const m of src.matchAll(CONDITION_RE)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    out.push({ text: m[0], condition: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Slug used by item_reference.target_slug: "Acid Arrow" → "acid_arrow", "greater dispel magic" → "greater_dispel_magic". */
export function spellSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
