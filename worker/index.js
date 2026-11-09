// Cloudflare Worker: serves the built app and one API route, /api/translate.
// The translator is called from here (server to server), so it does not depend on which site the browser is on
// (no CORS needed in the Supabase function). The Supabase URL and anon key are public, as they are in the app.
const SUPABASE_URL = 'https://cummutyqxwalqeiahgtp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW11dHlxeHdhbHFlaWFoZ3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjA3NTgsImV4cCI6MjEwODc5Njc1OH0.HHYZ8w8xVr1t7bCUNr41x42zHkzXu3v5VOy6-YPtjEg';
const MAX_CHARS = 1500;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'x-pf1e-proxy': '1' },
  });

export async function translate(request, env = {}) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'The request is not valid JSON.' }, 400);
  }

  const text = String(input?.text || '').trim().slice(0, MAX_CHARS);
  const target = String(input?.target || 'ES');
  if (!text) return json({ error: 'Send some text to translate.' }, 400);

  const base = env.SUPABASE_URL || SUPABASE_URL;
  const anon = env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  let upstream;
  try {
    upstream = await fetch(`${base}/functions/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({ text, target }),
    });
  } catch {
    return json({ error: 'The translator service could not be reached from the server.' }, 502);
  }

  // pass the answer through unchanged, with its status
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', 'x-pf1e-proxy': '1' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/translate') return translate(request, env);
    return env.ASSETS.fetch(request);
  },
};
