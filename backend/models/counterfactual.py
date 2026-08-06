from __future__ import annotations

from typing import Any, Dict, List, Optional

from .titanic_model import TitanicEnsemble


class CounterfactualAnalyzer:
    """Generates only actionable counterfactual explanations."""

    ACTIONABLE_FEATURES = {
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
        """Generate actionable counterfactuals. Backward-compatible API."""
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
