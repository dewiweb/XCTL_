// button-group.js
// Modular button group web component for XCTL_OSC

const DEBUG = false;

export class XButtonGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = { select: false, mute: false, solo: false, rec: false };
  }

  connectedCallback() {
    this.render();
    this.initEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .x-button-group { display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: stretch; width: 100%; }
        .x-button { flex: 1; min-width: 0; min-height: 32px; border-radius: 4px; border: none; background: #444; color: #fff; font-weight: bold; cursor: pointer; transition: background 0.2s; width: 100%; text-align: center; }
        .x-button.active { background: #2196F3; }
      </style>
      <div class="x-button-group">
        <button class="x-button rec" aria-pressed="false">REC</button>
        <button class="x-button solo" aria-pressed="false">SOLO</button>
        <button class="x-button mute" aria-pressed="false">MUTE</button>
        <button class="x-button select" aria-pressed="false">SELECT</button>
      </div>
    `;
  }

  set state(obj) {
    this._state = { ...this._state, ...obj };
    this.updateUI();
  }

  get state() {
    return this._state;
  }

  updateUI() {
    ['select','mute','solo', 'rec'].forEach(key => {
      const btn = this.shadowRoot.querySelector(`.${key}`);
      if (btn) {
        btn.classList.toggle('active', !!this._state[key]);
        btn.setAttribute('aria-pressed', !!this._state[key]);
      }
    });
  }

  initEvents() {
    ['select','mute','solo', 'rec'].forEach(key => {
      const btn = this.shadowRoot.querySelector(`.${key}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this._state[key] = !this._state[key];
          this.updateUI();
          if (DEBUG) console.log('Dispatch button-change:', key, this._state[key]);
          this.dispatchEvent(new CustomEvent('button-change', {
            detail: { button: key, value: this._state[key], state: { ...this._state } }
          }));
        });
      }
    });
  }
}

customElements.define('x-button-group', XButtonGroup);
