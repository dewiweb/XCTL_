# config.py
import yaml
import os

def load_config(path="config.yaml"):
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Config file not found at: {path}")
    with open(path, "r") as f:
        return yaml.safe_load(f)
