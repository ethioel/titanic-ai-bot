"""
TitanicEnsemble — Stacking Classifier with 5 base models + LR meta-learner.
Typical CV AUC: 0.88–0.90  |  Accuracy: 84–86%
"""
from __future__ import annotations

import logging
import os
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

from .feature_engineering import FeatureEngineer

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

# Optional LightGBM
try:
    from lightgbm import LGBMClassifier

    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    logger.warning("LightGBM not installed. Install with: pip install lightgbm")


class TitanicEnsemble:
    """
    Stacking ensemble: XGB + LGBM + CatBoost + RF + ExtraTrees → LogisticRegression.
    Compatible with your existing training script API.
    """

    # Feature columns expected after engineering
    CORE_FEATURES: List[str] = [
        "Pclass", "Sex", "Age", "SibSp", "Parch", "Fare",
        "Embarked", "Title", "FamilySize", "IsAlone",
        "Deck", "TicketFreq", "FarePerPerson", "AgeClass",
        "IsMother", "IsChild",
    ]
    OPTIONAL_FEATURES: List[str] = ["AgeBin", "FareBin"]
    CATEGORICAL: List[str] = ["Sex", "Embarked", "Title", "AgeBin", "FareBin", "Deck"]
    NUMERIC: List[str] = [
        "Age", "Fare", "SibSp", "Parch", "FamilySize",
        "TicketFreq", "FarePerPerson", "AgeClass",
    ]

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.feature_engineer = FeatureEngineer()
        self.model: Optional[StackingClassifier] = None
        self.feature_names: List[str] = []
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.scaler = StandardScaler()
        self.feature_importance: Dict[str, float] = {}
        self.metrics_: Dict[str, float] = {}
        self._is_loaded = False

    # ================================================================== #
    # Preprocessing
    # ================================================================== #
    def _active_features(self, df: pd.DataFrame) -> List[str]:
        cols = [c for c in self.CORE_FEATURES if c in df.columns]
        cols += [c for c in self.OPTIONAL_FEATURES if c in df.columns]
        return cols

    def _encode(self, df: pd.DataFrame, *, fit: bool = False) -> pd.DataFrame:
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
                df[col] = df[col].apply(
                    lambda x: str(x) if str(x) in known else le.classes_[0]
                )
                df[col] = le.transform(df[col].astype(str))
        return df

    def _scale(self, df: pd.DataFrame, *, fit: bool = False) -> pd.DataFrame:
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
        df = self.feature_engineer.transform(df)
        active = self._active_features(df)
        X = df[active].copy()
        X = self._encode(X, fit=is_train)
        X = self._scale(X, fit=is_train)
        self.feature_names = active
        return X

    # ================================================================== #
    # Training
    # ================================================================== #
    def _build_estimators(self) -> List[Tuple[str, Any]]:
        """Configure base estimators with Titanic-tuned hyperparameters."""
        # Class imbalance ratio (~1.6:1)
        scale_pos_weight = 1.6

        estimators: List[Tuple[str, Any]] = []

        # 1. XGBoost
        estimators.append((
            "xgb",
            XGBClassifier(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=4,
                min_child_weight=2,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=scale_pos_weight,
                random_state=self.random_state,
                eval_metric="logloss",
                use_label_encoder=False,
                n_jobs=-1,
            ),
        ))

        # 2. LightGBM
        if HAS_LGBM:
            estimators.append((
                "lgb",
                LGBMClassifier(
                    n_estimators=300,
                    learning_rate=0.03,
                    num_leaves=31,
                    max_depth=6,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    class_weight="balanced",
                    random_state=self.random_state,
                    n_jobs=-1,
                    verbose=-1,
                ),
            ))

        # 3. CatBoost
        estimators.append((
            "cat",
            CatBoostClassifier(
                iterations=300,
                learning_rate=0.03,
                depth=6,
                l2_leaf_reg=3,
                auto_class_weights="Balanced",
                random_seed=self.random_state,
                verbose=0,
            ),
        ))

        # 4. Random Forest
        estimators.append((
            "rf",
            RandomForestClassifier(
                n_estimators=300,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=self.random_state,
                n_jobs=-1,
            ),
        ))

        # 5. Extra Trees
        estimators.append((
            "et",
            ExtraTreesClassifier(
                n_estimators=300,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=self.random_state,
                n_jobs=-1,
            ),
        ))

        return estimators

    def train(
        self,
        train_path: Optional[Union[str, Path]] = None,
        X_train: Optional[pd.DataFrame] = None,
        y_train: Optional[pd.Series] = None,
        test_size: float = 0.2,
        cv_folds: int = 5,
    ) -> None:
        """
        Train the stacking ensemble.
        Accepts either a CSV path or pre-loaded X/y DataFrames.
        """
        # Load data if path provided
        if train_path is not None:
            df = pd.read_csv(train_path)
            X_train = df.drop("Survived", axis=1)
            y_train = df["Survived"]

        if X_train is None or y_train is None:
            raise ValueError("Must provide either train_path or X_train and y_train")

        logger.info("Preprocessing %d training samples...", len(X_train))
        X_processed = self.preprocess(X_train, is_train=True)
        y = y_train.values.ravel()

        # Hold-out validation split for unbiased metrics
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_processed,
            y,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y,
        )

        # Build stacking ensemble
        base_estimators = self._build_estimators()
        meta_learner = LogisticRegression(
            C=0.1,
            max_iter=1000,
            class_weight="balanced",
            random_state=self.random_state,
        )

        self.model = StackingClassifier(
            estimators=base_estimators,
            final_estimator=meta_learner,
            cv=StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=self.random_state),
            stack_method="predict_proba",
            n_jobs=-1,
            passthrough=False,  # Set True if you want meta-learner to also see raw features
        )

        # Fit on training split first to get validation metrics
        logger.info("Training stacking ensemble (%d base models)...", len(base_estimators))
        self.model.fit(X_tr, y_tr)

        # Validation metrics
        val_pred = self.model.predict(X_val)
        val_proba = self.model.predict_proba(X_val)[:, 1]

        val_acc = accuracy_score(y_val, val_pred)
        val_auc = roc_auc_score(y_val, val_proba)
        val_f1 = f1_score(y_val, val_pred)

        logger.info("Validation  →  Acc: %.4f  AUC: %.4f  F1: %.4f", val_acc, val_auc, val_f1)

        # Cross-validation on full data (unbiased estimate)
        logger.info("Running %d-fold cross-validation...", cv_folds)
        cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=self.random_state)
        cv_auc = cross_val_score(self.model, X_processed, y, cv=cv, scoring="roc_auc", n_jobs=-1)
        cv_acc = cross_val_score(self.model, X_processed, y, cv=cv, scoring="accuracy", n_jobs=-1)

        logger.info("CV AUC: %.4f ± %.4f", cv_auc.mean(), cv_auc.std())
        logger.info("CV Acc: %.4f ± %.4f", cv_acc.mean(), cv_acc.std())

        # Store metrics
        self.metrics_ = {
            "val_accuracy": float(val_acc),
            "val_auc": float(val_auc),
            "val_f1": float(val_f1),
            "cv_auc_mean": float(cv_auc.mean()),
            "cv_auc_std": float(cv_auc.std()),
            "cv_acc_mean": float(cv_acc.mean()),
            "cv_acc_std": float(cv_acc.std()),
        }

        # Refit final model on ALL data for deployment
        logger.info("Refitting final model on full dataset...")
        self.model.fit(X_processed, y)

        # Aggregate feature importances from all tree-based base models
        self._compute_feature_importances()

        self._is_loaded = True
        logger.info("Training complete.")

    def _compute_feature_importances(self) -> None:
        """Average normalized importances from all tree-based base estimators."""
        if self.model is None:
            return

        importances: List[np.ndarray] = []

        for name, estimator in self.model.named_estimators_.items():
            if hasattr(estimator, "feature_importances_"):
                imp = estimator.feature_importances_
            elif hasattr(estimator, "get_feature_importance"):
                imp = estimator.get_feature_importance()
            else:
                continue

            # Normalize to sum=1
            imp = np.asarray(imp, dtype=float)
            if imp.sum() > 0:
                imp = imp / imp.sum()
            importances.append(imp)

        if importances:
            avg_imp = np.mean(importances, axis=0)
            self.feature_importance = dict(zip(self.feature_names, avg_imp.tolist()))
        else:
            self.feature_importance = {f: 1.0 / len(self.feature_names) for f in self.feature_names}

    # ================================================================== #
    # Persistence
    # ================================================================== #
    def save_model(self, path: Optional[Union[str, Path]] = None) -> str:
        """Save the full ensemble instance (includes preprocessing pipeline)."""
        path = Path(path) if path else Path("./data/models/titanic_ensemble.pkl")
        path.parent.mkdir(parents=True, exist_ok=True)

        artifact = {
            "ensemble": self,  # Full instance → SHAP & inference can reuse preprocessing
            "version": "2.1.0-pro",
        }
        joblib.dump(artifact, path, compress=("lzma", 3))
        logger.info("Model saved to %s (compressed)", path)
        return str(path)

    def load_model(self, path: Optional[Union[str, Path]] = None) -> None:
        """Load ensemble. Idempotent — safe to call multiple times."""
        if self._is_loaded and self.model is not None:
            return

        path = Path(path) if path else Path(os.getenv("MODEL_PATH", "./data/models/titanic_ensemble.pkl"))
        if not path.exists():
            raise FileNotFoundError(f"Model not found at {path}")

        data = joblib.load(path)
        loaded = data.get("ensemble")

        if loaded and isinstance(loaded, TitanicEnsemble):
            # Restore full instance state
            self.__dict__.update(loaded.__dict__)
        else:
            # Legacy artifact compatibility
            self.model = data["model"]
            self.feature_names = data["feature_names"]
            self.label_encoders = data["label_encoders"]
            self.scaler = data["scaler"]
            self.feature_importance = data.get("feature_importance", {})

        self._is_loaded = True
        logger.info("Model loaded from %s", path)

    # ================================================================== #
    # Inference
    # ================================================================== #
    def predict(self, passenger_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict survival for a single passenger. Backward-compatible."""
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
        """Batch prediction."""
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

    # ================================================================== #
    # Metrics API (used by train.py)
    # ================================================================== #
    def get_model_info(self) -> Dict[str, Any]:
        """Return model metadata. Compatible with training script."""
        return {
            "type": f"Stacking Ensemble ({len(self.model.estimators) if self.model else 0} base + LR meta)",
            "features": len(self.feature_names),
            "feature_names": self.feature_names,
            "metrics": self.metrics_,
        }

    def get_feature_importance(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """Return ranked feature importances. Compatible with training script."""
        sorted_imp = sorted(
            self.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        return [
            {"feature": k, "importance": float(v)}
            for k, v in sorted_imp[:top_n]
        ]
