/**
 * Routes the active tab to its page renderer.
 * Page modules are injected by the application controller.
 */
export class PageRouter {
  constructor(pages, defaultPage = "fridge") {
    this.pages = pages;
    this.defaultPage = defaultPage;
  }

  render(pageId) {
    const page = this.pages[pageId] || this.pages[this.defaultPage];
    if (!page) throw new Error(`Unknown FreshSplit page: ${pageId}`);
    return page.render();
  }
}
