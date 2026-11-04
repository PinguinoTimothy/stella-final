// Feat queries (Supabase table `feats`, see supabase/feats.sql). Read-only, names only.
import { SB_ANON, SB_URL } from './supabase';

const LIST = 'id,name,categories,source,prereq_feats,prerequisites';
const HEADERS = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };
const MAX_PER_LEVEL = 25;

async function get(params, extra = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/feats?${params}`, {
    headers: { ...HEADERS, ...extra },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`feats ${r.status}`);
  return r;
}

const cleanName = q =>
  String(q || '')
    .replace(/[*(),"\\%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
// Quotes a value for PostgREST arrays and lists: {"Item Mastery"}, in.("powerAttack")
const quote = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** One page of feats, by name, optionally filtered by category or source. Returns { rows, total }. */
export async function fetchFeatPage({ query = '', category = '', source = '', offset = 0, limit = 40 } = {}) {
  const p = new URLSearchParams({
    select: LIST,
    order: 'name.asc',
    limit: String(limit),
    offset: String(offset),
  });
  const q = cleanName(query);
  if (q) p.set('name', `ilike.*${q}*`);
  if (category) p.set('categories', `cs.{${quote(category)}}`);
  if (source) p.set('source', `eq.${source}`);
  const r = await get(p, { Prefer: 'count=exact' });
  const rows = await r.json();
  const total = Number((r.headers.get('Content-Range') || '').split('/')[1]);
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

/** The values of the category and source filters. Reads two small columns. */
export async function fetchFeatFacets() {
  const categories = new Set(),
    sources = new Set();
  for (let offset = 0; ; offset += 1000) {
    const p = new URLSearchParams({
      select: 'categories,source',
      order: 'id.asc',
      limit: '1000',
      offset: String(offset),
    });
    const rows = await (await get(p)).json();
    for (const r of rows) {
      (r.categories || []).forEach(c => categories.add(c));
      if (r.source) sources.add(r.source);
    }
    if (rows.length < 1000) break;
  }
  return { categories: [...categories].sort(), sources: [...sources].sort() };
}

async function fetchFeat(id) {
  const p = new URLSearchParams({ select: '*', id: `eq.${id}`, limit: '1' });
  const [row] = await (await get(p)).json();
  return row || null;
}

async function fetchByIds(ids) {
  const list = [...new Set(ids)];
  const out = [];
  for (let i = 0; i < list.length; i += 100) {
    const p = new URLSearchParams({
      select: LIST,
      id: `in.(${list
        .slice(i, i + 100)
        .map(quote)
        .join(',')})`,
      limit: '100',
    });
    out.push(...(await (await get(p)).json()));
  }
  return out;
}

// Feats that require at least one of `ids`.
async function fetchRequiring(ids, limit) {
  if (!ids.length) return [];
  const p = new URLSearchParams({
    select: LIST,
    prereq_feats: `ov.{${ids.map(quote).join(',')}}`,
    order: 'name.asc',
    limit: String(limit),
  });
  return (await get(p)).json();
}

/**
 * The feat in the middle, what it requires (up to `depth` levels up) and what it unlocks (same down).
 * Returns { center, nodes, edges, truncated } or null. Edges are { source, target } = requirement → feat.
 */
export async function featGraph(id, depth = 2) {
  const center = await fetchFeat(id);
  if (!center) return null;

  const byId = new Map([[center.id, center]]);
  const edges = new Set();
  let truncated = false;

  // Requirements, walking up.
  let up = [center];
  for (let d = 0; d < depth && up.length; d++) {
    const need = [...new Set(up.flatMap(f => f.prereq_feats || []))].filter(x => !byId.has(x));
    for (const row of await fetchByIds(need)) byId.set(row.id, row);
    const next = new Map();
    for (const f of up) {
      for (const p of f.prereq_feats || []) {
        edges.add(`${p}>${f.id}`);
        if (byId.has(p) && !next.has(p)) next.set(p, byId.get(p));
      }
    }
    up = [...next.values()];
  }

  // Unlocks, walking down.
  let down = [center];
  for (let d = 0; d < depth && down.length; d++) {
    const kids = await fetchRequiring(
      down.map(f => f.id),
      MAX_PER_LEVEL + 1,
    );
    if (kids.length > MAX_PER_LEVEL) {
      truncated = true;
      kids.length = MAX_PER_LEVEL;
    }
    const frontier = new Set(down.map(f => f.id));
    for (const k of kids) {
      if (!byId.has(k.id)) byId.set(k.id, k);
      for (const p of k.prereq_feats || []) if (frontier.has(p)) edges.add(`${p}>${k.id}`);
    }
    down = kids;
  }

  return {
    center,
    nodes: [...byId.values()],
    edges: [...edges]
      .map(e => {
        const [source, target] = e.split('>');
        return { source, target };
      })
      .filter(e => byId.has(e.source) && byId.has(e.target)),
    truncated,
  };
}
