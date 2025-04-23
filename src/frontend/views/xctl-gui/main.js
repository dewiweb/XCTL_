import './channel-component.js';
import OSCManager from '/static/components/shared/osc-manager.js';
import './connection-status.js';
import './settings-panel.js';

// Persistent OSCManager instance
const osc = new OSCManager();

// --- SPA Navigation ---
const mixerPanel = document.getElementById('mixer-panel');
const settingsPanel = document.getElementById('settings-panel');
const showSettingsBtn = document.getElementById('show-settings');
const backToMixerBtn = document.getElementById('back-to-mixer');
const connectionStatusEl = document.getElementById('connection-status');
const settingsPanelEl = document.getElementById('settings-panel-element');

showSettingsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mixerPanel.style.display = 'none';
  settingsPanel.style.display = 'block';
  // Populate settings panel with current values
  if (settingsPanelEl) {
    settingsPanelEl.setSettings(osc.settings);
  }
});

backToMixerBtn.addEventListener('click', (e) => {
  e.preventDefault();
  settingsPanel.style.display = 'none';
  mixerPanel.style.display = 'block';
});

// --- Settings panel logic ---
if (settingsPanelEl) {
  settingsPanelEl.addEventListener('settings-change', async (e) => {
  const { oscOutputIp, oscOutputPort, oscInputPort } = e.detail;
  osc.updateSettings({ oscOutputIp, oscOutputPort, oscInputPort });
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
    // Show correct OSC Output IP/Port
    // Always show the latest settings
    connectionStatusEl.setStatus('connected', `Connected (OSC Out: ${osc.settings.oscOutputIp}:${osc.settings.oscOutputPort})`);

    // Listen for settings changes and update status
    if (!window.__oscStatusListenerAdded) {
      window.__oscStatusListenerAdded = true;
      osc.on('settings-change', () => {
        if (window.xctlSocket && window.xctlSocket.readyState === WebSocket.OPEN) {
          connectionStatusEl.setStatus('connected', `Connected (OSC Out: ${osc.settings.oscOutputIp}:${osc.settings.oscOutputPort})`);
        }
      });
    }
  };

  window.xctlSocket.onerror = (error) => {
    // Try next URL if available
    connectWebSocket(urls, attempt + 1);
  };

  window.xctlSocket.onclose = () => {
    // Only set disconnected if all attempts fail
    if (attempt >= urls.length - 1) {
      connectionStatusEl.setStatus('disconnected', 'Disconnected');
    }
  };
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


