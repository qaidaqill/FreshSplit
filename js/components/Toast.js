/** Accessible toast message helper. */
export class Toast {
  constructor(element = document.querySelector("#toast")) {
    this.element = element;
  }

  show(message) {
    if (!this.element) return;
    this.element.textContent = message;
    this.element.classList.add("show");
  }
}
