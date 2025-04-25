document.getElementById('mixer-panel')// layer-status-panel.js
class LayerStatusPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        .status-box {
          border: 1px solid #888;
          border-radius: 8px;
          padding: 12px 18px;
          margin: 16px 0;
          background: #181818;
          color: #FFD600;
          font-family: monospace;
        }
        .status-box h4 {
          margin: 0 0 8px 0;
          font-size: 1.1em;
          color: #FFD600;
        }
        .status-box ul {
          margin: 0 0 0 16px;
          padding: 0;
        }
        .status-box li {
          font-size: 0.95em;
        }
      </style>
      <div class="status-box">
        <h4>Layer Status</h4>
        <div id="layer-name"></div>
        <div id="mapping-keys"></div>
        <div id="all-layers"></div>
      </div>
    `;
  }

  connectedCallback() {
    console.log('[LayerStatusPanel] connectedCallback called');
    this.refresh();
    // Listen for WebSocket UI update events
    this._wsListener = (event) => {
      try {
        const data = JSON.parse(event.data);
        if ((data.type === 'ui_update' && data.event === 'layer_change') || data.type === 'layer_change') {
          console.log('[LayerStatusPanel] WebSocket received:', data);
          if (data.active_layer && data.layer_names && data.mapping_keys) {
            console.log('[LayerStatusPanel] Calling updateFromWSData with:', data);
            this.updateFromWSData(data);
          } else {
            console.log('[LayerStatusPanel] Data missing keys, calling refresh');
            this.refresh();
          }
        }
      } catch (e) { console.warn('[LayerStatusPanel] WS parse error', e); }
    };

    if (window.xctlSocket) {
      window.xctlSocket.addEventListener('message', this._wsListener);
    }
    // Also handle reconnect
    this._wsReconnect = () => {
      if (window.xctlSocket) {
        window.xctlSocket.addEventListener('message', this._wsListener);
      }
    };
    window.addEventListener('xctlSocket-reconnect', this._wsReconnect);
  }

  disconnectedCallback() {
    if (window.xctlSocket && this._wsListener) {
      window.xctlSocket.removeEventListener('message', this._wsListener);
    }
    window.removeEventListener('xctlSocket-reconnect', this._wsReconnect);
  }

  updateFromWSData(data) {
    try {
      console.log('[LayerStatusPanel] updateFromWSData', data);
      const layerName = data.layer_names[data.active_layer] || data.active_layer;
      this.shadowRoot.getElementById('layer-name').innerHTML = `<b>Active Layer:</b> ${layerName} <span style='opacity:0.7'>(${data.active_layer})</span>`;
      this.shadowRoot.getElementById('mapping-keys').innerHTML = `<b>Mapping Keys:</b> <ul>${data.mapping_keys.map(k => `<li>${k}</li>`).join('')}</ul>`;
      this.shadowRoot.getElementById('all-layers').innerHTML = `<b>All Layers:</b> <ul>${Object.entries(data.layer_names).map(([k, v]) => `<li>${v} <span style='opacity:0.6'>(${k})</span></li>`).join('')}</ul>`;
    } catch (err) {
      console.error('[LayerStatusPanel] Error in updateFromWSData:', err, data);
    }
  }

  async refresh() {
    try {
      const res = await fetch('/api/layer-status');
      const data = await res.json();
      const layerName = data.layer_names[data.active_layer] || data.active_layer;
      this.shadowRoot.getElementById('layer-name').innerHTML = `<b>Active Layer:</b> ${layerName} <span style='opacity:0.7'>(${data.active_layer})</span>`;
      this.shadowRoot.getElementById('mapping-keys').innerHTML = `<b>Mapping Keys:</b> <ul>${data.mapping_keys.map(k => `<li>${k}</li>`).join('')}</ul>`;
      this.shadowRoot.getElementById('all-layers').innerHTML = `<b>All Layers:</b> <ul>${Object.entries(data.layer_names).map(([k, v]) => `<li>${v} <span style='opacity:0.6'>(${k})</span></li>`).join('')}</ul>`;
    } catch (e) {
      this.shadowRoot.getElementById('layer-name').textContent = 'Could not load layer status.';
      this.shadowRoot.getElementById('mapping-keys').textContent = '';
      this.shadowRoot.getElementById('all-layers').textContent = '';
    }
  }
}

customElements.define('layer-status-panel', LayerStatusPanel);

document.addEventListener('DOMContentLoaded', () => {
  console.log('[LayerStatusPanel] DOMContentLoaded fired');
  const mixerPanel = document.getElementById('mixer-panel');
  if (mixerPanel) {
    console.log('[LayerStatusPanel] #mixer-panel found');
    if (!document.querySelector('layer-status-panel')) {
      console.log('[LayerStatusPanel] No layer-status-panel in DOM, creating...');
      const lsp = document.createElement('layer-status-panel');
      mixerPanel.appendChild(lsp);
      console.log('[LayerStatusPanel] Dynamically created and appended');
    } else {
      console.log('[LayerStatusPanel] layer-status-panel already present in DOM');
    }
  } else {
    console.error('[LayerStatusPanel] #mixer-panel not found in DOM');
  }
});
