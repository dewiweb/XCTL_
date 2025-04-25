from fastapi import APIRouter, HTTPException, Body
import os
import json
from backend.utils.user_data import get_user_data_dir

preset_router = APIRouter()

PRESETS_DIR = get_user_data_dir()
os.makedirs(PRESETS_DIR, exist_ok=True)

@preset_router.get("/api/presets")
def list_presets():
    # List all folders in PRESETS_DIR
    return [f for f in os.listdir(PRESETS_DIR) if os.path.isdir(os.path.join(PRESETS_DIR, f))]

@preset_router.get("/api/presets/{name}")
def get_preset(name: str):
    preset_dir = os.path.join(PRESETS_DIR, name)
    index_path = os.path.join(preset_dir, "layer_index.json")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Preset not found")
    with open(index_path, "r", encoding="utf-8") as f:
        layer_names = json.load(f)
    layers = []
    for i, lname in enumerate(layer_names):
        layer_path = os.path.join(preset_dir, f"layer_{i+1}.json")
        if not os.path.exists(layer_path):
            raise HTTPException(status_code=500, detail=f"Missing layer file: layer_{i+1}.json")
        with open(layer_path, "r", encoding="utf-8") as lf:
            layer_data = json.load(lf)
            layers.append(layer_data)
    return {"layers": layers}

@preset_router.post("/api/presets/{name}")
def save_preset(name: str, preset: dict = Body(...)):
    preset_dir = os.path.join(PRESETS_DIR, name)
    os.makedirs(preset_dir, exist_ok=True)
    layers = preset.get("layers", [])
    # Save index
    index_path = os.path.join(preset_dir, "layer_index.json")
    layer_names = [layer.get("name", f"Layer {i+1}") for i, layer in enumerate(layers)]
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(layer_names, f, indent=2)
    # Save each layer
    for i, layer in enumerate(layers):
        layer_path = os.path.join(preset_dir, f"layer_{i+1}.json")
        with open(layer_path, "w", encoding="utf-8") as lf:
            json.dump(layer, lf, indent=2)
    return {"status": "saved"}

@preset_router.delete("/api/presets/{name}")
def delete_preset(name: str):
    import shutil
    preset_dir = os.path.join(PRESETS_DIR, name)
    if os.path.exists(preset_dir) and os.path.isdir(preset_dir):
        shutil.rmtree(preset_dir)
        return {"status": "deleted"}
    else:
        raise HTTPException(status_code=404, detail="Preset not found")
