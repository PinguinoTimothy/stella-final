// Translates a selected passage with DeepL. The DeepL key lives in the function's secrets, never in the app.
//   supabase secrets set DEEPL_AUTH_KEY=your_key
//   supabase functions deploy translate
// Free DeepL keys end in ":fx" and use the free host; paid keys use the pro host.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const MAX_CHARS = 1500
const TARGETS = new Set(['ES', 'EN-US', 'FR', 'DE', 'IT', 'PT-BR'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { text, target } = await req.json()
    const clean = String(text || '').trim()
    if (!clean) return json({ error: 'Select some text first.' }, 400)
    if (clean.length > MAX_CHARS) return json({ error: `Select at most ${MAX_CHARS} characters.` }, 413)
    const lang = TARGETS.has(target) ? target : 'ES'

    const key = Deno.env.get('DEEPL_AUTH_KEY')
    if (!key) return json({ error: 'The translator is not configured.' }, 500)
    const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

    const r = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [clean], target_lang: lang }),
    })
    if (!r.ok) return json({ error: `Translation failed (${r.status}).` }, 502)
    const data = await r.json()
    const t = data.translations?.[0]
    return json({ text: t?.text || '', source: t?.detected_source_language || '' })
  } catch {
    return json({ error: 'Could not read the request.' }, 400)
  }
})
