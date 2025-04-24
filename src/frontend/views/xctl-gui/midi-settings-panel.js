// midi-settings-panel.js
// Custom element for MIDI settings UI

class MidiSettingsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.midiInputs = [];
    this.midiOutputs = [];
    this.selectedMidiInput = '';
    this.selectedMidiOutput = '';
    this.render();
  }

  async connectedCallback() {
    await this._fetchMidiPortsAndSettings();
  }

  async _fetchMidiPortsAndSettings() {
    try {
      const portsRes = await fetch('/api/midi-ports');
      const ports = await portsRes.json();
      this.midiInputs = ports.inputs || [];
      this.midiOutputs = ports.outputs || [];
      const settingsRes = await fetch('/api/midi-settings');
      const midiSettings = await settingsRes.json();
      this.selectedMidiInput = midiSettings.input || '';
      this.selectedMidiOutput = midiSettings.output || '';
      this.render();
    } catch (e) {
      console.error('[MidiSettingsPanel] Failed to fetch MIDI ports/settings:', e);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .settings-section { background: #232323d0; border-radius: 16px; padding: 36px 24px 32px 24px; box-shadow: 0 4px 32px #0008; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
        .settings-header { font-size: 2.2em; font-weight: bold; margin: 32px 0 32px 0; color: #FFD600; text-align: center; }
        label { color: #b6b6b6; font-size: 1em; margin-bottom: 4px; }
        select { background: rgba(30,30,34,0.98); border: 1.5px solid #444; border-radius: 9px; color: #fff; font-size: 1.12em; padding: 12px 14px 8px 14px; outline: none; width: 100%; margin-bottom: 12px; }
        button { background: linear-gradient(90deg,#ffd600 60%,#fff700 100%); color: #232323; font-weight: 700; border: none; border-radius: 9px; padding: 13px 44px; font-size: 1.09em; cursor: pointer; box-shadow: 0 2px 16px #ffd60022; letter-spacing: 0.6px; transition: background 0.2s, color 0.2s; }
      </style>
      <div class="settings-header">MIDI Settings</div>
      <div class="settings-section">
        <label for="midi-input-port">MIDI Input Port</label>
        <select id="midi-input-port">
          ${this.midiInputs.map(port => `<option value="${port}"${port === this.selectedMidiInput ? ' selected' : ''}>${port}</option>`).join('')}
        </select>
        <label for="midi-output-port">MIDI Output Port</label>
        <select id="midi-output-port">
          ${this.midiOutputs.map(port => `<option value="${port}"${port === this.selectedMidiOutput ? ' selected' : ''}>${port}</option>`).join('')}
        </select>
        <button id="save-midi-btn" type="button">Save MIDI Settings</button>
      </div>
    `;
    // Set dropdowns after rendering
    const midiInSel = this.shadowRoot.querySelector('#midi-input-port');
    const midiOutSel = this.shadowRoot.querySelector('#midi-output-port');
    if (midiInSel) midiInSel.value = this.selectedMidiInput;
    if (midiOutSel) midiOutSel.value = this.selectedMidiOutput;
    // Attach event listener for save
    const btn = this.shadowRoot.querySelector('#save-midi-btn');
    if (btn) {
      btn.onclick = async () => {
        const midiInput = this.shadowRoot.querySelector('#midi-input-port').value;
        const midiOutput = this.shadowRoot.querySelector('#midi-output-port').value;
        try {
          const res = await fetch('/api/midi-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: midiInput, output: midiOutput })
          });
          if (res.ok) {
            this.selectedMidiInput = midiInput;
            this.selectedMidiOutput = midiOutput;
            btn.textContent = '✔ Saved!';
            btn.style.setProperty('background', 'linear-gradient(90deg,#4CAF50 60%,#43e97b 100%)', 'important');
            btn.style.setProperty('color', '#fff', 'important');
            setTimeout(() => {
              btn.textContent = 'Save MIDI Settings';
              btn.style.removeProperty('background');
              btn.style.removeProperty('color');
            }, 1500);
          } else {
            btn.textContent = 'Failed!';
            btn.style.setProperty('background', 'linear-gradient(90deg,#f44336 60%,#ff7961 100%)', 'important');
            btn.style.setProperty('color', '#fff', 'important');
            setTimeout(() => {
              btn.textContent = 'Save MIDI Settings';
              btn.style.removeProperty('background');
              btn.style.removeProperty('color');
            }, 1500);
          }
        } catch (e) {
          btn.textContent = 'Error!';
          btn.style.setProperty('background', 'linear-gradient(90deg,#f44336 60%,#ff7961 100%)', 'important');
          btn.style.setProperty('color', '#fff', 'important');
          setTimeout(() => {
            btn.textContent = 'Save MIDI Settings';
            btn.style.removeProperty('background');
            btn.style.removeProperty('color');
          }, 1500);
        }
      };
    }
  }
}

customElements.define('midi-settings-panel', MidiSettingsPanel);

export default MidiSettingsPanel;
