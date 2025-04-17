// rotary-knob.js
// Modular rotary knob web component for XCTL_OSC

const DEBUG = false;

export class RotaryKnob extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._angle = 0;
    this._value = 64;
    this._controlsInitialized = false;
    this._ledMode = 'single'; // 'single' or 'bar'
  }

  set ledMode(mode) {
    if (mode !== 'bar' && mode !== 'single') return;
    this._ledMode = mode;
    this.render();
  }
  get ledMode() {
    return this._ledMode;
  }

  connectedCallback() {
    this.render();
    this.initControls();
    this.initMouseControls();
  }

  render() {
    const tickCount = 13;
    const startAngle = -165;
    const endAngle = 165;
    let litTicks;
    if (this._ledMode === 'bar') {
      litTicks = Math.round((this._value / 127) * (tickCount - 1));
    } else {
      litTicks = Math.round((this._value / 127) * (tickCount - 1));
    }
    const ticks = Array.from({ length: tickCount }).map((_, i) => {
      const angle = startAngle + (i * (endAngle - startAngle) / (tickCount - 1));
      let lit = false;
      if (this._ledMode === 'bar') {
        lit = i <= litTicks;
      } else {
        lit = i === litTicks;
      }
      return `<div class="knob-tick${lit ? ' lit' : ''}" style="transform: rotate(${angle}deg) translateY(-50%);"></div>`;
    }).join('');
    this.shadowRoot.innerHTML = `
      <style>
        .rotary-knob-bg {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: radial-gradient(ellipse at 60% 35%, #444 60%, #222 100%);
          box-shadow: 0 0 0 2px #222, 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .knob-center {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .knob-inner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: radial-gradient(ellipse at 60% 35%, #222 60%, #111 100%);
          box-shadow: 0 0 8px #000a, 0 0 0 2px #333;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .knob-dimple {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #181818;
          box-shadow: 0 1px 3px #000a inset;
          position: absolute;
          left: 50%;
          top: 54%;
          transform: translate(-50%, -50%);
          border: 1px solid #333;
        }
        .knob-ring {
          position: absolute;
          width: 50px;
          height: 50px;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          border-radius: 50%;
          border: 2px solid #444;
          box-sizing: border-box;
          z-index: 1;
        }
        .knob-tick {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 16px;
          height: 7px;
          background: #2a2320;
          border-radius: 5px;
          transform-origin: 50% 100%;
          opacity: 0.25;
          transition: background 0.1s, opacity 0.1s;
          z-index: 3;
          pointer-events: none;
        }
        .knob-tick.lit {
          background: linear-gradient(90deg, #ff6a00 0%, #ffb400 100%);
          box-shadow: 0 0 6px 2px #ff6a0088;
          opacity: 0.95;
        }
      </style>
      <div class="rotary-knob-bg" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="127" aria-valuenow="${this._value}" aria-label="Rotary Encoder">
        <div class="knob-center">${ticks}</div>
        <div class="knob-ring"></div>
        <div class="knob-inner">
          <div class="knob-dimple"></div>
        </div>
      </div>
    `;
  }

  set value(val) {
    this._value = val;
    this.render();
    const knob = this.shadowRoot.querySelector('.rotary-knob-bg');
    if (knob) knob.setAttribute('aria-valuenow', val);
    if (DEBUG) console.log('Dispatch rotary-change event with value:', val);
    this.dispatchEvent(new CustomEvent('rotary-change', {
      detail: { value: val }
    }));
  }

  get value() {
    return this._value;
  }

  updateIndicatorPosition(angle) {
    // No-op: indicator removed, ticks are the indicator
  }

  initControls() {
    if (this._controlsInitialized) return;
    this._controlsInitialized = true;
  }

  initMouseControls() {
    const knob = this.shadowRoot.querySelector('.rotary-knob-bg');
    if (!knob) {
      if (DEBUG) console.error('Knob element not found!');
      return;
    }
    let isDragging = false;
    let startAngle = 0;
    let currentAngle = 0;
    let centerX, centerY;

    knob.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = knob.getBoundingClientRect();
      centerX = rect.left + rect.width/2;
      centerY = rect.top + rect.height/2;
      startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180/Math.PI;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      let angle = Math.atan2(dy, dx) * 180/Math.PI;
      angle = Math.max(-165, Math.min(165, angle));
      currentAngle = angle;
      const value = Math.round(((currentAngle + 165) / 330) * 127);
      this.value = value;
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }
}

customElements.define('rotary-knob', RotaryKnob);
