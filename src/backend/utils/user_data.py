import os
import platform

def get_user_data_dir():
    if platform.system() == "Windows":
        return os.path.join(os.environ["APPDATA"], "XCTL_OSC", "presets")
    elif platform.system() == "Darwin":
        return os.path.join(os.path.expanduser("~/Library/Application Support/"), "XCTL_OSC", "presets")
    else:
        return os.path.join(os.path.expanduser("~/.config/"), "XCTL_OSC", "presets")
