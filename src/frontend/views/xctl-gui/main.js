import './channel-component.js';
import OSCManager from '/static/components/shared/osc-manager.js';
import './connection-status.js';
import './osc-settings-panel.js';
import './midi-settings-panel.js';

// Persistent OSCManager instance
const osc = new OSCManager();

// --- Mapping Loader ---
window.activeMapping = null;
fetch('static/active_mapping.json')
  .then(res => res.json())
  .then(mapping => { window.activeMapping = mapping; })
  .catch(err => console.warn('Could not load mapping:', err));

// --- SPA Navigation ---
const mixerPanel = document.getElementById('mixer-panel');
const settingsPanel = document.getElementById('settings-panel');
const midiSettingsPanel = document.getElementById('midi-settings-panel');
const showSettingsBtn = document.getElementById('show-settings');
const showMidiSettingsBtn = document.getElementById('show-midi-settings');
const showMappingEditorBtn = document.getElementById('show-mapping-editor');
const backToMixerBtn = document.getElementById('back-to-mixer');
const backToMixerMidiBtn = document.getElementById('back-to-mixer-midi');
const backToMixerMappingBtn = document.getElementById('back-to-mixer-mapping');
const connectionStatusEl = document.getElementById('connection-status');
const oscSettingsPanelEl = document.getElementById('osc-settings-panel-element');
const midiSettingsPanelEl = document.getElementById('midi-settings-panel-element');
const mappingEditorPanel = document.getElementById('mapping-editor-panel');

showSettingsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mixerPanel.style.display = 'none';
  settingsPanel.style.display = 'block';
  midiSettingsPanel.style.display = 'none';
  mappingEditorPanel.style.display = 'none';
  // Populate settings panel with current values
  if (oscSettingsPanelEl) {
    oscSettingsPanelEl.setSettings(osc.settings);
  }
});

showMidiSettingsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mixerPanel.style.display = 'none';
  settingsPanel.style.display = 'none';
  midiSettingsPanel.style.display = 'block';
  mappingEditorPanel.style.display = 'none';
});

showMappingEditorBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mixerPanel.style.display = 'none';
  settingsPanel.style.display = 'none';
  midiSettingsPanel.style.display = 'none';
  mappingEditorPanel.style.display = 'block';
});

backToMixerBtn.addEventListener('click', (e) => {
  e.preventDefault();
  settingsPanel.style.display = 'none';
  midiSettingsPanel.style.display = 'none';
  mappingEditorPanel.style.display = 'none';
  mixerPanel.style.display = 'block';
});

backToMixerMidiBtn.addEventListener('click', (e) => {
  e.preventDefault();
  midiSettingsPanel.style.display = 'none';
  settingsPanel.style.display = 'none';
  mappingEditorPanel.style.display = 'none';
  mixerPanel.style.display = 'block';
});

backToMixerMappingBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mappingEditorPanel.style.display = 'none';
  settingsPanel.style.display = 'none';
  midiSettingsPanel.style.display = 'none';
  mixerPanel.style.display = 'block';
});

// --- Settings panel logic ---
if (oscSettingsPanelEl) {
  oscSettingsPanelEl.addEventListener('settings-change', async (e) => {
    const { oscOutputIp, oscOutputPort, oscInputPort } = e.detail;
    osc.updateSettings({ oscOutputIp, oscOutputPort, oscInputPort });
    // Send OSC settings update to backend via WebSocket if connected
    if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
      window.xctlSocket.send(JSON.stringify({
        type: 'update_settings',
        settings: {
          osc_output_ip: oscOutputIp,
          osc_output_port: oscOutputPort,
          osc_input_port: oscInputPort
        }
      }));
    }
    connectWebSocket();
  });
}

// --- Dynamic WebSocket logic ---
function getWebSocketURLs() {
  let wsPort = window.location.port || 8000; // Use the port the frontend was loaded from
  let wsHost = window.location.hostname;
  if (wsHost === '0.0.0.0') wsHost = 'localhost';
  // Try localhost first, then 127.0.0.1
  return [
    `ws://${wsHost}:${wsPort}/ws`,
    wsHost !== '127.0.0.1' ? `ws://127.0.0.1:${wsPort}/ws` : null
  ].filter(Boolean);
}

