"""
Root-level entry point for FastAPI backend.

This allows running the backend from the project root with:
    uvicorn main:app --reload

Or:
    python -m uvicorn main:app --reload
"""
from api.app.main import app

__all__ = ["app"]

