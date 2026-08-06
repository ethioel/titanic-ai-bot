from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
import shap

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP wrapper that leverages the saved TitanicEnsemble for preprocessing.
    No more raw/preprocessed mismatch errors.
    """

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path or "./data/models/titanic_ensemble.pkl"
        data = joblib.load(self.model_path)

        # Load full ensemble (new format) or fallback to raw model
        self.ensemble = data.get("ensemble")
        if self.ensemble:
            self.model = self.ensemble.model
            self.feature_names = self.ensemble.feature_names
            logger.info("Loaded ensemble with preprocessing pipeline")
        else:
            self.model = data["model"]
            self.feature_names = data["feature_names"]
            logger.info("Loaded legacy model artifact")

        self.explainer: Optional[Any] = None

    def fit_explainer(self, X_background: pd.DataFrame, n_samples: int = 100) -> None:
        """Fit SHAP explainer. X_background can be RAW data — we preprocess it."""
        if len(X_background) == 0:
            raise ValueError("Background data cannot be empty")

        # Preprocess using the ensemble's fitted pipeline
        if self.ensemble:
            X_bg = self.ensemble.preprocess(X_background, is_train=False)
        else:
            X_bg = X_background  # Legacy: assume already preprocessed

        X_bg = shap.sample(X_bg, min(n_samples, len(X_bg)))

        # Prefer TreeExplainer on RandomForest (fast & exact)
        rf_estimator = None
        if hasattr(self.model, "named_estimators_"):
            rf_estimator = self.model.named_estimators_.get("rf")

        if rf_estimator is not None:
            self.explainer = shap.TreeExplainer(rf_estimator)
            logger.info("Fitted TreeExplainer on RandomForest")
        else:
            self.explainer = shap.KernelExplainer(
                lambda x: self.model.predict_proba(x)[:, 1],
                X_bg,
            )
            logger.info("Fitted KernelExplainer")

    def explain_prediction(self, X_instance: np.ndarray) -> List[Dict[str, Any]]:
        """Get SHAP values for a single preprocessed instance."""
        if self.explainer is None:
            raise ValueError("Explainer not fitted. Call fit_explainer first.")

        shap_values = self.explainer.shap_values(X_instance)

        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        elif shap_values.ndim > 2:
            shap_values = shap_values[:, :, 1]

        explanation = []
        for i, feature in enumerate(self.feature_names):
            explanation.append({
                "feature": feature,
                "value": float(X_instance[0, i]),
                "shap_value": float(shap_values[0, i]),
                "impact": "positive" if shap_values[0, i] > 0 else "negative",
            })

        explanation.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return explanation
