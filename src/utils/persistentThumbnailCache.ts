const DB_NAME = 'ThumbnailCache';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const MAX_MEMORY_ENTRIES = 200;
const MAX_DB_ENTRIES = 1000;

class PersistentThumbnailCache {
  private memoryCache = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private ready = false;
  private initQueue: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    this.dbPromise = this.openDB();
    this.dbPromise.then(() => {
      this.ready = true;
      this.initQueue.forEach((fn) => fn());
      this.initQueue = [];
    }).catch(() => {
      this.ready = true;
      this.initQueue.forEach((fn) => fn());
      this.initQueue = [];
    });
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    if (this.dbPromise) {
      await this.dbPromise;
    }
  }

  async get(key: string): Promise<string | undefined> {
    const cached = this.memoryCache.get(key);
    if (cached !== undefined) {
      this.memoryCache.delete(key);
      this.memoryCache.set(key, cached);
      return cached;
    }

    await this.ensureReady();
    try {
      const db = await this.dbPromise;
      if (!db) return undefined;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      const result = await new Promise<{ key: string; value: string; timestamp: number } | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (result) {
        if (result.value.startsWith('blob:') || result.value.startsWith('http://localhost') || result.value.startsWith('http://127.0.0.1')) {
          this.delete(result.key);
          return undefined;
        }
        this.setMemory(result.key, result.value);
        return result.value;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    this.setMemory(key, value);

    await this.ensureReady();
    try {
      const db = await this.dbPromise;
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, value, timestamp: Date.now() });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const count = await this.getStoreSize(db);
      if (count > MAX_DB_ENTRIES) {
        this.evictOldest(db);
      }
    } catch {
      // IndexedDB failure is non-critical
    }
  }

  private setMemory(key: string, value: string) {
    if (this.memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, value);
  }

  private getStoreSize(db: IDBDatabase): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  private evictOldest(db: IDBDatabase) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(Date.now());
    const cursorRequest = index.openCursor(range);

    let deleted = 0;
    const targetDelete = Math.floor(MAX_DB_ENTRIES * 0.3);

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor || deleted >= targetDelete) return;
      store.delete(cursor.primaryKey);
      deleted++;
      cursor.continue();
    };
  }

  private async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.ensureReady();
    try {
      const db = await this.dbPromise;
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
    } catch {}
  }

  async has(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result !== undefined;
  }

  clear() {
    this.memoryCache.clear();
    this.dbPromise?.then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    }).catch(() => {});
  }
}

export const thumbnailCache = new PersistentThumbnailCache();
