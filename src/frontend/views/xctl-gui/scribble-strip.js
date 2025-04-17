// scribble-strip.js
// Modular scribble strip web component for XCTL_OSC

const DEBUG = false;

export class ScribbleStrip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._lines = ["", ""];
  }

  connectedCallback() {
    this.render();
    this.initEvents();
  }

  set value(val) {
    if (Array.isArray(val)) {
      this._lines = [val[0]?.slice(0,7)||"", val[1]?.slice(0,7)||""];
    } else if (typeof val === "string") {
      const lines = val.split("\n").slice(0,2).map(line => line.slice(0,7));
      this._lines = [lines[0]||"", lines[1]||""];
    }
    this.render();
  }

  get value() {
    return this._lines.join("\n");
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .scribble-strip {
          width: 70px;
          height: 40px;
          background: #111;
          color: #fff;
          border-radius: 4px;
          border: 1px solid #333;
          margin: 8px 0;
          font-family: monospace;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          outline: none;
          padding: 2px;
        }
        .scribble-strip[contenteditable="true"]:focus {
          border: 1.5px solid #2196F3;
        }
      </style>
      <div class="scribble-strip" contenteditable="true" role="textbox" aria-label="Scribble Strip">${this._lines.map(l=>l||"&nbsp;").join("<br>")}</div>
    `;
  }

  initEvents() {
    const el = this.shadowRoot.querySelector('.scribble-strip');
    el.addEventListener('input', e => {
      let text = el.textContent.replace(/\r/g, '').replace(/\u00A0/g, ' ');
      const lines = text.split('\n').slice(0,2).map(line => line.slice(0,7));
      this._lines = [lines[0]||"", lines[1]||""];
      this.render();
      if (DEBUG) console.log('Dispatch scribble-change:', this._lines);
      this.dispatchEvent(new CustomEvent('scribble-change', {
        detail: { value: this.value, lines: [...this._lines] }
      }));
    });
  }
}

customElements.define('scribble-strip', ScribbleStrip);
