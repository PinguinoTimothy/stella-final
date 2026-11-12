import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCloudStore } from './cloud';
import { useSheetsStore } from './sheets';
import { readFields } from '../lib/sheet';

import { makeSheet } from '../../tests/sheetFixture';

let PDF;
beforeAll(async () => {
  PDF = new Uint8Array(await makeSheet());
});
const wait = ms => new Promise(r => setTimeout(r, ms));

function server() {
  const rows = [], files = {};
  let online = true;
  const R = (x, s = 200) => Promise.resolve({ ok: s < 300, status: s, json: async () => x, arrayBuffer: async () => (x instanceof Uint8Array ? x.buffer : new ArrayBuffer(0)) });
  const fetch = vi.fn(async (url, o = {}) => {
    if (!online) throw new TypeError('offline');
    const u = new URL(url), m = o.method || 'GET';
    if (u.pathname.includes('/auth/v1/token')) return R({ access_token: 'T', refresh_token: 'R', expires_in: 3600 });
    if (u.pathname.includes('/storage/v1/object/') && u.pathname.includes('/character-sheets/')) {
      const path = u.pathname.split('/character-sheets/')[1];
      if (m === 'POST') { files[path] = new Uint8Array(o.body); return R({}, 200); }
      if (m === 'DELETE') { delete files[path]; return R({}); }
      return R(files[path] || new Uint8Array());
    }
    if (u.pathname.endsWith('/rest/v1/sheets') && !u.search.includes('id=eq.')) {
      if (m === 'POST') {
        rows.push({ ...JSON.parse(o.body), updated_at: new Date().toISOString() });
        return R({}, 201);
      }
      return R(rows.map(r => ({ ...r })));
    }
    if (u.search.includes('id=eq.')) {
      const id = u.searchParams.get('id').replace('eq.', '');
      const i = rows.findIndex(r => r.id === id);
      if (m === 'PATCH' && i >= 0) Object.assign(rows[i], JSON.parse(o.body));
      if (m === 'DELETE' && i >= 0) rows.splice(i, 1);
      return R({}, 204);
    }
    return R([]);
  });
  return { fetch, rows, files, setOnline: v => (online = v) };
}

const file = (name = 'Hood Robinson.pdf') => ({ name, arrayBuffer: async () => PDF.buffer.slice(0) });

describe('character sheets store', () => {
  let srv, sheets;
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    srv = server();
    vi.stubGlobal('fetch', srv.fetch);
    const cloud = useCloudStore();
    cloud.session = { at: 'T', rt: 'R', exp: Date.now() + 3e6, email: 'a@b.c' };
    sheets = useSheetsStore();
  });

  it('uploads a sheet, lists it and opens it with the PDF values', async () => {
    const id = await sheets.upload(file());
    expect(sheets.list.map(s => s.name)).toEqual(['Hood Robinson']);
    await sheets.open(id);
    expect(sheets.panel).toBe('open');
    expect(sheets.values.Character_Name).toBe('Hood Robinson');
    expect(sheets.schema.length).toBeGreaterThan(5);
  });

  it('rejects a PDF without fillable fields', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const blank = await (await PDFDocument.create()).save();
    await expect(sheets.upload({ name: 'blank.pdf', arrayBuffer: async () => blank.buffer })).rejects.toThrow(/no fillable fields/);
  });

  it('saves edits to the cloud, and the export carries them', async () => {
    const id = await sheets.upload(file());
    await sheets.open(id);
    sheets.setField('Ability_STR_Total', '18');
    await wait(900);
    expect(srv.rows[0].fields.Ability_STR_Total).toBe('18');
    expect(sheets.status).toBe('saved');
    const out = await sheets.exportPdf();
    const back = (await readFields(out)).fields.find(f => f.name === 'Ability_STR_Total');
    expect(back.value).toBe('18');
  }, 60000);

  it('keeps an edit made offline and sends it when the connection is back', async () => {
    const id = await sheets.upload(file());
    await sheets.open(id);
    srv.setOnline(false);
    sheets.setField('Character_Name', 'Hood R.');
    await wait(900);
    expect(sheets.status).toBe('error');
    expect(JSON.parse(localStorage.getItem(`pf1e-sheet-pending-${id}`)).Character_Name).toBe('Hood R.');
    srv.setOnline(true);
    await sheets.saveNow();
    expect(srv.rows[0].fields.Character_Name).toBe('Hood R.');
    expect(localStorage.getItem(`pf1e-sheet-pending-${id}`)).toBeNull();
  });

  it('minimize and restore keep the same sheet open', async () => {
    const id = await sheets.upload(file());
    await sheets.open(id);
    sheets.minimize();
    expect(sheets.panel).toBe('min');
    expect(sheets.currentId).toBe(id);
    sheets.restore();
    expect(sheets.panel).toBe('open');
  });
});
