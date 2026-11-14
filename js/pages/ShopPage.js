/** Page adapter for the shop view. */
export class ShopPage {
  constructor(renderer) {
    if (typeof renderer !== "function") throw new TypeError("ShopPage requires a renderer");
    this.renderer = renderer;
  }

  render() {
    return this.renderer();
  }
}
