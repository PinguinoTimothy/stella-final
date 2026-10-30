// Small offline copies kept in IndexedDB (database "pf1e-db", store "kv", shared with the spell catalog).
const DB_NAME = 'pf1e-db'
const STORE_NAME = 'kv'
const MAGIC_FACETS_KEY = 'pf1e-magic-facets-v1'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function runTransaction(mode, operation) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const request = operation(tx.objectStore(STORE_NAME))
    tx.oncomplete = () => { resolve(request?.result); db.close() }
    tx.onerror = tx.onabort = () => { reject(tx.error); db.close() }
  })
}

/** Group and slot lists of the magic catalog, so the filters work offline. */
export const getMagicFacetsCache = () => runTransaction('readonly', (s) => s.get(MAGIC_FACETS_KEY))
export const setMagicFacetsCache = (facets) => runTransaction('readwrite', (s) => s.put(facets, MAGIC_FACETS_KEY))
