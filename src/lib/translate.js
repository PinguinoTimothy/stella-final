// Asks the translate function for a passage. The DeepL key is on the server, not here.
import { SB_ANON, SB_URL } from './supabase';

const cache = new Map();
const MAX_CHARS = 1500;
// In the deployed site the request goes to the same domain (worker/index.js forwards it to Supabase, so no CORS
// setting is needed). In local development it goes straight to the Supabase function.
const DIRECT = import.meta.env.DEV;
const ENDPOINT = DIRECT ? `${SB_URL}/functions/v1/translate` : '/api/translate';

/** { text, source } for the passage in the target language. Repeated passages are kept for this session. */
export async function translate(passage, target = 'ES') {
  const clean = String(passage || '')
    .trim()
    .slice(0, MAX_CHARS);
  if (!clean) throw new Error('Select some text first.');
  const key = `${target}|${clean}`;
  if (cache.has(key)) return cache.get(key);

  let r;
  try {
    r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: DIRECT ? { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, target }),
    });
  } catch (e) {
    // The browser gives no reason here: a blocked origin (CORS), no network, or the function is unreachable.
    throw new Error(
      'Can’t reach the translator from this site. Check the connection, and that the translate function ' +
        'allows this site’s address (CORS) in Supabase. ' +
        (e && e.message ? `(${e.message})` : ''),
      { cause: e },
    );
  }
  const data = await r.json().catch(() => ({}));
  if (!DIRECT && r.status === 404 && !r.headers.get('x-pf1e-proxy'))
    throw new Error('The translator route is not deployed on the site (/api/translate is missing).');
  if (r.status === 404) throw new Error('The translate function is not deployed in this Supabase project (404).');
  if (r.status === 401 || r.status === 403)
    throw new Error(`The translator rejected the request (${r.status}). ${data.message || ''}`.trim());
  if (!r.ok) throw new Error(`${data.error || 'The translation failed.'} (HTTP ${r.status})`);
  cache.set(key, data);
  return data;
}
