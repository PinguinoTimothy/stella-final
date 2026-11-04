// Translates a selected passage with DeepL. The DeepL key lives in the function's secrets, never in the app.
//   supabase secrets set DEEPL_AUTH_KEY=your_key
//   supabase secrets set ALLOWED_ORIGINS=https://your-app.pages.dev      (comma-separated; unset = any origin)
//   supabase secrets set TRANSLATE_DAILY_CAP=15000 TRANSLATE_IP_CAP=8000  (characters per day; optional)
//   supabase functions deploy translate
// Needs the migration 20261104120100_translate_budget.sql.
// Free DeepL keys end in ":fx" and use the free host; paid keys use the pro host.
const MAX_CHARS = 1500
const TARGETS = new Set(['ES', 'EN-US', 'FR', 'DE', 'IT', 'PT-BR'])
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean)
const DAILY_CAP = Number(Deno.env.get('TRANSLATE_DAILY_CAP')) || 100000   // ~450k/month: inside DeepL Free's 500k
const IP_CAP = Number(Deno.env.get('TRANSLATE_IP_CAP')) || 50000

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allow = ALLOWED.length === 0 ? '*' : ALLOWED.includes(origin) ? origin : ALLOWED[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })

const clientIp = (req: Request) =>
  req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'

/** Takes `amount` characters from a daily bucket. true = allowed. Throws if the budget store is unreachable. */
async function take(bucket: string, amount: number, cap: number): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('budget not configured')
  const r = await fetch(`${url}/rest/v1/rpc/translate_take`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_bucket: bucket, p_amount: amount, p_cap: cap }),
  })
  if (!r.ok) throw new Error('budget ' + r.status)
  return (await r.json()) === true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)

  let text: unknown, target: unknown
  try {
    ;({ text, target } = await req.json())
  } catch {
    return json(req, { error: 'Could not read the request.' }, 400)
  }

  const clean = String(text || '').trim()
  if (!clean) return json(req, { error: 'Select some text first.' }, 400)
  if (clean.length > MAX_CHARS) return json(req, { error: `Select at most ${MAX_CHARS} characters.` }, 413)
  const lang = TARGETS.has(String(target)) ? String(target) : 'ES'

  const key = Deno.env.get('DEEPL_AUTH_KEY')
  if (!key) return json(req, { error: 'The translator is not configured.' }, 500)

  // Daily budget per IP and overall. If the budget store fails we refuse (fail closed): the point is protecting the quota.
  const day = new Date().toISOString().slice(0, 10)
  try {
    if (!(await take(`ip:${clientIp(req)}:${day}`, clean.length, IP_CAP)))
      return json(req, { error: 'Daily translation limit reached. Try again tomorrow.' }, 429)
    if (!(await take(`global:${day}`, clean.length, DAILY_CAP)))
      return json(req, { error: 'The translator has reached its daily limit. Try again tomorrow.' }, 429)
  } catch {
    return json(req, { error: 'The translator is unavailable right now.' }, 503)
  }

  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
  try {
    const r = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [clean], target_lang: lang }),
    })
    if (!r.ok) return json(req, { error: `Translation failed (${r.status}).` }, 502)
    const data = await r.json()
    const t = data.translations?.[0]
    return json(req, { text: t?.text || '', source: t?.detected_source_language || '' })
  } catch {
    return json(req, { error: 'Translation failed.' }, 502)
  }
})
