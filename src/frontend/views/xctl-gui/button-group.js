// button-group.js
// Modular button group web component for XCTL_OSC

const DEBUG = false;

export class XButtonGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = { select: false, mute: false, solo: false, rec: false };
    this._modes = { select: 'toggle', mute: 'toggle', solo: 'toggle', rec: 'toggle' };
  }

  set modes(obj) {
    this._modes = { ...this._modes, ...obj };
  }
  get modes() {
    return this._modes;
  }

  connectedCallback() {
    this.render();
    this.initEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .x-button-group { display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: stretch; width: 100%; height: 100%; }
        .x-button { flex: 1; min-width: 0; min-height: 32px; border-radius: 4px; border: none; background: #444; color: #fff; font-weight: bold; cursor: pointer; transition: background 0.2s; width: 100%; text-align: center; }
        .x-button.rec.active { background: #e53935; color: #fff; }
        .x-button.solo.active { background: #ffd600; color: #222; }
        .x-button.mute.active { background: #ff9800; color: #222; }
        .x-button.select.active { background: #2196F3; color: #fff; }
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
      if (!btn) return;
      const mode = () => this._modes[key] || 'toggle';
      if (mode() === 'momentary') {
        btn.addEventListener('mousedown', () => {
          this._state[key] = true;
          this.updateUI();
          this.dispatchEvent(new CustomEvent('button-change', {
            detail: { button: key, value: true }
          }));
        });
        btn.addEventListener('mouseup', () => {
          this._state[key] = false;
          this.updateUI();
          this.dispatchEvent(new CustomEvent('button-change', {
            detail: { button: key, value: false }
          }));
        });
        btn.addEventListener('mouseleave', () => {
          if (this._state[key]) {
            this._state[key] = false;
            this.updateUI();
            this.dispatchEvent(new CustomEvent('button-change', {
              detail: { button: key, value: false }
            }));
          }
        });
      } else {
        btn.addEventListener('click', () => {
          this._state[key] = !this._state[key];
          this.updateUI();
          this.dispatchEvent(new CustomEvent('button-change', {
            detail: { button: key, value: this._state[key] }
          }));
        });
      }
    });
  }
}

customElements.define('x-button-group', XButtonGroup);
