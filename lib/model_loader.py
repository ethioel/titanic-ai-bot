from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer, CounterfactualAnalyzer
from backend.models.schemas import PassengerInput

logger = logging.getLogger("model_loader")


class ModelLoaderError(Exception):
    """Base exception for model loading/prediction errors."""
    pass


class ModelNotLoadedError(ModelLoaderError):
    """Raised when prediction is attempted before successful load."""
    pass


class ModelLoader:
    """
    Lazy-loading model orchestrator for API routes.
    NOT a singleton — module-level instance caching is handled at bottom.
    Thread-safe for read-only inference (models are read-only after load).
    """

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path or os.getenv("MODEL_PATH", "./data/models/titanic_ensemble.pkl")
        self._model: Optional[TitanicEnsemble] = None
        self._shap: Optional[SHAPExplainer] = None
        self._counterfactual: Optional[CounterfactualAnalyzer] = None
        self._loaded = False

    # ------------------------------------------------------------------ #
    # Loading
    # ------------------------------------------------------------------ #
    def load(self, force: bool = False) -> None:
        """
        Load ensemble, SHAP explainer, and counterfactual analyzer.
        Idempotent — safe to call multiple times.
        """
        if self._loaded and not force:
            return

        logger.info("Loading models from %s", self.model_path)
        path = Path(self.model_path)

        if not path.exists():
            raise ModelLoaderError(f"Model artifact not found: {path}")

        try:
            # 1. Ensemble (includes preprocessing pipeline)
            self._model = TitanicEnsemble()
            self._model.load_model(path)

            # 2. SHAP — check if pre-fitted in artifact, else lazy-fit later
            try:
                self._shap = SHAPExplainer(str(path))
                logger.info("SHAP explainer ready (pre-fitted: %s)", self._shap.explainer is not None)
            except Exception as exc:
                logger.warning("SHAP explainer init failed: %s", exc)
                self._shap = None

            # 3. Counterfactuals
            self._counterfactual = CounterfactualAnalyzer(str(path))

            self._loaded = True
            logger.info("✅ Model loader ready — features: %d", len(self._model.feature_names))

        except Exception as exc:
            self._loaded = False
            logger.exception("❌ Model load failed")
            raise ModelLoaderError(f"Failed to load model: {exc}") from exc

    def is_ready(self) -> bool:
        """Check if all components are loaded."""
        return self._loaded and self._model is not None

    # ------------------------------------------------------------------ #
    # Validation
    # ------------------------------------------------------------------ #
    @staticmethod
    def validate_passenger(data: Dict[str, Any]) -> PassengerInput:
        """
        Validate and normalize raw passenger dict.
        Raises pydantic.ValidationError on bad input.
        """
        return PassengerInput.model_validate(data)

    # ------------------------------------------------------------------ #
    # Prediction
    # ------------------------------------------------------------------ #
    def predict(self, passenger_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Single passenger prediction with validation.
        """
        if not self._loaded:
            self.load()

        validated = self.validate_passenger(passenger_data)
        return self._model.predict(validated.to_model_dict())

    def predict_batch(self, passengers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Batch prediction — much faster for multiple passengers.
        """
        if not self._loaded:
            self.load()

        validated = [self.validate_passenger(p).to_model_dict() for p in passengers]
        return self._model.predict_batch(validated)

    # ------------------------------------------------------------------ #
    # SHAP Explanations
    # ------------------------------------------------------------------ #
    def explain(self, passenger_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        SHAP explanation for a single passenger.
        If explainer wasn't pre-fitted, attempts lazy fit with a default background.
        """
        if not self._loaded:
            self.load()

        if self._shap is None:
            raise ModelLoaderError("SHAP explainer not available")

        # If not pre-fitted, we need background data — this is a limitation
        # In production, always pre-fit during training (train.py does this)
        if self._shap.explainer is None:
            raise ModelLoaderError(
                "SHAP explainer not fitted. Run training with --shap-samples or "
                "call fit_explainer() with background data first."
            )

        validated = self.validate_passenger(passenger_data)
        df_dict = validated.to_model_dict()

        # Preprocess to get feature vector
        import pandas as pd
        df = pd.DataFrame([df_dict])
        X = self._model.preprocess(df, is_train=False)

        return self._shap.explain_prediction(X.values)

    # ------------------------------------------------------------------ #
    # Counterfactuals
    # ------------------------------------------------------------------ #
    def counterfactuals(
        self,
        passenger_data: Dict[str, Any],
        num_alternatives: int = 3,
    ) -> Dict[str, Any]:
        """
        Generate actionable counterfactual scenarios.
        """
        if not self._loaded:
            self.load()

        if self._counterfactual is None:
            raise ModelLoaderError("Counterfactual analyzer not available")

        validated = self.validate_passenger(passenger_data)
        return self._counterfactual.generate_counterfactuals(
            validated.to_model_dict(),
            num_alternatives=num_alternatives,
        )

    # ------------------------------------------------------------------ #
    # Twin Matching (delegates to Python backend)
    # ------------------------------------------------------------------ #
    def find_twin(self, passenger_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find historical twin. Requires backend.models.historical_twin.
        """
        from backend.models.historical_twin import HistoricalTwinMatcher

        validated = self.validate_passenger(passenger_data)
        matcher = HistoricalTwinMatcher()
        return matcher.find_twin(validated.to_model_dict())

    # ------------------------------------------------------------------ #
    # Health / Metadata
    # ------------------------------------------------------------------ #
    def health(self) -> Dict[str, Any]:
        """Health check for monitoring."""
        return {
            "loaded": self._loaded,
            "model_path": str(self.model_path),
            "model_ready": self._model is not None,
            "shap_ready": self._shap is not None and self._shap.explainer is not None,
            "counterfactual_ready": self._counterfactual is not None,
            "features": self._model.feature_names if self._model else None,
        }

    def get_model_info(self) -> Dict[str, Any]:
        """Get model metadata."""
        if not self._loaded:
            self.load()
        return self._model.get_model_info()


# ================================================================== #
# Module-level cached instance (replaces singleton pattern)
# ================================================================== #
_loader: Optional[ModelLoader] = None


def get_loader() -> ModelLoader:
    """Get or create the cached ModelLoader instance."""
    global _loader
    if _loader is None:
        _loader = ModelLoader()
    return _loader


# ================================================================== #
# Convenience exports (used by Next.js API routes via child_process)
# ================================================================== #
def predict(passenger_data: Dict[str, Any]) -> Dict[str, Any]:
    return get_loader().predict(passenger_data)


def predict_batch(passengers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return get_loader().predict_batch(passengers)


def explain(passenger_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return get_loader().explain(passenger_data)


def counterfactuals(passenger_data: Dict[str, Any], num_alternatives: int = 3) -> Dict[str, Any]:
    return get_loader().counterfactuals(passenger_data, num_alternatives)


def find_twin(passenger_data: Dict[str, Any]) -> Dict[str, Any]:
    return get_loader().find_twin(passenger_data)


def health() -> Dict[str, Any]:
    return get_loader().health()


def model_info() -> Dict[str, Any]:
    return get_loader().get_model_info()
