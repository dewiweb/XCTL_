import './channel-component.js';
import OSCManager from '../../../components/shared/osc-manager.js';

class XTouchGUI {
  constructor() {
    this.osc = new OSCManager();
    this.channels = [];
    
    // Initialize after connecting
    this.osc.connect().then(connected => {
      if (connected) this.initUI();
    });
  }

  initUI() {
    // UI initialization code
    // Initialize OSC manager
    const osc = new OSCManager();

    document.addEventListener('DOMContentLoaded', () => {
      const osc = new OSCManager();
      
      // Handle channel component events
      document.querySelectorAll('x-channel').forEach(channel => {
        channel.addEventListener('rotary-push', (e) => {
          osc.sendOSC(`/rotary/${e.detail.channel}/push`, 1);
        });
        
        channel.addEventListener('button-change', (e) => {
          osc.sendOSC(`/button/${e.detail.channel}/${e.detail.type}`, e.detail.state ? 1 : 0);
        });
        
        channel.addEventListener('scribble-change', (e) => {
          osc.sendOSC(`/scribble/${e.detail.channel}`, e.detail.text);
        });
        
        channel.addEventListener('fader-change', (e) => {
          osc.sendOSC(`/fader/${e.detail.channel}`, e.detail.value);
        });
      });
      
      // Connection status
      osc.on('connection', (isConnected) => {
        document.getElementById('connection-status').textContent = 
          isConnected ? 'Connected' : 'Disconnected';
        document.getElementById('connection-status').style.color = 
          isConnected ? '#4CAF50' : '#F44336';
      });

      // Initialize all controls
      document.addEventListener('DOMContentLoaded', () => {
        const osc = new OSCManager();
        
        // Initialize faders
        document.querySelectorAll('.fader').forEach(fader => {
          fader.value = 64; // Midpoint
          fader.addEventListener('input', (e) => {
            const channel = e.target.closest('.channel').id.split('-')[1];
            osc.sendOSC(`/fader/${channel}`, parseInt(e.target.value));
          });
        });
        
        // Initialize buttons
        document.querySelectorAll('.buttons button').forEach(button => {
          button.addEventListener('click', (e) => {
            const channel = e.target.closest('.channel').id.split('-')[1];
            const type = e.target.className;
            const state = e.target.classList.toggle('active') ? 1 : 0;
            osc.sendOSC(`/button/${channel}/${type}`, state);
          });
        });
        
        // Initialize scribble strips
        document.querySelectorAll('.scribble-strip').forEach(strip => {
          strip.addEventListener('input', (e) => {
            const channel = e.target.closest('.channel').id.split('-')[1];
            osc.sendOSC(`/scribble/${channel}`, e.target.textContent);
          });
        });

        // VU meter functionality
        function updateVU(channel, level) {
          const vu = document.querySelector(`#channel-${channel} .vu-meter::after`);
          if (vu) vu.style.height = `${100 - (level * 100)}%`;
        }

        // WebSocket test implementation
        document.addEventListener('DOMContentLoaded', () => {
          const statusDiv = document.getElementById('status');
          const testBtn = document.getElementById('test-btn');
          
          // Connection management
          const connectBtn = document.getElementById('connect-btn');
          const oscInputPort = document.getElementById('osc-input-port');
          const oscOutputIP = document.getElementById('osc-output-ip');
          const oscOutputPort = document.getElementById('osc-output-port');
          const connectionStatus = document.getElementById('connection-status');
          
          let socket = null;

          // Enhanced connection management
          connectBtn.addEventListener('click', () => {
            const oscInputPortValue = parseInt(document.getElementById('osc-input-port').value);
            const oscOutputIPValue = document.getElementById('osc-output-ip').value;
            const oscOutputPortValue = parseInt(document.getElementById('osc-output-port').value);
  
            if (socket) socket.close();
  
            // Always connect to fixed WebSocket port
            socket = new WebSocket('ws://127.0.0.1:8765');
  
            socket.onopen = () => {
              connectionStatus.textContent = 
                `Connected (OSC Out: ${oscOutputIPValue}:${oscOutputPortValue})`;
              connectionStatus.style.color = 'green';
            };
  
            socket.onerror = (error) => {
              connectionStatus.textContent = `Connection Error: ${error.message}`;
              connectionStatus.style.color = 'red';
            };
  
            socket.onclose = () => {
              connectionStatus.textContent = 'Disconnected';
              connectionStatus.style.color = 'gray';
            };
          });

          testBtn.addEventListener('click', () => {
              if (socket && socket.readyState === WebSocket.OPEN) {
                  socket.send('Test message from GUI');
              } else {
                  statusDiv.textContent = 'Not connected to server';
                  statusDiv.style.color = 'red';
              }
          });

          function sendOSCMessage(address, value) {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                address,
                value,
                target: `${document.getElementById('osc-output-ip').value}:${document.getElementById('osc-output-port').value}`
              }));
            }
          }
        });
      });
    });
  }
}

new XTouchGUI();
