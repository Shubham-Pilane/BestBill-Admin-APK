// Local Cache utility using IndexedDB for instant UI loading and automatic 2-year cleanup

const DB_NAME = 'BestBillAdminCache';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

function getCutoffDateStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'composite_key' });
        store.createIndex('hotel_code', 'hotel_code', { unique: false });
        store.createIndex('snapshot_date', 'snapshot_date', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save snapshot records to IndexedDB and automatically purge records older than 2 years
 */
export async function saveSnapshotsToCache(snapshotsArray) {
  if (!Array.isArray(snapshotsArray) || snapshotsArray.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const cutoff = getCutoffDateStr();

    snapshotsArray.forEach((snap) => {
      if (!snap || !snap.hotel_code || !snap.snapshot_date) return;
      // Skip if snapshot date is older than 2 years
      if (snap.snapshot_date < cutoff) return;

      const composite_key = `${snap.hotel_code}_${snap.snapshot_date}`;
      store.put({
        ...snap,
        composite_key,
        cached_at: Date.now()
      });
    });

    // Auto cleanup items older than 2 years
    const index = store.index('snapshot_date');
    const range = IDBKeyRange.upperBound(cutoff, true);
    const cursorReq = index.openCursor(range);
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[Cache Write Failed]', err.message);
  }
}

/**
 * Retrieve cached snapshots for a given hotel and date range instantly
 */
export async function getCachedSnapshots(hotelCode, startDate, endDate, authCodes = []) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const authList = Array.isArray(authCodes) ? authCodes : [];

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        const cutoff = getCutoffDateStr();

        const filtered = items.filter((snap) => {
          if (!snap.snapshot_date || snap.snapshot_date < cutoff) return false;
          if (authList.length > 0 && !authList.includes(snap.hotel_code)) return false;

          const matchHotel = hotelCode === 'ALL' || snap.hotel_code === hotelCode;
          const matchDate = snap.snapshot_date >= startDate && snap.snapshot_date <= endDate;
          return matchHotel && matchDate;
        });

        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('[Cache Read Failed]', err.message);
    return [];
  }
}
