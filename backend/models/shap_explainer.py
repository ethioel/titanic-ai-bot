"""
SHAPExplainer + CounterfactualAnalyzer with build-time SHAP support.
Fits into: backend/models/shap_explainer.py
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
import shap

from .titanic_model import TitanicEnsemble

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP wrapper.
    If the model artifact contains a pre-fitted 'shap_explainer', uses it directly.
    Otherwise falls back to fitting at runtime (requires background data).
    """

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path or "./data/models/titanic_ensemble.pkl"
        self.model_data = joblib.load(self.model_path)
        self.model = self.model_data["model"]
        self.feature_names: List[str] = self.model_data["feature_names"]

        # Check for pre-fitted explainer (saved during training)
        self.explainer = self.model_data.get("shap_explainer")
        if self.explainer is not None:
            logger.info("Loaded pre-fitted SHAP explainer from model artifact")
        else:
            logger.warning("No pre-fitted SHAP explainer found. Call fit_explainer() before explain().")

    def fit_explainer(self, X_background: pd.DataFrame, n_samples: int = 100) -> None:
        """Fit and cache SHAP explainer. Call this during training, not at runtime."""
        if len(X_background) == 0:
            raise ValueError("Background data cannot be empty")

        background = shap.sample(X_background, min(n_samples, len(X_background)))

        rf_estimator = None
        if hasattr(self.model, "named_estimators_"):
            rf_estimator = self.model.named_estimators_.get("rf")

        if rf_estimator is not None:
            self.explainer = shap.TreeExplainer(rf_estimator)
            logger.info("Fitted TreeExplainer on RandomForest")
        else:
            self.explainer = shap.KernelExplainer(
                lambda x: self.model.predict_proba(x)[:, 1], background
            )
            logger.info("Fitted KernelExplainer")

    def explain_prediction(self, X_instance: np.ndarray) -> List[Dict[str, Any]]:
        if self.explainer is None:
            raise ValueError("Explainer not fitted. Call fit_explainer() or use a model with pre-fitted SHAP.")

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


class CounterfactualAnalyzer:
    ACTIONABLE_FEATURES: Dict[str, Dict[str, Any]] = {
        "Pclass": {
            "description": "Upgrade to 1st Class",
            "transform": lambda x: 1 if x > 1 else None,
            "format": lambda old, new: f"Class {old} → 1st Class",
        },
        "SibSp": {
            "description": "Travel with more siblings/spouse",
            "transform": lambda x: min(x + 2, 5),
            "format": lambda old, new: f"Siblings/spouse {old} → {new}",
        },
        "Parch": {
            "description": "Travel with more parents/children",
            "transform": lambda x: min(x + 1, 5),
            "format": lambda old, new: f"Parents/children {old} → {new}",
        },
    }

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path or "./data/models/titanic_ensemble.pkl"
        self._model: Optional[TitanicEnsemble] = None

    def _get_model(self) -> TitanicEnsemble:
        if self._model is None:
            self._model = TitanicEnsemble()
            self._model.load_model(self.model_path)
        return self._model

    def generate_counterfactuals(
        self,
        passenger_data: Dict[str, Any],
        num_alternatives: int = 3,
    ) -> Dict[str, Any]:
        model = self._get_model()
        current_result = model.predict(passenger_data)
        current_prob = current_result["probability"]

        counterfactuals: List[Dict[str, Any]] = []

        for feat_name, cfg in self.ACTIONABLE_FEATURES.items():
            current_val = passenger_data.get(feat_name)
            if current_val is None:
                continue

            new_val = cfg["transform"](current_val)
            if new_val is None or new_val == current_val:
                continue

            alt = passenger_data.copy()
            alt[feat_name] = new_val

            result = model.predict(alt)
            improvement = result["probability"] - current_prob
            description = cfg["format"](current_val, new_val)

            if improvement > 0.05:
                expl = f"✅ {description}: odds {current_prob:.0%} → {result['probability']:.0%}"
            elif improvement < -0.05:
                expl = f"⚠️ {description}: odds {current_prob:.0%} → {result['probability']:.0%}"
            else:
                expl = f"ℹ️ {description}: odds stay ~{result['probability']:.0%}"

            counterfactuals.append({
                "scenario": cfg["description"],
                "description": description,
                "probability": result["probability"],
                "survived": result["survived"],
                "improvement": improvement,
                "explanation": expl,
                "passenger": alt,
            })

        counterfactuals.sort(key=lambda x: abs(x["improvement"]), reverse=True)
        counterfactuals = counterfactuals[:num_alternatives]

        best = max(counterfactuals, key=lambda x: x["probability"]) if counterfactuals else None

        return {
            "current_probability": current_prob,
            "survived": current_result["survived"],
            "counterfactuals": counterfactuals,
            "best_action": best,
        }
