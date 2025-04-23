# ws_server.py
"""
WebSocket endpoint logic for XCTL_ backend, separated from FastAPI app.
"""
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import json
from backend.osc.osc_server import XctlOSC
from backend.mapping.default_mapping import get_osc_mapping
from backend.utils.config import load_config
import os

# Load config and instantiate modular XctlOSC (shared instance for OSC communication)
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config.yaml')
config = load_config(CONFIG_PATH)
osc = XctlOSC(config_path=CONFIG_PATH)

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Example: handle OSC send request from frontend
                if msg.get('type') == 'osc_send':
                    address = msg.get('address')
                    args = msg.get('args', [])
                    osc.send_message(address, *args)
                    await websocket.send_text(json.dumps({'type': 'osc_ack', 'address': address}))
                elif msg.get('type') == 'ui_event':
                    # Example payload: {"type": "ui_event", "event_type": "fader", "channel": 1, "value": 64}
                    event_type = msg.get('event_type')
                    channel = msg.get('channel')
                    value = msg.get('value')
                    state = msg.get('state')
                    address, arg_keys = get_osc_mapping(event_type, channel)
                    if address and arg_keys:
                        # Build args in the order specified by arg_keys
                        args = []
                        for key in arg_keys:
                            if key == 'value':
                                args.append(value)
                            elif key == 'state':
                                args.append(state)
                            else:
                                args.append(msg.get(key))
                        osc.send_message(address, *args)
                        await websocket.send_text(json.dumps({'type': 'osc_ack', 'address': address, 'args': args}))
                    else:
                        await websocket.send_text(json.dumps({'type': 'error', 'message': f'Unknown mapping for event_type={event_type}, channel={channel}'}))
                else:
                    await websocket.send_text(json.dumps({'type': 'error', 'message': 'Unknown message type'}))
            except Exception as e:
                await websocket.send_text(json.dumps({'type': 'error', 'message': str(e)}))
    except WebSocketDisconnect:
        print("WebSocket disconnected")

# Register router for websocket endpoint
router = APIRouter()
router.add_api_websocket_route("/ws", websocket_endpoint)
