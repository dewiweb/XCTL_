// rotary-knob.js
// Modular rotary knob web component for XCTL_OSC

export class RotaryKnob extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Value property setter/getter for programmatic updates
  set value(val) {
    this.setAttribute('value', val);
    this.render();
  }
  get value() {
    return parseInt(this.getAttribute('value') ?? '64', 10);
  }

  connectedCallback() {
    this.render();
    this._onPointerDown = this._pointerDown.bind(this);
    this.addEventListener('pointerdown', this._onPointerDown);
    this._pushActive = false;
  }

  disconnectedCallback() {
    this.removeEventListener('pointerdown', this._onPointerDown);
    if (this._onPointerMove) window.removeEventListener('pointermove', this._onPointerMove);
    if (this._onPointerUp) window.removeEventListener('pointerup', this._onPointerUp);
  }

  _pointerDown(e) {
    if (e.ctrlKey) {
      this._pushActive = true;
      this.dispatchEvent(new CustomEvent('rotary-push', { bubbles: true, composed: true }));
    }
    e.preventDefault();
    this._dragStartY = e.clientY;
    this._dragStartX = e.clientX;
    this._startValue = parseInt(this.getAttribute('value') ?? '64', 10);
    this._onPointerMove = this._pointerMove.bind(this);
    this._onPointerUp = this._pointerUp.bind(this);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.setPointerCapture && this.setPointerCapture(e.pointerId);
    this.render();
  }

  _pointerMove(e) {
    const deltaY = this._dragStartY - e.clientY;
    const deltaX = e.clientX - this._dragStartX;
    // Use the greater movement axis, but allow both directions
    const delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
    let newValue = this._startValue + Math.round(delta / 2); // Adjust sensitivity
    newValue = Math.max(0, Math.min(127, newValue));
    if (newValue !== this._lastValue) {
      this.setAttribute('value', newValue);
      this.render();
      this.dispatchEvent(new CustomEvent('rotary-change', { detail: { value: newValue } }));
      this._lastValue = newValue;
    }
  }

  _pointerUp(e) {
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.releasePointerCapture && this.releasePointerCapture(e.pointerId);
    this._pushActive = false;
    this.render();
  }

  static get observedAttributes() { return ['value', 'leds']; }
  attributeChangedCallback() { this.render(); }

  render() {
    // Get value and number of ticks (leds) from attributes, with defaults
    const value = parseInt(this.getAttribute('value') ?? '64', 10);
    const leds = parseInt(this.getAttribute('leds') ?? '13', 10);
    const min = 0, max = 127;
    const angleStart = -135; // degrees
    const angleEnd = 135; // degrees
    const cx = 24, cy = 24, r = 20, tickR = 22;
    // Calculate angle for the pointer
    const valueNorm = (value - min) / (max - min);
    const pointerAngle = angleStart + valueNorm * (angleEnd - angleStart);
    // Determine tick mode from param attribute
    const param = (this.getAttribute('param') || '').toLowerCase();
    // Single-tick mode for pan, position, or x; multi-tick otherwise
    const singleTickParams = ['pan', 'position', 'x', 'pos', 'azimuth'];
    const singleTick = singleTickParams.some(p => param.includes(p));
    // Calculate which tick should be the last lit one
    const litIndex = Math.round(valueNorm * (leds - 1));
    // Choose color based on push mode
    const litColor = this._pushActive ? '#f00' : '#0f0';
    let ticks = '';
    for (let i = 0; i < leds; ++i) {
      const frac = leds === 1 ? 0.5 : i / (leds - 1);
      const a = angleStart + frac * (angleEnd - angleStart);
      const rad = (a - 90) * Math.PI / 180;
      const x1 = cx + tickR * Math.cos(rad);
      const y1 = cy + tickR * Math.sin(rad);
      const x2 = cx + (tickR + 4) * Math.cos(rad);
      const y2 = cy + (tickR + 4) * Math.sin(rad);
      let color;
      if (singleTick) {
        color = i === litIndex ? litColor : '#333';
      } else {
        color = i <= litIndex ? litColor : '#333';
      }
      ticks += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="2" />`;
    }
    // Pointer
    const pointerRad = (pointerAngle - 90) * Math.PI / 180;
    const px = cx + (r - 7) * Math.cos(pointerRad);
    const py = cy + (r - 7) * Math.sin(pointerRad);
    const pointerColor = this._pushActive ? '#f00' : '#0f0';
    this.shadowRoot.innerHTML = `
      <style>
        .rotary-svg {
          display: block;
          width: 48px;
          height: 48px;
        }
      </style>
      <svg class="rotary-svg" width="48" height="48">
        <circle cx="24" cy="24" r="20" fill="#222" stroke="#444" stroke-width="4" />
        ${ticks}
        <circle cx="24" cy="24" r="13" fill="#444" />
        <line x1="24" y1="24" x2="${px.toFixed(2)}" y2="${py.toFixed(2)}" stroke="${pointerColor}" stroke-width="4" stroke-linecap="round" />
      </svg>
    `;
  }
}

customElements.define('rotary-knob', RotaryKnob);