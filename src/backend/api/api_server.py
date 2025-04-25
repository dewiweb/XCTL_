# api_server.py
"""
FastAPI app for serving frontend and API endpoints.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Serve static files (frontend)
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/views/xctl-gui'))

app = FastAPI()

# --- Preset API ---
from backend.api.preset_api import preset_router
app.include_router(preset_router)

from backend.utils.config import load_config

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../config.yaml'))
# Load config
config = load_config(CONFIG_PATH)

# Create the global MidiHandler instance for the API
from backend.midi.midi_handler import MidiHandler
midi_handler = MidiHandler(
    input_port_name=config['midi']['input_port'],
    output_port_name=config['midi']['output_port']
)

# Import and include the layer status API
from backend.api.layer_status import layer_status_router, set_midi_handler_for_status
set_midi_handler_for_status(midi_handler)
app.include_router(layer_status_router)

from fastapi.responses import FileResponse
from fastapi import Request, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import yaml
import mido
from backend.utils.config import load_config
from backend.midi.midi_handler import MidiHandler

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../config.yaml'))

# Load config
config = load_config(CONFIG_PATH)

# Allow CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/midi-ports")
async def midi_ports():
    """Return available MIDI input/output ports."""
    return {
        "inputs": mido.get_input_names(),
        "outputs": mido.get_output_names()
    }

@app.post("/api/active-mapping")
async def set_active_mapping(mapping: dict = Body(...), path: str = None):
    """
    Accept a mapping JSON from the frontend and save it as the active mapping.
    Optionally specify a custom path for the mapping file.
    """
    import json
    if path:
        mapping_path = os.path.abspath(path)
    else:
        mapping_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../mapping/active_mapping.json'))
    try:
        with open(mapping_path, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, indent=2)
        return {"status": "ok", "message": f"Mapping updated at {mapping_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/load-mapping")
async def load_mapping(data: dict = Body(...)):
    """
    Load a mapping from a user-specified path and filename, and set it as the active mapping.
    """
    import json
    src_path = data.get('path')
    if not src_path:
        return {"status": "error", "message": "No path provided"}
    src_path = os.path.abspath(src_path)
    try:
        with open(src_path, 'r', encoding='utf-8') as f:
            mapping = json.load(f)
        # Save as active mapping
        active_mapping_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../mapping/active_mapping.json'))
        with open(active_mapping_path, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, indent=2)
        return {"status": "ok", "message": f"Loaded mapping from {src_path} and set as active mapping."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/midi-settings")
async def midi_settings():
    """Return the currently selected MIDI input/output ports."""
    midi_cfg = config.get('midi', {})
    return {
        "input": midi_cfg.get('input_port', ''),
        "output": midi_cfg.get('output_port', '')
    }

@app.post("/api/midi-settings")
async def set_midi_settings(data: dict = Body(...)):
    """Set and persist the selected MIDI input/output ports."""
    input_port = data.get('input')
    output_port = data.get('output')
    config_yaml = yaml.safe_load(open(CONFIG_PATH, 'r'))
    config_yaml.setdefault('midi', {})
    config_yaml['midi']['input_port'] = input_port
    config_yaml['midi']['output_port'] = output_port
    with open(CONFIG_PATH, 'w') as f:
        yaml.safe_dump(config_yaml, f)
    # Optionally, re-initialize MIDI handler here if needed
    return {"status": "ok", "input": input_port, "output": output_port}

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.get("/index.html")
async def index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
