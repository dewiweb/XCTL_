class MappingEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.layers = [];
    this.selectedLayerIdx = 0;
    this.currentPreset = null;
    this.shadowRoot.innerHTML = `
      <style>
        .preset-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .layer-list { float: left; width: 180px; }
        .layer-list ul { list-style: none; padding: 0; }
        .layer-list li { padding: 6px 12px; cursor: pointer; display: flex; align-items: center; }
        .layer-list li.active { background: #FFD600; color: #222; font-weight: bold; }
        .layer-list input.rename { width: 80px; margin-right: 6px; }
        .layer-actions { margin-left: auto; display: flex; gap: 4px; }
        .editor-main { margin-left: 200px; min-height: 300px; }
        .preset-actions { margin-top: 12px; }
        .mapping-table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        .mapping-table th, .mapping-table td { border: 1px solid #888; padding: 4px 8px; }
        .mapping-table th { background: #222; color: #FFD600; }
        .mapping-table input { width: 70px; }
        .mapping-table button { background: #F44336; color: white; border: none; padding: 2px 8px; cursor: pointer; }
        .add-mapping { margin-top: 8px; }
        .status-msg { margin: 10px 0; color: #4CAF50; }
      </style>
      <div>
        <div class="preset-bar">
          <label for="preset-select">Preset:</label>
          <select id="preset-select"></select>
          <button id="new-preset">New</button>
          <button id="save-preset">Save</button>
          <button id="delete-preset">Delete</button>
          <span class="status-msg" id="status-msg"></span>
        </div>
        <div class="layer-list">
          <button id="add-layer">Add Layer</button>
          <ul id="layer-list"></ul>
        </div>
        <div class="editor-main">
          <div id="mapping-editor-panel"></div>
        </div>
      </div>
    `;
    this.renderLayers = this.renderLayers.bind(this);
    this.renderMappingEditor = this.renderMappingEditor.bind(this);
    this.initPresets();
  }

  // --- Preset API Integration ---
  async fetchPresets() {
    return fetch('/api/presets').then(r => r.json());
  }

  async loadPreset(name) {
    const preset = await fetch(`/api/presets/${encodeURIComponent(name)}`).then(r => r.json());
    this.layers = preset.layers || [];
    this.selectedLayerIdx = 0;
    this.currentPreset = name;
    this.renderLayers();
    this.renderMappingEditor();
    this.updatePresetSelector();
    this.setStatus(`Loaded preset: ${name}`);
  }

  async savePreset(name) {
    await fetch(`/api/presets/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layers: this.layers })
    });
    this.setStatus(`Saved preset: ${name}`);
    await this.updatePresetSelector();
  }

  async deletePreset(name) {
    await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    this.setStatus(`Deleted preset: ${name}`);
    await this.updatePresetSelector();
  }

  async updatePresetSelector() {
    const presets = await this.fetchPresets();
    const select = this.shadowRoot.getElementById('preset-select');
    select.innerHTML = '';
    presets.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === this.currentPreset) opt.selected = true;
      select.appendChild(opt);
    });
  }

  addPresetEventListeners() {
    const select = this.shadowRoot.getElementById('preset-select');
    select.onchange = () => this.loadPreset(select.value);

    this.shadowRoot.getElementById('new-preset').onclick = async () => {
      const name = prompt('Preset name?');
      if (!name) return;
      this.layers = [{ name: 'Layer 1', mappings: {} }];
      await this.savePreset(name);
      this.currentPreset = name;
      await this.updatePresetSelector();
      await this.loadPreset(name);
    };

    this.shadowRoot.getElementById('save-preset').onclick = async () => {
      if (!this.currentPreset) {
        const name = prompt('Preset name?');
        if (!name) return;
        this.currentPreset = name;
      }
      await this.savePreset(this.currentPreset);
      await this.updatePresetSelector();
    };

    this.shadowRoot.getElementById('delete-preset').onclick = async () => {
      if (!this.currentPreset) return;
      if (!confirm(`Delete preset "${this.currentPreset}"?`)) return;
      await this.deletePreset(this.currentPreset);
      this.currentPreset = null;
      await this.updatePresetSelector();
      // Optionally load another preset or clear editor
      const presets = await this.fetchPresets();
      if (presets.length) {
        this.currentPreset = presets[0];
        await this.loadPreset(this.currentPreset);
      } else {
        this.layers = [{ name: 'Layer 1', mappings: {} }];
        this.currentPreset = null;
        this.selectedLayerIdx = 0;
        this.renderLayers();
        this.renderMappingEditor();
      }
    };
  }

  async initPresets() {
    await this.updatePresetSelector();
    const presets = await this.fetchPresets();
    if (presets.length) {
      this.currentPreset = presets[0];
      await this.loadPreset(this.currentPreset);
    } else {
      this.layers = [{ name: 'Layer 1', mappings: {} }];
      this.currentPreset = null;
      this.selectedLayerIdx = 0;
      this.renderLayers();
      this.renderMappingEditor();
    }
    this.addPresetEventListeners();
    this.addLayerEventListeners();
  }

  // --- Layer Management ---
  renderLayers() {
    const ul = this.shadowRoot.getElementById('layer-list');
    ul.innerHTML = '';
    this.layers.forEach((layer, idx) => {
      const li = document.createElement('li');
      li.className = idx === this.selectedLayerIdx ? 'active' : '';
      // Rename logic
      if (layer._renaming) {
        const input = document.createElement('input');
        input.className = 'rename';
        input.value = layer.name;
        input.addEventListener('blur', () => this.finishRenameLayer(idx, input.value));
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') input.blur();
        });
        li.appendChild(input);
        input.focus();
      } else {
        li.textContent = layer.name;
        li.onclick = () => this.selectLayer(idx);
      }
      // Layer actions
      const actions = document.createElement('span');
      actions.className = 'layer-actions';
      // Rename
      const renameBtn = document.createElement('button');
      renameBtn.textContent = '✏️';
      renameBtn.title = 'Rename Layer';
      renameBtn.onclick = e => { e.stopPropagation(); this.startRenameLayer(idx); };
      actions.appendChild(renameBtn);
      // Delete
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete Layer';
      delBtn.disabled = this.layers.length === 1;
      delBtn.onclick = e => { e.stopPropagation(); this.deleteLayer(idx); };
      actions.appendChild(delBtn);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }
  selectLayer(idx) {
    this.selectedLayerIdx = idx;
    this.renderLayers();
    this.renderMappingEditor();
  }
  addLayer() {
    let base = 'Layer';
    let n = 1;
    while (this.layers.some(l => l.name === `${base} ${n}`)) n++;
    this.layers.push({ name: `${base} ${n}`, mappings: {} });
    this.selectedLayerIdx = this.layers.length - 1;
    this.renderLayers();
    this.renderMappingEditor();
  }
  deleteLayer(idx) {
    if (this.layers.length === 1) return;
    this.layers.splice(idx, 1);
    if (this.selectedLayerIdx >= this.layers.length) this.selectedLayerIdx = this.layers.length - 1;
    this.renderLayers();
    this.renderMappingEditor();
  }
  startRenameLayer(idx) {
    this.layers[idx]._renaming = true;
    this.renderLayers();
  }
  finishRenameLayer(idx, newName) {
    this.layers[idx].name = newName.trim() || `Layer ${idx+1}`;
    delete this.layers[idx]._renaming;
    this.renderLayers();
  }
  addLayerEventListeners() {
    this.shadowRoot.getElementById('add-layer').onclick = () => this.addLayer();
  }

  // --- Mapping Editor ---
  renderMappingEditor() {
    const panel = this.shadowRoot.getElementById('mapping-editor-panel');
    const layer = this.layers[this.selectedLayerIdx];
    const mappings = layer.mappings;
    let html = '';
    html += `<table class="mapping-table">
      <thead>
        <tr>
          <th>Key</th>
          <th>OSC Address</th>
          <th>MIDI CC</th>
          <th>MIDI Note</th>
          <th>MIDI Min</th>
          <th>MIDI Max</th>
          <th>OSC Min</th>
          <th>OSC Max</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;
    Object.entries(mappings).forEach(([key, entry]) => {
      html += `<tr data-key="${key}">
        <td>${key}</td>
        <td><input type="text" name="osc" value="${entry.osc ?? ''}" /></td>
        <td><input type="number" name="midi_cc" value="${entry.midi_cc ?? ''}" /></td>
        <td><input type="number" name="midi_note" value="${entry.midi_note ?? ''}" /></td>
        <td><input type="number" name="midi_min" value="${entry.midi_min ?? ''}" /></td>
        <td><input type="number" name="midi_max" value="${entry.midi_max ?? ''}" /></td>
        <td><input type="number" name="osc_min" value="${entry.osc_min ?? ''}" /></td>
        <td><input type="number" name="osc_max" value="${entry.osc_max ?? ''}" /></td>
        <td><button class="del-mapping">🗑️</button></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    html += `<button class="add-mapping">Add Mapping</button>`;
    panel.innerHTML = html;
    // Wire up mapping input changes
    panel.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', e => {
        const tr = e.target.closest('tr');
        const key = tr.dataset.key;
        if (!mappings[key]) return;
        const name = input.name;
        mappings[key][name] = input.type === 'number' && input.value !== '' ? Number(input.value) : input.value;
      });
    });
    // Delete mapping
    panel.querySelectorAll('.del-mapping').forEach(btn => {
      btn.addEventListener('click', e => {
        const tr = e.target.closest('tr');
        const key = tr.dataset.key;
        delete mappings[key];
        this.renderMappingEditor();
      });
    });
    // Add mapping
    panel.querySelector('.add-mapping').onclick = () => {
      let idx = 1;
      let newKey = `mapping_${idx}`;
      while (mappings[newKey]) idx++;
      mappings[newKey] = { osc: '', midi_cc: '', midi_note: '', midi_min: 0, midi_max: 127, osc_min: 0, osc_max: 1 };
      this.renderMappingEditor();
    };
  }

  setStatus(msg, isErr = false) {
    const el = this.shadowRoot.getElementById('status-msg');
    el.textContent = msg;
    el.style.color = isErr ? '#F44336' : '#4CAF50';
    setTimeout(() => { el.textContent = ''; }, 3000);
  }
}

customElements.define('mapping-editor', MappingEditor);