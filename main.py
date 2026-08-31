"""Root-level entrypoint so PaaS auto-detectors (Railway/Railpack, etc.) that only
look in default locations (main.py, app.py) can find the FastAPI app. The actual
app lives in backend/main.py.
"""

from backend.main import app

__all__ = ["app"]
