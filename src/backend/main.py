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
from typing import Set
import asyncio
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

# --- WebSocket Client Management ---
connected_websockets_lock = threading.Lock()
connected_websockets: Set[WebSocket] = set()

async def broadcast_ws(message: dict):
    with connected_websockets_lock:
        ws_list = list(connected_websockets)
    print(f"[DEBUG] Broadcasting to {len(ws_list)} websockets: {message}")
    if not ws_list:
        print("[DEBUG] No connected websockets to broadcast to.")
        return
    data = json.dumps(message)
    to_remove = set()
    for ws in ws_list:
        try:
            await ws.send_text(data)
        except Exception as e:
            print(f"[DEBUG] Failed to send to websocket: {e}")
            to_remove.add(ws)
    if to_remove:
        with connected_websockets_lock:
            for ws in to_remove:
                connected_websockets.discard(ws)


def main():
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.yaml')
    config = load_config(CONFIG_PATH)

    # Setup logging early
    logging.basicConfig(level=getattr(logging, config.get('logging', {}).get('level', 'INFO').upper(), logging.INFO))
    logger = logging.getLogger('Main')

    # Print available MIDI ports (for user info)
    import mido
    print("Available MIDI input ports:", mido.get_input_names())
    print("Available MIDI output ports:", mido.get_output_names())

    # Handlers will be initialized on first WebSocket connection
    global midi, osc, handlers_initialized
    midi = None
    osc = None
    handlers_initialized = False

    # Setup single FastAPI app
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend/views/xctl-gui'))
    from backend.api.api_server import app as api_app
    app = api_app  # Use the API app (with all endpoints) as the main app
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
        with connected_websockets_lock:
            connected_websockets.add(websocket)
        print(f"[DEBUG] WebSocket client connected: {websocket}")

        # Initialize MIDI/OSC handlers on first connection, using the running event loop
        global midi, osc, handlers_initialized
        if not handlers_initialized:
            loop = asyncio.get_running_loop()
            CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.yaml')
            config = load_config(CONFIG_PATH)
            try:
                midi_cfg = config['midi']
                midi = MidiHandler(
                    midi_cfg.get('input_port'),
                    midi_cfg.get('output_port'),
                    event_loop=loop,
                    broadcast_ws=broadcast_ws
                )
                midi.open()
                # --- Start mapping watcher ---
                from backend.mapping.mapping_watcher import MappingWatcher
                mapping_path = midi.mapping_path
                global mapping_watcher
                def on_mapping_change():
                    print('[MappingWatcher] Detected mapping change, reloading...')
                    midi.reload_mapping()
                mapping_watcher = MappingWatcher(mapping_path, on_mapping_change, poll_interval=1.0)
                mapping_watcher.start()
            except Exception as e:
                print(f"[ERROR] MIDI initialization failed: {e}")
            try:
                osc = XctlOSC(config_path=CONFIG_PATH, event_loop=loop, broadcast_ws=broadcast_ws, midi_handler=midi)
                osc.start_osc_server()
                print("[DEBUG] OSC server started.")
                # Ensure MIDI handler can send OSC
                midi.osc = osc
            except Exception as e:
                print(f"[ERROR] OSC initialization failed: {e}")
            handlers_initialized = True

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
                    elif msg.get('type') == 'update_settings':
                        osc.update_settings(msg.get('settings', {}))
                        await websocket.send_text(json.dumps({'type': 'settings_updated', 'settings': msg.get('settings', {})}))
                    else:
                        await websocket.send_text(json.dumps({'type': 'error', 'message': 'Unknown message type'}))
                except Exception as e:
                    await websocket.send_text(json.dumps({'type': 'error', 'message': str(e)}))
        except Exception:
            print("WebSocket disconnected")
        finally:
            with connected_websockets_lock:
                connected_websockets.discard(websocket)


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
        # Stop mapping watcher if running
        try:
            if 'mapping_watcher' in globals() and mapping_watcher:
                mapping_watcher.stop()
        except Exception as e:
            logger.error(f"Error stopping mapping watcher: {e}")
        # Uvicorn servers will exit with main thread

if __name__ == '__main__':
    main()
