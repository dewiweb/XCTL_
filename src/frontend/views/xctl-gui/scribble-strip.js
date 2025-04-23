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

  static get observedAttributes() {
    return ['value', 'color', 'align1', 'align2', 'inverted', 'chars'];
  }

  get chars() {
    return parseInt(this.getAttribute('chars') || '7', 10);
  }

  set chars(val) {
    this.setAttribute('chars', val);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value') {
      this.value = newVal;
    }
    this.render();
  }

  set color(val) {
    this.setAttribute('color', val);
  }
  get color() {
    return this.getAttribute('color') || 'white';
  }

  set align1(val) {
    this.setAttribute('align1', val);
  }
  get align1() {
    return this.getAttribute('align1') || 'center';
  }

  set align2(val) {
    this.setAttribute('align2', val);
  }
  get align2() {
    return this.getAttribute('align2') || 'center';
  }

  set inverted(val) {
    if (val === true || val === 'true') {
      this.setAttribute('inverted', 'true');
    } else {
      this.removeAttribute('inverted');
    }
  }
  get inverted() {
    // Default: not inverted (bright font on dark background)
    return this.hasAttribute('inverted') && this.getAttribute('inverted') !== 'false';
  }

  render() {
    // Color palette per protocol
    const colorMap = {
      'off':   {bg: '#111', fg: '#333'},
      'red':   {bg: '#400', fg: '#fff'},
      'green': {bg: '#040', fg: '#fff'},
      'yellow':{bg: '#440', fg: '#fff'},
      'blue':  {bg: '#004', fg: '#fff'},
      'pink':  {bg: '#404', fg: '#fff'},
      'cyan':  {bg: '#044', fg: '#fff'},
      'white': {bg: '#111', fg: '#fff'}, // protocol: white = bright font on dark bg
    };
    const color = colorMap[this.color.toLowerCase()] || colorMap['white'];
    const alignMap = {left: 'flex-start', center: 'center', right: 'flex-end'};
    const align1 = alignMap[this.align1] || 'center';
    const align2 = alignMap[this.align2] || 'center';
    const inv = this.inverted;
    const lineColors = [
      {bg: color.bg, fg: color.fg},
      inv ? {bg: color.fg, fg: color.bg} : {bg: color.bg, fg: color.fg}
    ];
    // Pad lines to chars
    const chars = this.chars;
    const pad = (s = '') => {
      if (s.length > chars) return s.slice(0, chars);
      return s.padEnd(chars, ' ');
    };
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@700&display=swap');
        .scribble-strip {
          width: ${chars * 13}px;
          height: 42px;
          background: none;
          border-radius: 6px;
          border: 1.5px solid #222;
          margin: 8px 0;
          font-family: 'IBM Plex Mono', 'Consolas', 'Menlo', 'monospace';
          font-size: 15px;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: stretch;
          outline: none;
          padding: 2px;
          box-shadow: 0 1px 6px #0006 inset;
        }
        .scribble-line {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 6px;
          min-height: 18px;
          user-select: text;
          text-align: inherit;
          border-radius: 4px;
          letter-spacing: 1px;
          text-shadow: 0 0 2px #fff8, 0 0 2px #fff4;
        }
        .scribble-strip[contenteditable="true"]:focus {
          border: 1.5px solid #2196F3;
        }
      </style>
      <div class="scribble-strip" tabindex="0" role="textbox" aria-label="Scribble Strip">
        <div class="scribble-line" style="background:${lineColors[0].bg};color:${lineColors[0].fg};text-align:${this.align1};">${pad(this._lines[0])||'&nbsp;'}</div>
        <div class="scribble-line" style="background:${lineColors[1].bg};color:${lineColors[1].fg};text-align:${this.align2};">${pad(this._lines[1])||'&nbsp;'}</div>
      </div>
    `;
  }

  initEvents() {
    // Make both lines editable, but enforce chars per line and 2 lines max
    const self = this;
    this.shadowRoot.querySelectorAll('.scribble-line').forEach((el, idx) => {
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('input', e => {
        let text = el.textContent.replace(/\r/g, '').replace(/\u00A0/g, ' ');
        const max = this.chars;
        if (text.length > max) {
          text = text.slice(0, max);
          el.textContent = text;
          // Move caret to end
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        self._lines[idx] = text;
        if (DEBUG) console.log('Dispatch scribble-change:', self._lines);
        self.dispatchEvent(new CustomEvent('scribble-change', {
          detail: { value: self.value, lines: [...self._lines] }
        }));
      });
    });
  }
}

customElements.define('scribble-strip', ScribbleStrip);
