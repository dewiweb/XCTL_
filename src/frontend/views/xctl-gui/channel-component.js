import './rotary-knob.js';
import './fader.js';
import './button-group.js';
import './vu-meter.js';
import './scribble-strip.js';

/**
 * ChannelComponent handles a single channel strip, including a rotary encoder,
 * fader, buttons, and VU meter. The rotary encoder is now a <rotary-knob> custom element.
 */
export class ChannelComponent extends HTMLElement {
  /**
   * Creates a new ChannelComponent instance.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.channelNumber = 1;
    this.value = 64; // Initial value for the rotary knob
    this.render();
  }

  /**
   * Returns the observed attributes for this component.
   * @returns {string[]} The observed attributes.
   */
  static get observedAttributes() {
    return ['channel'];
  }

  /**
   * Handles attribute changes for this component.
   * @param {string} name The attribute name.
   * @param {string} oldValue The old attribute value.
   * @param {string} newValue The new attribute value.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'channel') {
      this.channelNumber = parseInt(newValue);
      this.render();
    }
  }

  /**
   * Renders the component's HTML.
   */
  render() {
    this.shadowRoot.innerHTML = this.getChannelHTML();
    this.initControls();
  }

  /**
   * Returns the HTML for this component.
   * @returns {string} The HTML for this component.
   */
  getChannelHTML() {
    return `
      <style>
        .channel-strip {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          background: #2a2a2a;
          border-radius: 5px;
          position: relative;
        }
        .mid-controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .rotary-section { }
        .scribble-strip { }
        .btn-vu-section {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 12px;
        }
        .fader-section { }
      </style>
      <div class="channel-strip">
        <div class="rotary-section">
          <rotary-knob leds="13" value="${this.value}"></rotary-knob>
        </div>
        <div class="scribble-strip">
          <scribble-strip></scribble-strip>
        </div>
        <div class="btn-vu-section">
          <x-vu-meter segments="7" orientation="vertical"></x-vu-meter>
          <x-button-group></x-button-group>
        </div>
        <div class="fader-section">
          <x-fader orientation="vertical" value="${this.value}"></x-fader>
        </div>
      </div>
    `;
  }

  /**
   * Initializes the component's controls.
   */
  initControls() {
    if (this._controlsInitialized) return; // Idempotent
    this._controlsInitialized = true;

    // Listen for rotary-change events from the rotary-knob
    this.shadowRoot.querySelector('rotary-knob').addEventListener('rotary-change', (e) => {
      this.value = e.detail.value;
      this.shadowRoot.querySelector('x-fader').value = this.value;
      // Send ui_event for rotary knob
      if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
        window.xctlSocket.send(JSON.stringify({
          type: 'ui_event',
          control: 'knob',
          channel: this.channelNumber,
          value: this.value
        }));
      }
      this.dispatchEvent(new CustomEvent('fader-change', {
        detail: {
          channel: this.channelNumber,
          value: this.value
        }
      }));
    });

    // Listen for fader-change events from the x-fader
    this.shadowRoot.querySelector('x-fader').addEventListener('fader-change', (e) => {
      this.value = e.detail.value;
      this.shadowRoot.querySelector('rotary-knob').value = this.value;
      // Send ui_event for fader
      if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
        window.xctlSocket.send(JSON.stringify({
          type: 'ui_event',
          control: 'fader',
          channel: this.channelNumber,
          value: this.value
        }));
      }
      this.dispatchEvent(new CustomEvent('fader-change', {
        detail: {
          channel: this.channelNumber,
          value: this.value
        }
      }));
    });

    // Listen for button-change events from the x-button-group
    this.shadowRoot.querySelector('x-button-group').addEventListener('button-change', (e) => {
      this.dispatchEvent(new CustomEvent('button-change', {
        detail: { channel: this.channelNumber, ...e.detail }
      }));
      // Send ui_event for button
      if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
        window.xctlSocket.send(JSON.stringify({
          type: 'ui_event',
          control: 'button',
          channel: this.channelNumber,
          name: e.detail.button,
          value: e.detail.value
        }));
      }
    });

    // Listen for scribble-change events from the scribble-strip
    this.shadowRoot.querySelector('scribble-strip').addEventListener('scribble-change', (e) => {
      this.dispatchEvent(new CustomEvent('scribble-change', {
        detail: { channel: this.channelNumber, ...e.detail }
      }));
    });
  }

  /**
   * Called when the component is connected to the DOM.
   */
  connectedCallback() {
    this.initMouseControls();
  }

  /**
   * Initializes the component's mouse controls.
   */
  initMouseControls() {
    // No direct rotary knob/indicator DOM logic here
  }

  /**
   * Called when the component is disconnected from the DOM.
   */
  disconnectedCallback() {
    if (this._cleanupMouseControls) this._cleanupMouseControls();
  }

  /**
   * Updates the VU meter value in real time (0.0-1.0).
   * @param {number} level Normalized level (0.0-1.0)
   */
  setVuLevel(level) {
    const vu = this.shadowRoot.querySelector('x-vu-meter');
    if (vu) vu.value = level;
  }
}

const DEBUG = false;

if (!customElements.get('x-channel')) {
  customElements.define('x-channel', ChannelComponent);
}
