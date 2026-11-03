// Asks the translate function for a passage. The DeepL key is on the server, not here.
import { SB_ANON, SB_URL } from './supabase'

const cache = new Map()
const MAX_CHARS = 1500

/** { text, source } for the passage in the target language. Repeated passages are kept for this session. */
export async function translate(passage, target = 'ES') {
  const clean = String(passage || '').trim().slice(0, MAX_CHARS)
  if (!clean) throw new Error('Select some text first.')
  const key = `${target}|${clean}`
  if (cache.has(key)) return cache.get(key)

  let r
  try {
    r = await fetch(`${SB_URL}/functions/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
      body: JSON.stringify({ text: clean, target }),
    })
  } catch {
    throw new Error('No connection to the translator.')
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'The translation failed.')
  cache.set(key, data)
  return data
}
