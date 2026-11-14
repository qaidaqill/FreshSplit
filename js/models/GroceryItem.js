/**
 * Domain model for one grocery item.
 */
export class GroceryItem {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  updateExpiryDate(date) {
    this.exp = date;
  }

  moveToFreezer(expiryDate) {
    this.loc = "freezer";
    this.updateExpiryDate(expiryDate);
  }

  moveToFridge(expiryDate) {
    this.loc = "fridge";
    this.updateExpiryDate(expiryDate);
  }

  getTotalPrice() {
    return (Number(this.price) || 0) * (Number(this.qty) || 1);
  }

  getTotalWeight() {
    return (Number(this.kg) || 0) * (Number(this.qty) || 1);
  }
}
