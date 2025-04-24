// fader.js
// Modular fader (slider) web component for XCTL_OSC

const DEBUG = false;

export class XFader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = 64;
  }

  connectedCallback() {
    this.render();
    this.initEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .fader-wrap {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          height: 200px;
          width: 64px;
          background: #222;
          border-radius: 6px;
          border: 1.5px solid #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 4px;
        }
        .fader-scale {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          height: 180px;
          margin-right: 4px;
          font-size: 11px;
          color: #bbb;
          font-family: monospace;
          user-select: none;
        }
        .fader-slider {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 24px;
          height: 180px;
          margin-left: 2px;
        }
      </style>
      <div class="fader-wrap">
        <div class="fader-scale">
          <span>10</span>
          <span>8</span>
          <span>6</span>
          <span>4</span>
          <span>2</span>
          <span>0</span>
          <span>-2</span>
          <span>-4</span>
          <span>-6</span>
          <span>-8</span>
          <span>-10</span>
        </div>
        <input type="range" class="fader-slider" min="0" max="127" value="${this._value}" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="127" aria-valuenow="${this._value}" aria-label="Fader">
      </div>
    `;
  }

  set value(val) {
    this._value = val;
    const slider = this.shadowRoot.querySelector('.fader-slider');
    if (slider) {
      slider.value = val;
      slider.setAttribute('aria-valuenow', val);
    }
  }

  get value() {
    return this._value;
  }

  initEvents() {
    const slider = this.shadowRoot.querySelector('.fader-slider');
    if (!slider) return;
    slider.addEventListener('input', (e) => {
      this._value = parseInt(e.target.value);
      slider.setAttribute('aria-valuenow', this._value);
      if (DEBUG) console.log('Dispatch fader-change event with value:', this._value);
      this.dispatchEvent(new CustomEvent('fader-change', {
        detail: { value: this._value }
      }));
    });
  }
}

customElements.define('x-fader', XFader);
