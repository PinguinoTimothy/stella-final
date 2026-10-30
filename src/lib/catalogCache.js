const DB_NAME = 'pf1e-db'
const STORE_NAME = 'kv'
const MAGIC_ITEMS_KEY = 'pf1e-magic-items-v1'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
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

    tx.oncomplete = () => {
      resolve(request?.result)
      db.close()
    }

    tx.onerror = () => {
      reject(tx.error)
      db.close()
    }

    tx.onabort = () => {
      reject(tx.error)
      db.close()
    }
  })
}

export function getMagicCatalogCache() {
  return runTransaction('readonly', (store) =>
    store.get(MAGIC_ITEMS_KEY),
  )
}

export function setMagicCatalogCache(items) {
  return runTransaction('readwrite', (store) =>
    store.put(items, MAGIC_ITEMS_KEY),
  )
}