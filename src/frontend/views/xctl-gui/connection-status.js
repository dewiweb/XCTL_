// connection-status.js
// Custom element for centralized connection status display

class ConnectionStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.status = 'disconnected';
    this.message = 'Disconnected';
    this.render();
  }

  setStatus(status, message = null) {
    this.status = status;
    if (message) this.message = message;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .status {
          padding: 6px 18px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 1.1em;
          letter-spacing: 0.04em;
          background: var(--status-bg, #444);
          color: var(--status-color, #fff);
          margin: 8px 0;
          display: inline-block;
        }
        .connected { --status-bg: #4CAF50; --status-color: #fff; }
        .disconnected { --status-bg: #F44336; --status-color: #fff; }
        .error { --status-bg: #d32f2f; --status-color: #fff; }
      </style>
      <span class="status ${this.status}">${this.message}</span>
    `;
  }
}

customElements.define('connection-status', ConnectionStatus);

export default ConnectionStatus;
