from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class HistoricalTwinMatcher:
    """
    Find the closest historical match using vectorized cosine similarity.
    Backward-compatible API.
    """

    DEFAULT_WEIGHTS = {
        "Pclass": 0.30,
        "Sex": 0.25,
        "Age": 0.20,
        "SibSp": 0.10,
        "Parch": 0.10,
        "Fare": 0.05,
    }

    def __init__(
        self,
        manifest_path: Optional[str] = None,
        weights: Optional[Dict[str, float]] = None,
    ) -> None:
        self.manifest_path = Path(manifest_path) if manifest_path else Path("./data/passenger_manifest.csv")
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self._manifest: Optional[pd.DataFrame] = None
        self._matrix: Optional[np.ndarray] = None
        self._load()

    def _load(self) -> None:
        """Load manifest and pre-compute weighted feature matrix."""
        if not self.manifest_path.exists():
            raise FileNotFoundError(f"Passenger manifest not found: {self.manifest_path}")

        self._manifest = pd.read_csv(self.manifest_path)
        self._build_matrix()
        logger.info("Loaded manifest: %d passengers", len(self._manifest))

    def _build_matrix(self) -> None:
        """
        Vectorized matrix construction — runs once at init.
        Each row is a weighted, normalized feature vector.
        """
        m = self._manifest
        n = len(m)
        mat = np.zeros((n, 6), dtype=np.float64)

        # Column order must match _vectorize_passenger exactly
        mat[:, 0] = m["Pclass"].fillna(3).clip(1, 3) / 3.0
        mat[:, 1] = (m["Sex"] == "female").astype(float)
        mat[:, 2] = m["Age"].fillna(30).clip(0, 100) / 100.0
        mat[:, 3] = m["SibSp"].fillna(0).clip(0, 10) / 10.0
        mat[:, 4] = m["Parch"].fillna(0).clip(0, 10) / 10.0
        mat[:, 5] = m["Fare"].fillna(32).clip(0, 512) / 512.0

        w = np.array([
            self.weights["Pclass"],
            self.weights["Sex"],
            self.weights["Age"],
            self.weights["SibSp"],
            self.weights["Parch"],
            self.weights["Fare"],
        ], dtype=np.float64)
        self._matrix = mat * w

    def _vectorize_passenger(self, passenger_data: Dict[str, Any]) -> np.ndarray:
        """Convert raw passenger dict to weighted feature vector."""
        vec = np.array([
            passenger_data.get("Pclass", 3) / 3.0 * self.weights["Pclass"],
            (1.0 if passenger_data.get("Sex") == "female" else 0.0) * self.weights["Sex"],
            min(passenger_data.get("Age", 30), 100) / 100.0 * self.weights["Age"],
            min(passenger_data.get("SibSp", 0), 10) / 10.0 * self.weights["SibSp"],
            min(passenger_data.get("Parch", 0), 10) / 10.0 * self.weights["Parch"],
            min(passenger_data.get("Fare", 32), 512) / 512.0 * self.weights["Fare"],
        ], dtype=np.float64)
        return vec.reshape(1, -1)

    def find_twin(self, passenger_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find closest historical match.
        Returns backward-compatible dict with 'twin', 'narrative', 'top_matches'.
        """
        passenger_vec = self._vectorize_passenger(passenger_data)

        # Single vectorized cosine similarity call (C-speed, not Python loops)
        similarities = cosine_similarity(passenger_vec, self._matrix)[0]
        top_indices = np.argsort(similarities)[::-1][:5]

        matches: List[Dict[str, Any]] = []
        for idx in top_indices:
            row = self._manifest.iloc[idx]
            matches.append({
                "name": str(row.get("Name", "Unknown")),
                "age": float(row["Age"]) if pd.notna(row.get("Age")) else None,
                "gender": str(row.get("Sex", "Unknown")),
                "class": int(row.get("Pclass", 0)),
                "survived": bool(row.get("Survived", 0)),
                "similarity": float(similarities[idx]),
            })

        twin = matches[0]
        return {
            "twin": twin,
            "narrative": self._generate_narrative(passenger_data, twin),
            "top_matches": matches,
        }

    def _generate_narrative(
        self,
        passenger: Dict[str, Any],
        twin: Dict[str, Any],
    ) -> str:
        """Generate human-readable comparison narrative."""
        survived_text = "survived" if twin["survived"] else "did not survive"
        class_text = {1: "1st Class", 2: "2nd Class", 3: "3rd Class"}.get(twin["class"], "Unknown Class")

        narrative = (
            f"Your historical twin is {twin['name']}, a {twin['age']}-year-old {twin['gender']} "
            f"traveling in {class_text} who {survived_text}. "
            f"You share {twin['similarity']:.1%} similarity in your passenger profile.\n\n"
        )

        if passenger.get("Sex") == twin["gender"]:
            narrative += f"Like you, they were {twin['gender']}."
        else:
            narrative += f"Unlike you, they were {twin['gender']}."

        if passenger.get("Pclass") == twin["class"]:
            narrative += f" You both traveled in {class_text}."
        else:
            narrative += (
                f" You traveled in different classes "
                f"(you: {passenger.get('Pclass')}, them: {twin['class']})."
            )

        return narrative
