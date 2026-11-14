/** Page adapter for the fridge view. */
export class FridgePage {
  constructor(renderer) {
    if (typeof renderer !== "function") throw new TypeError("FridgePage requires a renderer");
    this.renderer = renderer;
  }

  render() {
    return this.renderer();
  }
}
