// The Worker's /api/translate: forwards to Supabase with the key, keeps the status, and reports its own failures.
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translate } from './index.js';

const post = body => new Request('https://site.test/api/translate', { method: 'POST', body: JSON.stringify(body) });
afterEach(() => vi.unstubAllGlobals());

describe('/api/translate worker', () => {
  it('forwards the text to the Supabase function with the anon key and returns its answer', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ text: 'Hola', source: 'EN' }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const res = await translate(post({ text: 'Hello', target: 'ES' }), {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Hola', source: 'EN' });
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/functions\/v1\/translate$/);
    expect(init.headers.apikey).toBeTruthy();
    expect(JSON.parse(init.body)).toEqual({ text: 'Hello', target: 'ES' });
    expect(res.headers.get('x-pf1e-proxy')).toBe('1');
  });

  it('keeps the upstream error status and message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'quota' }), { status: 500 })));
    const res = await translate(post({ text: 'Hello' }), {});
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'quota' });
  });

  it('answers 502 when Supabase cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const res = await translate(post({ text: 'Hello' }), {});
    expect(res.status).toBe(502);
  });

  it('rejects other methods, bad JSON and empty text', async () => {
    expect((await translate(new Request('https://site.test/api/translate'), {})).status).toBe(405);
    expect((await translate(new Request('https://site.test/api/translate', { method: 'POST', body: '{' }), {})).status).toBe(400);
    expect((await translate(post({ text: '   ' }), {})).status).toBe(400);
  });
});
