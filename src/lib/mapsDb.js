// Map PDFs kept on this device, in IndexedDB database "stella-maps". The files never leave the browser.
// Two stores: "meta" (name, size, pages, sections, date) for the list, and "files" (the PDF itself).
const DB_NAME = 'stella-maps';
const VERSION = 1;

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta', { keyPath: 'id' });
        req.result.createObjectStore('files', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

/** Runs one request on one store and resolves with its result. */
async function op(store, mode, make) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction(store, mode);
    const req = make(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const newId = () => 'map-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

/** All maps, newest first. Metadata only, no files. */
export async function listMaps() {
  const rows = (await op('meta', 'readonly', s => s.getAll())) || [];
  return rows.sort((a, b) => b.addedAt - a.addedAt);
}

/** Stores a PDF and its metadata. */
export async function addMap(file) {
  const id = newId();
  const meta = {
    id,
    name: file.name.replace(/\.pdf$/i, ''),
    size: file.size,
    pages: null,
    sections: null,
    addedAt: Date.now(),
  };
  const conn = await db();
  await new Promise((resolve, reject) => {
    const tx = conn.transaction(['meta', 'files'], 'readwrite');
    tx.objectStore('meta').put(meta);
    tx.objectStore('files').put({ id, blob: file });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return meta;
}

/** Updates some fields of a map's metadata. */
export async function updateMap(id, fields) {
  const meta = await op('meta', 'readonly', s => s.get(id));
  if (meta) await op('meta', 'readwrite', s => s.put({ ...meta, ...fields }));
}

export const setPages = (id, pages) => updateMap(id, { pages });
export const setSections = (id, sections) => updateMap(id, { sections });
export const renameMap = (id, name) => updateMap(id, { name });

export async function getFile(id) {
  const row = await op('files', 'readonly', s => s.get(id));
  return row?.blob || null;
}

export async function removeMap(id) {
  const conn = await db();
  await new Promise((resolve, reject) => {
    const tx = conn.transaction(['meta', 'files'], 'readwrite');
    tx.objectStore('meta').delete(id);
    tx.objectStore('files').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
