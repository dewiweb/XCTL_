// vu-meter.js
// Modular VU meter web component for XCTL_OSC

const DEBUG = false;

export class XVuMeter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = 0;
    this._segments = 8;
  }

  static get observedAttributes() { return ['value','segments']; }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value') this.value = parseFloat(newValue);
    if (name === 'segments') this.segments = parseInt(newValue);
  }

  connectedCallback() {
    this.render();
    this.updateSegments();
  }

  set value(val) {
    this._value = Math.max(0, Math.min(1, parseFloat(val)));
    this.updateSegments();
  }

  get value() { return this._value; }

  set segments(val) {
    this._segments = Math.max(1, parseInt(val));
    this.render();
    this.updateSegments();
  }

  get segments() { return this._segments; }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .vu-wrap {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: center;
          height: 90px;
          width: 38px;
          background: #222;
          border-radius: 6px;
          border: 1.5px solid #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 2px 2px 2px 4px;
        }
        .vu-scale {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          height: 76px;
          margin-right: 4px;
          font-size: 10px;
          color: #bbb;
          font-family: monospace;
          user-select: none;
        }
        .vu-meter {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 76px;
          width: 16px;
        }
        .vu-segment {
          width: 15px;
          height: 8px;
          margin: 1.5px 0;
          background: #333;
          border-radius: 2px;
          transition: background 0.1s;
        }
        .vu-segment.lit-green { background: #4CAF50; }
        .vu-segment.lit-orange { background: orange; }
        .vu-segment.lit-red { background: #F44336; }
      </style>
      <div class="vu-wrap">
        <div class="vu-scale">
          <span>CLIP</span>
          <span>0</span>
          <span>-10</span>
          <span>-20</span>
          <span>-30</span>
          <span>-40</span>
          <span>-50</span>
        </div>
        <div class="vu-meter">
          ${Array(this._segments).fill().map((_,i) => `<div class="vu-segment" data-seg="${i}"></div>`).join('')}
        </div>
      </div>
    `;
  }

  updateSegments() {
    const lit = Math.round(this._value * this._segments);
    const segments = this.shadowRoot.querySelectorAll('.vu-segment');
    segments.forEach((seg, i) => {
      seg.classList.remove('lit-green','lit-orange','lit-red');
      if (i < lit) {
        if (i < 4) seg.classList.add('lit-green');
        else if (i < this._segments-1) seg.classList.add('lit-orange');
        else seg.classList.add('lit-red');
      }
    });
  }
}

customElements.define('x-vu-meter', XVuMeter);
