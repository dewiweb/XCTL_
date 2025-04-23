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
app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="static")

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.get("/index.html")
async def index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
