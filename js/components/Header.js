/** Shared header helpers. Existing header markup remains in the HTML shell. */
export class Header {
  constructor(root = document) {
    this.root = root;
  }

  get resetButton() {
    return this.root.querySelector('[data-act="reset"]');
  }
}
