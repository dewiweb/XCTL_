// Mapping Editor Component for XCTL_OSC
// Allows user to view and edit active_mapping.json via the UI

const mappingTableTemplate = (mappings) => `
  <table class="mapping-table">
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
    <tbody>
      ${Object.entries(mappings).map(([key, entry]) => {
        const oscEmpty = !entry.osc;
        return `
        <tr data-key="${key}">
          <td>${key}</td>
          <td><input type="text" name="osc" value="${entry.osc ?? ''}" ${oscEmpty ? 'disabled' : ''} /></td>
          <td><input type="number" name="midi_cc" value="${entry.midi_cc ?? ''}" disabled /></td>
          <td><input type="number" name="midi_note" value="${entry.midi_note ?? ''}" disabled /></td>
          <td><input type="number" name="midi_min" value="${entry.midi_min ?? ''}" disabled /></td>
          <td><input type="number" name="midi_max" value="${entry.midi_max ?? ''}" disabled /></td>
          <td><input type="number" name="osc_min" value="${entry.osc_min ?? ''}" ${oscEmpty ? 'disabled' : ''} /></td>
          <td><input type="number" name="osc_max" value="${entry.osc_max ?? ''}" ${oscEmpty ? 'disabled' : ''} /></td>
          <td>
            <span class="disabled-action" title="Mappings cannot be deleted">&#128274;</span>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
