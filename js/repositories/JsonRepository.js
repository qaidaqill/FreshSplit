/**
 * Browser persistence adapter. JSON files are read-only static catalogues;
 * mutable user data is persisted as JSON in localStorage.
 */
export class JsonRepository {
  constructor(storageKey) { this.storageKey = storageKey; }
  load() {
    try {
      const value = localStorage.getItem(this.storageKey);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return parsed && Array.isArray(parsed.items) ? parsed : null;
    } catch (error) {
      console.error("Unable to load FreshSplit data", error);
      return null;
    }
  }
  save(value) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(value)); return true; }
    catch (error) { console.error("Unable to save FreshSplit data", error); return false; }
  }
  clear() { localStorage.removeItem(this.storageKey); }
}
