/** Page adapter for the recipes view. */
export class RecipesPage {
  constructor(renderer) {
    if (typeof renderer !== "function") throw new TypeError("RecipesPage requires a renderer");
    this.renderer = renderer;
  }

  render() {
    return this.renderer();
  }
}
