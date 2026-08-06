"""
TitanicEnsemble — production-grade ensemble classifier.
Fits into: backend/models/titanic_model.py
"""
from __future__ import annotations

import logging
import os
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class TitanicEnsemble:
    """
    Ensemble model for Titanic survival prediction.
    Combines XGBoost, CatBoost, and Random Forest.
    """

    # ------------------------------------------------------------------ #
    # Feature configuration
    # ------------------------------------------------------------------ #
    CORE_FEATURES: List[str] = [
        "Pclass", "Sex", "Age", "SibSp", "Parch", "Fare",
        "Embarked", "Title", "FamilySize", "IsAlone",
    ]
    OPTIONAL_FEATURES: List[str] = ["AgeBin", "FareBin"]
    CATEGORICAL: List[str] = ["Sex", "Embarked", "Title", "AgeBin", "FareBin"]
    NUMERIC: List[str] = ["Age", "Fare", "SibSp", "Parch", "FamilySize"]

    TITLE_MAP: Dict[str, str] = {
        "Mr": "Mr", "Miss": "Miss", "Mrs": "Mrs", "Master": "Master",
        "Dr": "Rare", "Rev": "Rare", "Col": "Rare", "Major": "Rare",
        "Lady": "Rare", "Countess": "Rare", "Capt": "Rare", "Don": "Rare",
        "Jonkheer": "Rare", "Sir": "Rare", "Mme": "Mrs", "Mlle": "Miss", "Ms": "Miss",
    }
    AGE_BINS: List[int] = [0, 12, 18, 35, 60, 100]
    AGE_LABELS: List[str] = ["Child", "Teen", "Adult", "Middle", "Senior"]

    def __init__(self) -> None:
        self.model: Optional[VotingClassifier] = None
        self.feature_names: List[str] = []
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.scaler = StandardScaler()
        self.feature_importance: Dict[str, float] = {}
        self._is_loaded = False

    # ================================================================== #
    # Feature Engineering
    # ================================================================== #
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create features from raw passenger data.
        Pure function — no side effects on input.
        """
        df_fe = df.copy()

        # Family size & alone flag
        df_fe["FamilySize"] = df_fe["SibSp"] + df_fe["Parch"] + 1
        df_fe["IsAlone"] = (df_fe["FamilySize"] == 1).astype(int)

        # Title extraction (vectorized, robust to missing Name column)
        if "Name" in df_fe.columns:
            names = df_fe["Name"].astype(str)
            # Extract text between first comma and first dot
            titles = (
                names.str.split(",", n=1, expand=True)[1]
                .str.split(".", n=1, expand=True)[0]
                .str.strip()
                .map(self.TITLE_MAP)
                .fillna("Rare")
            )
            df_fe["Title"] = titles

        # Age binning
        if "Age" in df_fe.columns:
            median_age = df_fe["Age"].median() if df_fe["Age"].notna().any() else 30.0
            df_fe["AgeBin"] = pd.cut(
                df_fe["Age"].fillna(median_age),
                bins=self.AGE_BINS,
                labels=self.AGE_LABELS,
            )

        # Fare binning
        if "Fare" in df_fe.columns and df_fe["Fare"].notna().any():
            median_fare = df_fe["Fare"].median() if df_fe["Fare"].notna().any() else 32.0
            try:
                df_fe["FareBin"] = pd.qcut(
                    df_fe["Fare"].fillna(median_fare),
                    q=4,
                    labels=["Low", "Medium", "High", "Very High"],
                )
            except ValueError:
                # Happens when all fares are identical
                df_fe["FareBin"] = "Medium"

        return df_fe

    # ================================================================== #
    # Preprocessing
    # ================================================================== #
    def _active_features(self, df: pd.DataFrame) -> List[str]:
        """Determine which feature columns are available."""
        cols = [c for c in self.CORE_FEATURES if c in df.columns]
        cols += [c for c in self.OPTIONAL_FEATURES if c in df.columns]
        return cols

    def _encode_categoricals(self, df: pd.DataFrame, *, fit: bool = False) -> pd.DataFrame:
        """Encode categorical columns. Handles unseen categories at inference."""
        df = df.copy()
        for col in self.CATEGORICAL:
            if col not in df.columns:
                continue

            if fit:
                self.label_encoders[col] = LabelEncoder()
                df[col] = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                le = self.label_encoders.get(col)
                if le is None:
                    continue
                known = set(le.classes_)
                # Map unknowns to the first known class (usually the most frequent)
                df[col] = df[col].apply(
                    lambda x: str(x) if str(x) in known else le.classes_[0]
                )
                df[col] = le.transform(df[col].astype(str))
        return df

    def _scale_numerics(self, df: pd.DataFrame, *, fit: bool = False) -> pd.DataFrame:
        """Scale numeric columns."""
        df = df.copy()
        nums = [c for c in self.NUMERIC if c in df.columns]
        if not nums:
            return df
        if fit:
            df[nums] = self.scaler.fit_transform(df[nums])
        else:
            df[nums] = self.scaler.transform(df[nums])
        return df

    def preprocess(self, df: pd.DataFrame, is_train: bool = True) -> pd.DataFrame:
        """
        Preprocess data for training or prediction.
        Backward-compatible signature.
        """
        df = self.create_features(df)
        active = self._active_features(df)
        X = df[active].copy()
        X = self._encode_categoricals(X, fit=is_train)
        X = self._scale_numerics(X, fit=is_train)
        self.feature_names = active
        return X

    # ================================================================== #
    # Training
    # ================================================================== #
    def train(self, train_path: Union[str, Path]) -> None:
        """Train ensemble model on full dataset."""
        train_path = Path(train_path)
        if not train_path.exists():
            raise FileNotFoundError(f"Training data not found: {train_path}")

        logger.info("Loading training data from %s", train_path)
        df = pd.read_csv(train_path)

        if "Survived" not in df.columns:
            raise ValueError("Training data must contain 'Survived' column")

        logger.info("Preprocessing features...")
        X = self.preprocess(df, is_train=True)
        y = df["Survived"]

        logger.info("Training ensemble (XGBoost + CatBoost + RandomForest)...")

        # XGBoost — handle param deprecation across versions
        xgb_kwargs: Dict[str, Any] = {
            "n_estimators": 200,
            "learning_rate": 0.05,
            "max_depth": 6,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "eval_metric": "logloss",
        }
        try:
            xgb = XGBClassifier(**xgb_kwargs, use_label_encoder=False)
        except TypeError:
            # Newer XGBoost removed use_label_encoder
            xgb = XGBClassifier(**xgb_kwargs)

        cat = CatBoostClassifier(
            iterations=200,
            learning_rate=0.05,
            depth=6,
            l2_leaf_reg=3,
            random_seed=42,
            verbose=0,
        )

        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )

        self.model = VotingClassifier(
            estimators=[("xgb", xgb), ("cat", cat), ("rf", rf)],
            voting="soft",
            weights=[1.0, 1.0, 0.8],
        )
        self.model.fit(X, y)

        # Feature importance from Random Forest
        rf_model = self.model.named_estimators_["rf"]
        self.feature_importance = dict(zip(self.feature_names, rf_model.feature_importances_))

        logger.info("Training complete. Features: %d", len(self.feature_names))
        logger.info(
            "Top features: %s",
            sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)[:5],
        )

        self._is_loaded = True
        self.save_model()

    # ================================================================== #
    # Persistence
    # ================================================================== #
    def save_model(self, path: Optional[Union[str, Path]] = None) -> None:
        """Save model artifact to disk."""
        path = Path(path) if path else Path("./data/models/titanic_ensemble.pkl")
        path.parent.mkdir(parents=True, exist_ok=True)

        artifact = {
            "model": self.model,
            "feature_names": self.feature_names,
            "label_encoders": self.label_encoders,
            "scaler": self.scaler,
            "feature_importance": self.feature_importance,
            "version": "2.0.0-pro",
        }
        joblib.dump(artifact, path)
        logger.info("Model saved to %s", path)

    def load_model(self, path: Optional[Union[str, Path]] = None) -> None:
        """
        Load trained model. Idempotent — safe to call multiple times.
        """
        if self._is_loaded and self.model is not None:
            return

        path = Path(path) if path else Path(os.getenv("MODEL_PATH", "./data/models/titanic_ensemble.pkl"))
        if not path.exists():
            raise FileNotFoundError(f"Model not found at {path}")

        data = joblib.load(path)
        self.model = data["model"]
        self.feature_names = data["feature_names"]
        self.label_encoders = data["label_encoders"]
        self.scaler = data["scaler"]
        self.feature_importance = data.get("feature_importance", {})
        self._is_loaded = True
        logger.info("Model loaded from %s (version %s)", path, data.get("version", "unknown"))

    # ================================================================== #
    # Inference
    # ================================================================== #
    def predict(self, passenger_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict survival for a single passenger.
        Returns backward-compatible dict.
        """
        if not self._is_loaded or self.model is None:
            self.load_model()

        df = pd.DataFrame([passenger_data])
        X = self.preprocess(df, is_train=False)

        prob = float(self.model.predict_proba(X)[0, 1])

        return {
            "survived": bool(prob > 0.5),
            "probability": prob,
            "confidence": float(abs(prob - 0.5) * 2),
            "feature_importance": self.feature_importance,
        }

    def predict_batch(self, passengers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Batch prediction — much faster for multiple passengers."""
        if not self._is_loaded or self.model is None:
            self.load_model()

        df = pd.DataFrame(passengers)
        X = self.preprocess(df, is_train=False)
        probs = self.model.predict_proba(X)[:, 1]

        return [
            {
                "survived": bool(p > 0.5),
                "probability": float(p),
                "confidence": float(abs(p - 0.5) * 2),
                "feature_importance": self.feature_importance,
            }
            for p in probs
        ]
