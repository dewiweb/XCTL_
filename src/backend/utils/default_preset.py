import os
import json

def create_default_preset(presets_dir, preset_name="Default"):
    preset_dir = os.path.join(presets_dir, preset_name)
    os.makedirs(preset_dir, exist_ok=True)
    # 8 empty layers
    layers = [{"name": f"Layer {i+1}", "mappings": {}} for i in range(8)]
    # Save index
    index_path = os.path.join(preset_dir, "layer_index.json")
    layer_names = [layer["name"] for layer in layers]
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(layer_names, f, indent=2)
    # Save each layer
    for i, layer in enumerate(layers):
        layer_path = os.path.join(preset_dir, f"layer_{i+1}.json")
        with open(layer_path, "w", encoding="utf-8") as lf:
            json.dump(layer, lf, indent=2)
    return preset_dir
