/** Navigation component contract used by the application shell. */
export class Navigation {
  constructor(root = document) {
    this.root = root;
  }

  get container() {
    return this.root.querySelector("#tabs");
  }

  setContent(html) {
    if (this.container) this.container.innerHTML = html;
  }
}
