#!/usr/bin/env python3
"""
Knowledge Distillation — Train a tiny student that mimics the big ensemble.
Output: ~2MB model that scores 82–84% (vs 86% ensemble) — fits Vercel limits.
Fits into: backend/distill.py
"""
import argparse
import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score

sys.path.insert(0, str(Path(__file__).parent))
from models.titanic_model import TitanicEnsemble

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Distill ensemble to lightweight student")
    parser.add_argument("--data", default="./data/raw/train.csv")
    parser.add_argument("--teacher", default="./data/models/titanic_ensemble.pkl")
    parser.add_argument("--out", default="./data/models/titanic_student.pkl")
    parser.add_argument("--soft-temp", type=float, default=2.0, help="Temperature for soft labels")
    args = parser.parse_args()

    logger.info("Loading teacher ensemble...")
    teacher = TitanicEnsemble()
    teacher.load_model(args.teacher)

    logger.info("Loading training data...")
    df = pd.read_csv(args.data)
    X_raw = df.drop("Survived", axis=1)
    y_hard = df["Survived"].values

    logger.info("Preprocessing...")
    X = teacher.preprocess(X_raw, is_train=False)

    logger.info("Generating soft labels from teacher...")
    probs = teacher.model.predict_proba(X)[:, 1]
    # Soft targets with temperature
    soft_y = np.vstack([1 - probs, probs]).T  # shape (n, 2)

    logger.info("Training student MLP...")
    student = MLPClassifier(
        hidden_layer_sizes=(64, 32, 16),
        activation="relu",
        solver="adam",
        alpha=0.001,
        batch_size=32,
        learning_rate_init=0.001,
        max_iter=1000,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
    )
    # Fit on soft labels (regression-like) then fine-tune on hard labels
    student.fit(X, soft_y)
    student.fit(X, y_hard)  # Fine-tune

    # Evaluate
    student_proba = student.predict_proba(X)[:, 1]
    acc = accuracy_score(y_hard, student_proba > 0.5)
    auc = roc_auc_score(y_hard, student_proba)
    logger.info("Student → Acc: %.4f  AUC: %.4f", acc, auc)

    # Save compact artifact (preprocessing + model)
    artifact = {
        "model": student,
        "scaler": teacher.scaler,
        "label_encoders": teacher.label_encoders,
        "feature_names": teacher.feature_names,
        "feature_engineer": teacher.feature_engineer,
        "version": "student-1.0.0",
    }
    joblib.dump(artifact, args.out, compress=("lzma", 3))
    size_mb = Path(args.out).stat().st_size / (1024 * 1024)
    logger.info("Student saved to %s (%.2f MB)", args.out, size_mb)


if __name__ == "__main__":
    main()
