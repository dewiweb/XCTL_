// settings-panel.js
// Custom element for OSC/WebSocket settings UI

class SettingsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.oscOutputIp = '';
    this.oscOutputPort = '';
    this.oscInputPort = '';
    this.render();
  }

  async connectedCallback() {
    // Always set fields to latest OSCManager settings
    if (window.osc && window.osc.settings) {
      await this._syncFieldsWithOSC();
    }
  }

  async _syncFieldsWithOSC() {
    // Wait for OSCManager to finish fetching defaults if not in sessionStorage
    if (!sessionStorage.getItem('oscSettings')) {
      for (let i = 0; i < 10; i++) {
        await new Promise(res => setTimeout(res, 50));
        if (window.osc.settings.oscOutputIp !== '127.0.0.1' || window.osc.settings.oscOutputPort !== 9000 || window.osc.settings.oscInputPort !== 8000) {
          break;
        }
      }
    }
    this.setSettings(window.osc.settings);
  }

  setSettings({ oscOutputIp, oscOutputPort, oscInputPort }) {
    this.oscOutputIp = oscOutputIp || '';
    this.oscOutputPort = oscOutputPort || '';
    this.oscInputPort = oscInputPort || '';
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .settings-section { background: #232323d0; border-radius: 16px; padding: 36px 24px 32px 24px; box-shadow: 0 4px 32px #0008; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
        .settings-header { font-size: 2.2em; font-weight: bold; margin: 32px 0 32px 0; color: #FFD600; text-align: center; }
        label { color: #b6b6b6; font-size: 1em; margin-bottom: 4px; }
        input { background: rgba(30,30,34,0.98); border: 1.5px solid #444; border-radius: 9px; color: #fff; font-size: 1.12em; padding: 18px 14px 8px 14px; outline: none; width: 100%; margin-bottom: 12px; }
        button { background: linear-gradient(90deg,#ffd600 60%,#fff700 100%); color: #232323; font-weight: 700; border: none; border-radius: 9px; padding: 13px 44px; font-size: 1.09em; cursor: pointer; box-shadow: 0 2px 16px #ffd60022; letter-spacing: 0.6px; transition: background 0.2s, color 0.2s; }
      </style>
      <div class="settings-header">Settings</div>
      <div class="settings-section">
        <label for="osc-output-ip">OSC Output IP</label>
        <input id="osc-output-ip" type="text" value="${this.oscOutputIp}" placeholder="OSC Output IP" />
        <label for="osc-output-port">OSC Output Port</label>
        <input id="osc-output-port" type="number" value="${this.oscOutputPort}" placeholder="OSC Output Port" />
        <label for="osc-input-port">OSC Input Port</label>
        <input id="osc-input-port" type="number" value="${this.oscInputPort}" placeholder="OSC Input Port" />
        <button id="connect-btn" type="button">Connect</button>
      </div>
    `;
    // Always set DOM .value after rendering
    const ipField = this.shadowRoot.querySelector('#osc-output-ip');
    if (ipField) ipField.value = this.oscOutputIp;
    const outPortField = this.shadowRoot.querySelector('#osc-output-port');
    if (outPortField) outPortField.value = this.oscOutputPort;
    const inPortField = this.shadowRoot.querySelector('#osc-input-port');
    if (inPortField) inPortField.value = this.oscInputPort;

    // Always attach Connect button event listener after rendering
    const btn = this.shadowRoot.querySelector('#connect-btn');
    if (btn) {
      btn.onclick = () => {
        console.log('[SettingsPanel] Connect button clicked');
        const oscOutputIp = this.shadowRoot.querySelector('#osc-output-ip').value;
        const oscOutputPort = parseInt(this.shadowRoot.querySelector('#osc-output-port').value);
        const oscInputPort = parseInt(this.shadowRoot.querySelector('#osc-input-port').value);
        console.log('[SettingsPanel] Saving values:', { oscOutputIp, oscOutputPort, oscInputPort });
        if (window.osc) {
          window.osc.updateSettings({ oscOutputIp, oscOutputPort, oscInputPort });
        }
        this.dispatchEvent(new CustomEvent('settings-change', {
          detail: { oscOutputIp, oscOutputPort, oscInputPort },
          bubbles: true
        }));
        // Visual feedback FIRST, then update state after delay
        const originalText = btn.textContent;
        btn.textContent = '✔ Saved!';
        btn.style.setProperty('background', 'linear-gradient(90deg,#4CAF50 60%,#43e97b 100%)', 'important');
        btn.style.setProperty('color', '#fff', 'important');
        btn.style.setProperty('transition', 'background 0.2s, color 0.2s', 'important');
        console.log('[SettingsPanel] Visual feedback applied (Saved!)');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.removeProperty('background');
          btn.style.removeProperty('color');
          btn.style.removeProperty('transition');
          console.log('[SettingsPanel] Visual feedback reverted');
          this.setSettings({ oscOutputIp, oscOutputPort, oscInputPort });
        }, 1500);
      };
    }
  }
}

customElements.define('settings-panel', SettingsPanel);

export default SettingsPanel;
