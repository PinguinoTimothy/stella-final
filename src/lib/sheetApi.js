// Supabase calls for character sheets: the PDF in Storage, the field values in the sheets table.
import { SB_ANON, SB_URL } from './supabase';

const BUCKET = 'character-sheets';

const auth = tok => ({ apikey: SB_ANON, Authorization: 'Bearer ' + tok });

async function failed(r) {
  let b = {};
  try {
    b = await r.json();
  } catch {
    /* no body */
  }
  throw { code: r.status, msg: b.message || b.error || '' };
}

export async function uploadPdf(tok, path, bytes) {
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...auth(tok), 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
    body: bytes,
  });
  if (!r.ok) await failed(r);
}

export async function downloadPdf(tok, path) {
  const r = await fetch(`${SB_URL}/storage/v1/object/authenticated/${BUCKET}/${path}`, { headers: auth(tok), cache: 'no-store' });
  if (!r.ok) await failed(r);
  return new Uint8Array(await r.arrayBuffer());
}

export async function listSheets(tok) {
  const r = await fetch(`${SB_URL}/rest/v1/sheets?select=id,name,storage_path,fields,updated_at&order=name.asc`, {
    headers: auth(tok),
    cache: 'no-store',
  });
  if (!r.ok) await failed(r);
  return r.json();
}

export async function insertSheet(tok, row) {
  const r = await fetch(`${SB_URL}/rest/v1/sheets`, {
    method: 'POST',
    headers: { ...auth(tok), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) await failed(r);
}

export async function saveFields(tok, id, fields) {
  const r = await fetch(`${SB_URL}/rest/v1/sheets?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...auth(tok), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ fields, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) await failed(r);
}

export async function deleteSheet(tok, id, path) {
  const h = auth(tok);
  const r1 = await fetch(`${SB_URL}/rest/v1/sheets?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: h });
  if (!r1.ok) await failed(r1);
  await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers: h });
}
