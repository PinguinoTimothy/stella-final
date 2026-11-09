// Regression: "No connection" hid the real cause. Each failure now says what happened.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translate } from './translate';

const reply = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
let n = 0; // a new passage each test, so the cache from one test does not answer another
const passage = () => `Passage ${++n}`;

describe('translate errors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a blocked or unreachable translator says so, and mentions CORS', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(translate(passage())).rejects.toThrow(/Can.t reach the translator.*CORS/);
  });

  it('a missing function says it is not deployed', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(404, { message: 'Requested function was not found' })));
    await expect(translate(passage())).rejects.toThrow(/not deployed.*404/);
  });

  it('a rejected key or login says so, with the status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { message: 'Invalid JWT' })));
    await expect(translate(passage())).rejects.toThrow(/rejected the request \(401\).*Invalid JWT/);
  });

  it('a server error shows its message and status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(500, { error: 'DeepL quota exceeded' })));
    await expect(translate(passage())).rejects.toThrow(/DeepL quota exceeded \(HTTP 500\)/);
  });

  it('a good answer is returned and kept for the session', async () => {
    const f = vi.fn(() => reply(200, { text: 'Hola', source: 'EN' }));
    vi.stubGlobal('fetch', f);
    const p = passage();
    expect(await translate(p, 'ES')).toEqual({ text: 'Hola', source: 'EN' });
    expect(await translate(p, 'ES')).toEqual({ text: 'Hola', source: 'EN' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});