function connectWebSocket(urls = getWebSocketURLs(), attempt = 0) {
  if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
    window.xctlSocket.close();
  }
  if (attempt >= urls.length) {
    connectionStatusEl.setStatus('error', 'WebSocket connection failed (all hosts tried)');
    return;
  }
  const wsUrl = urls[attempt];
  window.xctlSocket = new WebSocket(wsUrl);

  window.xctlSocket.onopen = () => {
    console.log("WebSocket OPENED", wsUrl);
    connectionStatusEl.setStatus('connected', `Connected (OSC Out: ${osc.settings.oscOutputIp}:${osc.settings.oscOutputPort})`);
    if (!window.__oscStatusListenerAdded) {
      window.__oscStatusListenerAdded = true;
      osc.on('settings-change', () => {
        if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
          connectionStatusEl.setStatus('connected', `Connected (OSC Out: ${osc.settings.oscOutputIp}:${osc.settings.oscOutputPort})`);
        }
      });
    }
  };

  window.xctlSocket.onclose = () => {
    console.log("WebSocket CLOSED");
    if (attempt >= urls.length - 1) {
      connectionStatusEl.setStatus('disconnected', 'Disconnected');
    }
  };

  window.xctlSocket.onerror = (error) => {
    console.log("WebSocket ERROR", error);
    connectWebSocket(urls, attempt + 1);
  };

  window.xctlSocket.onmessage = (msg) => {
    console.log("WebSocket MESSAGE", msg.data);
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'layer_change') {
        console.log('[DEBUG] Dispatching xctl-layer-change:', data);
        window.dispatchEvent(new CustomEvent('xctl-layer-change', { detail: data }));
      }

      // --- Centralized Mapping-based UI Update Function ---
      function updateUIFromMapping({type, payload}) {
        if (!window.activeMapping) return;
        let mappingEntry, key, entry, channelIdx, event, value, mappedValue;
        if (type === 'osc') {
          // Find mapping by OSC address
          mappingEntry = Object.entries(window.activeMapping).find(
            ([, entry]) => entry.osc === payload.address
          );
          value = payload.args && payload.args[0];
        } else if (type === 'midi') {
          // Find mapping by MIDI CC or note
          if (payload.data && payload.data.type === 'control_change') {
            mappingEntry = Object.entries(window.activeMapping).find(
              ([, entry]) => entry.midi_cc === payload.data.control
            );
            value = payload.data.value;
          } else if (payload.data && (payload.data.type === 'note_on' || payload.data.type === 'note_off')) {
            mappingEntry = Object.entries(window.activeMapping).find(
              ([, entry]) => entry.midi_note === payload.data.note
            );
            value = payload.data.velocity;
          }
        }
        if (mappingEntry) {
          [key, entry] = mappingEntry;
          const keyMatch = key.match(/^(\w+)_([0-9]+)$/);
          if (keyMatch) {
            event = keyMatch[1];
            channelIdx = keyMatch[2];
          }
          // --- Range Conversion ---
          if (type === 'midi' && entry.midi_min !== undefined && entry.midi_max !== undefined && entry.osc_min !== undefined && entry.osc_max !== undefined) {
            // Convert MIDI value to OSC/UI range
            mappedValue = (value - entry.midi_min) * (entry.osc_max - entry.osc_min) / (entry.midi_max - entry.midi_min) + entry.osc_min;
          } else if (type === 'osc' && entry.osc_min !== undefined && entry.osc_max !== undefined && entry.midi_min !== undefined && entry.midi_max !== undefined) {
            // Convert OSC value to MIDI/UI range
            mappedValue = (value - entry.osc_min) * (entry.midi_max - entry.midi_min) / (entry.osc_max - entry.osc_min) + entry.midi_min;
          } else {
            mappedValue = value;
          }
          // --- End Range Conversion ---
          if (channelIdx && event) {
            const channelEl = document.querySelector(`x-channel[channel="${channelIdx}"]`);
            if (channelEl) {
              if (event === 'fader') {
                channelEl.value = mappedValue;
                const fader = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('x-fader');
                if (fader) fader.value = mappedValue;
              } else if (["mute", "solo", "rec", "select"].includes(event)) {
                const buttonGroup = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('x-button-group');
                if (buttonGroup) buttonGroup.state = { [event]: mappedValue };
                if (event === 'mute' && 'muted' in channelEl) channelEl.muted = !!mappedValue;
              } else if (event === 'knob') {
                const knob = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('rotary-knob');
                if (knob) knob.value = mappedValue;
              }
              // Add more event types as needed
            }
          }
        }
      }
      // --- End Centralized Mapping-based UI Update Function ---

      // --- Use Centralized Mapping for OSC and MIDI ---
      if (data.type === 'osc' && window.activeMapping) {
        updateUIFromMapping({type: 'osc', payload: data});
      } else if (data.type === 'midi' && window.activeMapping) {
        updateUIFromMapping({type: 'midi', payload: data});
      }
      // --- End Centralized Mapping ---

      // Legacy UI update for backend-generated ui_update events
      else if (data.type === 'ui_update') {
        // Handle mapped UI updates from backend
        const channelIdx = data.channel;
        const channelEl = document.querySelector(`x-channel[channel="${channelIdx}"]`);
        if (channelEl) {
          if (data.event === 'fader') {
            // Update fader value
            channelEl.value = data.value;
            const fader = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('x-fader');
            if (fader) fader.value = data.value;
          } else if (["mute", "solo", "rec", "select"].includes(data.event)) {
            // Update button group for all button events
            const buttonGroup = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('x-button-group');
            if (buttonGroup) {
              buttonGroup.state = { [data.event]: data.value };
            }
            // Optionally, set a property on the channel for mute
            if (data.event === 'mute' && 'muted' in channelEl) {
              channelEl.muted = !!data.value;
            }
          } else if (data.event === 'knob') {
            // Update knob value
            const knob = channelEl.shadowRoot && channelEl.shadowRoot.querySelector('rotary-knob');
            if (knob) knob.value = data.value;
          }
          // Add more event types as needed
        }
      } else if (data.type === 'midi') {
        console.log('[MIDI]', data.message, data.data);
      } else {
        console.log('[WS]', data);
      }
    } catch (e) {
      console.warn('Invalid WS message:', msg.data);
    }
  }
}

// Initial connection
connectWebSocket();

// Centralized OSCManager connection status updates
osc.on('connection', (isConnected) => {
  if (isConnected) {
    connectionStatusEl.setStatus('connected', `Connected (OSC Out: ${osc.settings.oscOutputIp}:${osc.settings.oscOutputPort})`);
  } else {
    connectionStatusEl.setStatus('disconnected', 'Disconnected');
  }
});


