import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .routes.chat import router as chat_router
from .routes.admin import router as admin_router

app = FastAPI(title="Avatar", description="Digital Twin Chat App")

# Include API routers
app.include_router(chat_router)
app.include_router(admin_router)

# ---------------------------------------------------------------------------
# Directory paths
# ---------------------------------------------------------------------------
_base = os.path.join(os.path.dirname(__file__), "..", "..")
_portfolio_dir = os.path.join(_base, "portfolio")
_frontend_dist = os.path.join(_base, "frontend", "dist")

# ---------------------------------------------------------------------------
# Frontend static assets (absolute /assets/ paths from Vite build)
# ---------------------------------------------------------------------------
if os.path.exists(_frontend_dist):
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="chat-assets")

# ---------------------------------------------------------------------------
# Portfolio assets (images used by portfolio)
# ---------------------------------------------------------------------------
if os.path.exists(_portfolio_dir):
    _portfolio_assets = os.path.join(_portfolio_dir, "assets")
    if os.path.exists(_portfolio_assets):
        app.mount("/portfolio-assets", StaticFiles(directory=_portfolio_assets), name="portfolio-assets")

# ---------------------------------------------------------------------------
# Named routes — must come BEFORE the catch-all
# ---------------------------------------------------------------------------

@app.get("/")
async def serve_portfolio():
    if os.path.exists(_portfolio_dir):
        return FileResponse(os.path.join(_portfolio_dir, "index.html"))
    return FileResponse(os.path.join(_frontend_dist, "index.html"))

@app.get("/styles.css")
async def serve_portfolio_css():
    return FileResponse(os.path.join(_portfolio_dir, "styles.css"))

@app.get("/main.js")
async def serve_portfolio_js():
    return FileResponse(os.path.join(_portfolio_dir, "main.js"))

@app.get("/chat")
async def serve_chat():
    return FileResponse(os.path.join(_frontend_dist, "index.html"))

@app.get("/admin")
async def serve_admin():
    admin_html = os.path.join(_frontend_dist, "admin.html")
    if os.path.exists(admin_html):
        return FileResponse(admin_html)
    return FileResponse(os.path.join(_frontend_dist, "index.html"))

# ---------------------------------------------------------------------------
# Catch-all
# ---------------------------------------------------------------------------
@app.get("/{path:path}")
async def serve_static(path: str):
    if path.startswith("api/") or path.startswith("admin/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")

    # Frontend dist files (avatars, etc.)
    if os.path.exists(_frontend_dist):
        fp = os.path.join(_frontend_dist, path)
        if os.path.isfile(fp):
            return FileResponse(fp)

    # Portfolio files
    if os.path.exists(_portfolio_dir):
        pp = os.path.join(_portfolio_dir, path)
        if os.path.isfile(pp):
            return FileResponse(pp)

    # Default to portfolio
    if os.path.exists(_portfolio_dir):
        return FileResponse(os.path.join(_portfolio_dir, "index.html"))
    return FileResponse(os.path.join(_frontend_dist, "index.html"))
