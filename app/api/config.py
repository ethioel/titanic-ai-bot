"""configuration for Vercel serverless."""
import os
import logging
from pathlib import Path
from typing import Optional

# Vercel exposes env vars automatically
class Settings:
    MODEL_PATH: Path = Path(os.getenv("MODEL_PATH", "./data/models/titanic_ensemble.pkl"))
    MANIFEST_PATH: Path = Path(os.getenv("MANIFEST_PATH", "./data/passenger_manifest.csv"))
    SHAP_BACKGROUND_SIZE: int = int(os.getenv("SHAP_BACKGROUND_SIZE", "100"))
    ENABLE_SIMULATION: bool = os.getenv("ENABLE_SIMULATION", "true").lower() == "true"
    ENABLE_SHAP: bool = os.getenv("ENABLE_SHAP", "true").lower() == "true"
    ENABLE_TWIN: bool = os.getenv("ENABLE_TWIN_MATCHING", "true").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()

# Configure logging once at module level
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("titanic_api")