`;

class MappingEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.mappings = {};
    this.shadowRoot.innerHTML = `
      <style>
        .mapping-table { border-collapse: collapse; width: 100%; }
        .mapping-table th, .mapping-table td { border: 1px solid #888; padding: 4px 8px; }
        .mapping-table th { background: #222; color: #FFD600; }
        .mapping-table input { width: 70px; }
        .mapping-table button { background: #F44336; color: white; border: none; padding: 2px 8px; cursor: pointer; }
        .file-menu {
          display: inline-block;
          position: relative;
          margin-bottom: 10px;
        }
        .file-menu-btn {
          background: #222; color: #FFD600; border: none; padding: 6px 18px; cursor: pointer; font-size: 16px;
        }
        .file-menu-dropdown {
          display: none;
          position: absolute;
          left: 0;
          background: #333;
          min-width: 160px;
          z-index: 1;
          border: 1px solid #222;
          border-radius: 0 0 8px 8px;
        }
        .file-menu.open .file-menu-dropdown {
          display: block;
        }
        .file-menu-item {
          display: block;
          width: 100%;
          background: none;
          border: none;
          color: #FFD600;
          text-align: left;
          padding: 8px 18px;
          font-size: 15px;
          cursor: pointer;
        }
        .file-menu-item:hover, .file-menu-item:focus {
          background: #444;
        }
        .file-menu label.file-menu-item { cursor: pointer; }
        .status-msg { margin: 10px 0; color: #4CAF50; }
        .bulk-edit-row { background: #333; color: #FFD600; }
        .type-selector { margin: 10px 0; }
      </style>
      <div>
        <nav class="file-menu">
          <button class="file-menu-btn">File &#9662;</button>
          <div class="file-menu-dropdown">
            <label class="file-menu-item">
              <span>Load...</span>
              <input type="file" id="mapping-file-input" accept="application/json" style="display:none;" />
            </label>
            <button class="file-menu-item load-mapping">Reload Active Mapping</button>
            <button class="file-menu-item save-mapping">Save</button>
            <button class="file-menu-item saveas-mapping">Save As...</button>
          </div>
        </nav>
        <label class="type-selector">
          Control Type:
          <select id="control-type-select">
            <option value="fader">Fader</option>
            <option value="knob">Knob</option>
            <option value="mute">Mute</option>
            <option value="solo">Solo</option>
            <option value="rec">Rec</option>
            <option value="select">Select</option>
          </select>
        </label>
        <span class="status-msg"></span>
        <div class="table-container"></div>
      </div>
    `;
    this.tableContainer = this.shadowRoot.querySelector('.table-container');
    this.statusMsg = this.shadowRoot.querySelector('.status-msg');
    this.controlTypeSelect = this.shadowRoot.getElementById('control-type-select');
    this.controlTypeSelect.onchange = () => this.renderTable();
    // File menu logic
    const fileMenu = this.shadowRoot.querySelector('.file-menu');
    const fileMenuBtn = this.shadowRoot.querySelector('.file-menu-btn');
    fileMenuBtn.onclick = (e) => {
      e.stopPropagation();
      fileMenu.classList.toggle('open');
    };
    document.addEventListener('click', () => fileMenu.classList.remove('open'));
    // File menu actions
    this.shadowRoot.querySelector('.save-mapping').onclick = () => { fileMenu.classList.remove('open'); this.saveMapping(); };
    this.shadowRoot.querySelector('.saveas-mapping').onclick = () => { fileMenu.classList.remove('open'); this.saveAsMapping(); };
    this.shadowRoot.querySelector('.load-mapping').onclick = () => { fileMenu.classList.remove('open'); this.loadMapping(); };
    this.shadowRoot.getElementById('mapping-file-input').addEventListener('change', (e) => {
      fileMenu.classList.remove('open');
      this.loadMappingFile(e);
    });

  }

  connectedCallback() {
    this.loadMapping();
  }

  async loadMappingFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        this.mappings = json;
        this.statusMsg.textContent = 'Mapping loaded from file.';
        this.renderTable();
        // Send mapping to backend
        await this.sendMappingToBackend(json);
      } catch (err) {
        this.statusMsg.textContent = 'Invalid JSON file.';
      }
    };
    reader.readAsText(file);
  }

  async sendMappingToBackend(mappingObj) {
    try {
      await fetch('/api/active-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingObj)
      });
      this.statusMsg.textContent = 'Mapping sent to backend.';
    } catch (e) {
      this.statusMsg.textContent = 'Failed to send mapping to backend.';
    }
  }

  async loadMapping() {
    try {
      const res = await fetch('static/active_mapping.json');
      this.mappings = await res.json();
      this.renderTable();
    } catch (e) {
      this.statusMsg.textContent = 'Failed to load mapping.';
    }
  }

  renderTable() {
    // Filter by selected control type
    const type = this.controlTypeSelect.value;
    const filtered = Object.fromEntries(Object.entries(this.mappings).filter(([key]) => key.startsWith(type + '_')));
    // Bulk edit row
    this.tableContainer.innerHTML = `
      <table class="mapping-table">
        <thead>
          <tr class="bulk-edit-row">
            <th colspan="5">Bulk Edit:</th>
            <th><input type="text" id="bulk-osc-address" placeholder="OSC Address (use *)" /></th>
            <th><input type="number" id="bulk-osc-min" placeholder="OSC Min" /></th>
            <th><input type="number" id="bulk-osc-max" placeholder="OSC Max" /></th>
            <th><button id="apply-bulk">Apply to All</button></th>
          </tr>
        </thead>
      </table>
      ` + mappingTableTemplate(filtered);
    // Bulk apply logic
    this.tableContainer.querySelector('#apply-bulk').onclick = () => {
      const oscPattern = this.tableContainer.querySelector('#bulk-osc-address').value;
      const minVal = this.tableContainer.querySelector('#bulk-osc-min').value;
      const maxVal = this.tableContainer.querySelector('#bulk-osc-max').value;
      Object.entries(filtered).forEach(([key, entry]) => {
        // Bulk OSC address with wildcard
        if (oscPattern && oscPattern.includes('*')) {
          // Extract number from key (e.g., fader_1 -> 1)
          const match = key.match(/_(\d+)$/);
          const num = match ? match[1] : '';
          this.mappings[key].osc = oscPattern.replace('*', num);
        } else if (oscPattern && !oscPattern.includes('*')) {
          this.mappings[key].osc = oscPattern;
        }
        if (minVal !== '') this.mappings[key].osc_min = Number(minVal);
        if (maxVal !== '') this.mappings[key].osc_max = Number(maxVal);
      });
      this.renderTable();
    };
    this.tableContainer.querySelectorAll('input').forEach(input => {
      if (input.disabled) return; // Do not attach change handler to disabled fields
      input.onchange = (e) => {
        const tr = e.target.closest('tr');
        const key = tr.dataset.key;
        if (!this.mappings[key]) return;
        this.mappings[key][input.name] = input.type === 'number' && input.value !== '' ? Number(input.value) : input.value;
      };
    });
  }

  addRow() {
    // Generate a unique key
    let idx = 1;
    let newKey = `new_mapping_${idx}`;
    while (this.mappings[newKey]) {
      idx++;
      newKey = `new_mapping_${idx}`;
    }
    this.mappings[newKey] = { osc: '', midi_cc: '', midi_note: '', midi_min: 0, midi_max: 127, osc_min: 0, osc_max: 1 };
    this.renderTable();
  }

  async saveMapping() {
    // Save directly to backend and apply immediately
    try {
      await this.sendMappingToBackend(this.mappings);
      this.statusMsg.textContent = 'Mapping saved and applied!';
    } catch (e) {
      this.statusMsg.textContent = 'Failed to save mapping.';
    }
  }

  saveAsMapping() {
    // Download as file (Save As)
    const blob = new Blob([JSON.stringify(this.mappings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'active_mapping.json';
    a.click();
    URL.revokeObjectURL(url);
    this.statusMsg.textContent = 'Mapping downloaded as file.';
  }
}

customElements.define('mapping-editor', MappingEditor);
