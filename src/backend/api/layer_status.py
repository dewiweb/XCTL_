from fastapi import APIRouter

layer_status_router = APIRouter()
_midi_handler = None

def set_midi_handler_for_status(handler):
    global _midi_handler
    _midi_handler = handler

@layer_status_router.get("/api/layer-status")
async def layer_status():
    if _midi_handler is None:
        return {"error": "MidiHandler not initialized"}
    return _midi_handler.get_layer_status()

