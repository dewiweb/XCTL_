class OSCManager {
  constructor() {
    console.log('Initializing OSC Manager');
    this.socket = null;
    this.settings = {
      oscOutputIp: '127.0.0.1',
      oscOutputPort: 9000,
      oscInputPort: 8000
    };
    this.eventListeners = {};
    
    // Restore settings from sessionStorage
    const savedSettings = sessionStorage.getItem('oscSettings');
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
    }
  }

  async connect() {
    console.log('Attempting OSC connection to', this.settings.oscOutputIp, 'on port', this.settings.oscOutputPort);
    return new Promise((resolve) => {
      const socket = new WebSocket('ws://localhost:8765');

      socket.addEventListener('open', (event) => {
        console.log('WebSocket connected:', event);
        this.socket = socket;
        this.emit('connection', true);
        resolve(true);
      });
      
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('connection', false);
        resolve(false);
      });
      
      socket.addEventListener('message', (event) => {
        this.emit('message', JSON.parse(event.data));
      });
    });
  }

  sendOSC(address, value) {
    if (this.isConnected()) {
      try {
        this.socket.send(JSON.stringify({
          address,
          value,
          ip: this.settings.oscOutputIp,
          port: this.settings.oscOutputPort
        }));
        return true;
      } catch (error) {
        console.error('OSC send error:', error);
      }
    }
    return false;
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    sessionStorage.setItem('oscSettings', JSON.stringify(this.settings));
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

export default OSCManager;
