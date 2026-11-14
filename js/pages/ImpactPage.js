/** Page adapter for the impact view. */
export class ImpactPage {
  constructor(renderer) {
    if (typeof renderer !== "function") throw new TypeError("ImpactPage requires a renderer");
    this.renderer = renderer;
  }

  render() {
    return this.renderer();
  }
}
