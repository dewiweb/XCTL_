"""
Watches active_mapping.json for changes and triggers a callback to reload mapping in the backend.
"""
import os
import time
import threading
from typing import Callable

class MappingWatcher:
    def __init__(self, mapping_path: str, on_change: Callable[[], None], poll_interval: float = 1.0):
        self.mapping_path = mapping_path
        self.on_change = on_change
        self.poll_interval = poll_interval
        self._last_mtime = None
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._watch_loop, daemon=True)

    def start(self):
        self._last_mtime = os.path.getmtime(self.mapping_path) if os.path.exists(self.mapping_path) else None
        self._stop_event.clear()
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread.is_alive():
            self._thread.join()

    def _watch_loop(self):
        while not self._stop_event.is_set():
            try:
                if os.path.exists(self.mapping_path):
                    mtime = os.path.getmtime(self.mapping_path)
                    if self._last_mtime is None or mtime != self._last_mtime:
                        self._last_mtime = mtime
                        self.on_change()
            except Exception as e:
                print(f"[MappingWatcher] Error: {e}")
            time.sleep(self.poll_interval)
