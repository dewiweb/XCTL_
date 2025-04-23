// vu-meter.js
// Modular VU meter web component for XCTL_OSC

const DEBUG = false;

export class XVuMeter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = 0;
    this._segments = 7; // Always 7 segments
  }

  static get observedAttributes() { return ['value']; } // Only 'value' is observed

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value') this.value = parseFloat(newValue);
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

  _getScaleLabels() {
    // Always return 7 scale labels for 7 segments
    return ['CLIP','0','-10','-20','-30','-40','-50'];
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .vu-grid {
          display: grid;
          grid-template-rows: repeat(${this._segments}, 1fr);
          grid-template-columns: 32px 18px;
          height: 100%;
          min-height: 140px;
          width: 50px;
          background: #222;
          border-radius: 6px;
          border: 1.5px solid #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 6px 4px 6px 4px;
        }
        .vu-label {
          font-size: 11px;
          color: #bbb;
          font-family: monospace;
          user-select: none;
          align-self: center;
          justify-self: end;
          padding-right: 4px;
        }
        .vu-segment {
          width: 15px;
          height: 16px;
          background: #333;
          border-radius: 2px;
          transition: background 0.1s;
          align-self: center;
          justify-self: start;
        }
        .vu-segment.lit-green { background: #4CAF50; }
        .vu-segment.lit-orange { background: orange; }
        .vu-segment.lit-red { background: #F44336; }
      </style>
      <div class="vu-grid">
        ${this._getScaleLabels().map((label, i) => `
          <span class="vu-label">${label}</span>
          <div class="vu-segment" data-seg="${i}"></div>
        `).join('')}
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
