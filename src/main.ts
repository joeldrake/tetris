class Tetris extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = '<p>Hello World</p>';
    this._sendEvent('tetris:mounted');
  }

  disconnectedCallback() {
    this._sendEvent('tetris::unmounted');
  }

  _sendEvent(eventName: string) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);
  }
}
customElements.define('web-tetris', Tetris);
