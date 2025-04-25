

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
        .active {
          color: #00FF00;
          font-weight: bold;
        }
      </style>
      <div class="status-box">
        <h4>Layer Status</h4>
        <div id="preset-name"></div>
        <div id="layer-list"></div>
      </div>
    `;
  }

  connectedCallback() {
    this.refresh();
    window.addEventListener('xctl-layer-change', (event) => {
      this.renderLayers(event.detail);
    });
  }

  async refresh() {
    try {
      const res = await fetch('/api/layer-status');
      const data = await res.json();
      this.renderLayers(data);
      this.renderPresetName(data);
    } catch (e) {
      this.shadowRoot.getElementById('layer-list').textContent = 'Could not load layer status.';
      this.shadowRoot.getElementById('preset-name').textContent = '';
    }
  }

  renderLayers(data) {
    const layerNames = data.layer_names;
    const activeLayer = data.active_layer;
    let html = '<ul>';
    Object.entries(layerNames).forEach(([key, name]) => {
      html += `<li class="${key === activeLayer ? 'active' : ''}">${name}</li>`;
    });
    html += '</ul>';
    this.shadowRoot.getElementById('layer-list').innerHTML = html;
  }

  renderPresetName(data) {
    // If backend adds active_preset, use it; otherwise fallback
    const presetName = data.active_preset || 'Default';
    this.shadowRoot.getElementById('preset-name').innerHTML = `<b>Preset:</b> ${presetName}`;
  }
}

customElements.define('layer-status-panel', LayerStatusPanel);
