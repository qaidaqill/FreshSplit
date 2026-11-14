/**
 * Application service for inventory queries and operations.
 */
export class InventoryManager {
  constructor(getItems) {
    this.getItems = getItems;
  }

  getAll() {
    return this.getItems();
  }

  getSortedByExpiry(daysLeft) {
    return this.getAll().slice().sort((a, b) => daysLeft(a.exp) - daysLeft(b.exp));
  }

  findById(id) {
    return this.getAll().find(item => item.id === id) || null;
  }

  findAvailableByKey(key, daysLeft) {
    return this.getAll().find(item => item.k === key && daysLeft(item.exp) >= 0) || null;
  }

  removeById(id) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    return items.splice(index, 1)[0];
  }
}
