# main.py
"""
Entry point for XCTL_ backend: initializes MIDI, OSC, and WebSocket servers.

Note:
- FastAPI app (serving frontend/API) is in api/api_server.py
- WebSocket endpoint logic is in websocket/ws_server.py
- Modular OSC and MIDI logic are in osc/ and midi/ submodules
"""
import os
import logging
from backend.utils.config import load_config
from backend.midi.midi_handler import MidiHandler
from backend.osc.osc_server import XctlOSC
# from backend.websocket.ws_server import WebSocketServer  # Placeholder for future

import threading
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os
from backend.utils.config import load_config
from backend.midi.midi_handler import MidiHandler
from backend.osc.osc_server import XctlOSC


import socket

def find_free_port(start_port):
    port = start_port
    while port < 65535:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))
                return port
            except OSError:
                port += 1
    raise RuntimeError("No free port found in range.")

def run_fastapi(port):
    logging.info(f"Starting FastAPI app on http://0.0.0.0:{port} ...")
    uvicorn.run(fastapi_app, host="0.0.0.0", port=port, log_level="info")

def run_websocket(port):
    from fastapi import FastAPI
    ws_app = FastAPI()
    ws_app.include_router(ws_router)
    logging.info(f"Starting WebSocket server on ws://0.0.0.0:{port}/ws ...")
    uvicorn.run(ws_app, host="0.0.0.0", port=port, log_level="info")

def main():
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.yaml')
    config = load_config(CONFIG_PATH)

    # Setup logging early
    logging.basicConfig(level=getattr(logging, config.get('logging', {}).get('level', 'INFO').upper(), logging.INFO))
    logger = logging.getLogger('Main')

    # MIDI
    import mido
    print("Available MIDI input ports:", mido.get_input_names())
    print("Available MIDI output ports:", mido.get_output_names())
    try:
        midi_cfg = config['midi']
        midi = MidiHandler(midi_cfg.get('input_port'), midi_cfg.get('output_port'))
        midi.open()
        logger.info("MIDI handler initialized.")
    except Exception as e:
        logger.error(f"MIDI initialization failed: {e}")
        print(f"[ERROR] MIDI initialization failed: {e}")

    # OSC
    osc = XctlOSC(config_path=CONFIG_PATH)
    osc.start_osc_server()
    logger.info("OSC server started.")

    # Setup single FastAPI app
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend/views/xctl-gui'))
    app = FastAPI()
    app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="static")

    @app.get("/")
    async def root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/index.html")
    async def index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/api/osc-defaults")
    async def osc_defaults():
        osc_cfg = config.get("osc", {})
        return {
            "oscOutputIp": osc_cfg.get("output_ip", "127.0.0.1"),
            "oscOutputPort": osc_cfg.get("output_port", 9000),
            "oscInputPort": osc_cfg.get("input_port", 8000)
        }

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    if msg.get('type') == 'osc_send':
                        address = msg.get('address')
                        args = msg.get('args', [])
                        osc.send_message(address, *args)
                        await websocket.send_text(json.dumps({'type': 'osc_ack', 'address': address}))
                    else:
                        await websocket.send_text(json.dumps({'type': 'error', 'message': 'Unknown message type'}))
                except Exception as e:
                    await websocket.send_text(json.dumps({'type': 'error', 'message': str(e)}))
        except Exception:
            print("WebSocket disconnected")

    # Validate and select port
    fastapi_port = config.get('fastapi', {}).get('port', 8000)
    try:
        fastapi_port = int(fastapi_port)
        free_fastapi_port = find_free_port(fastapi_port)
        if fastapi_port != free_fastapi_port:
            logger.warning(f"Port {fastapi_port} in use. Using free port {free_fastapi_port} instead.")
    except Exception as e:
        logger.error(f"Unable to find a free port for FastAPI: {e}")
        raise

    logging.info(f"Starting FastAPI app (with WebSocket) on http://0.0.0.0:{free_fastapi_port} ...")
    uvicorn.run(app, host="0.0.0.0", port=free_fastapi_port, log_level="info")

    try:
        while True:
            pass  # Main event loop placeholder
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        midi.close()
        osc.shutdown()
        # Uvicorn servers will exit with main thread

if __name__ == '__main__':
    main()
