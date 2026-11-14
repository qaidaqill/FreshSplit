/** Page adapter for the split view. */
export class SplitPage {
  constructor(renderer) {
    if (typeof renderer !== "function") throw new TypeError("SplitPage requires a renderer");
    this.renderer = renderer;
  }

  render() {
    return this.renderer();
  }
}
