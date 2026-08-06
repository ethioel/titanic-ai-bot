#!/usr/bin/env python3
import argparse
import logging
import os
import sys
from pathlib import Path

import pandas as pd

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer
from backend.models.counterfactual import CounterfactualAnalyzer

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("./logs/training.log"),
    ],
)
logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(description="Train Titanic Ensemble Model")
    parser.add_argument("--data-dir", type=str, default="./data/raw", help="Dataset directory")
    parser.add_argument("--model-path", type=str, default="./data/models/titanic_ensemble.pkl")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--cv-folds", type=int, default=5)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--no-shap", action="store_true", help="Skip SHAP explainer training")
    return parser.parse_args()


def main():
    args = parse_args()

    logger.info("=" * 60)
    logger.info("🚢 Titanic Stacking Ensemble Training")
    logger.info("=" * 60)

    Path("./data/models").mkdir(parents=True, exist_ok=True)
    Path("./logs").mkdir(parents=True, exist_ok=True)

    model_path = Path(args.model_path)
    if model_path.exists() and not args.force_train:
        logger.info("📁 Model already exists at %s", model_path)
        response = input("Retrain? (y/N): ")
        if response.lower() != "y":
            logger.info("❌ Training cancelled")
            return

    # ── Step 1: Load data ──
    # NOTE: Keeps your existing KaggleDownloader/DataLoader integration.
    # If you don't have those utils yet, replace this block with:
    #   train_df = pd.read_csv(Path(args.data_dir) / "train.csv")
    try:
        from backend.utils.kaggle_downloader import KaggleDownloader
        from backend.utils.data_loader import DataLoader

        downloader = KaggleDownloader(args.data_dir)
        username = os.getenv("KAGGLE_USERNAME")
        key = os.getenv("KAGGLE_KEY")
        if username and key:
            downloader.setup_kaggle_credentials(username, key)

        _, success = downloader.download_dataset(force=args.force_download)
        if not success:
            logger.warning("Download failed — using local files if present")

        loader = DataLoader(args.data_dir)
        train_df, test_df = loader.load_all()
    except ImportError:
        logger.warning("Utils not found — loading train.csv directly")
        train_df = pd.read_csv(Path(args.data_dir) / "train.csv")
        test_df = None

    if train_df is None or train_df.empty:
        logger.error("❌ Failed to load training data")
        sys.exit(1)

    logger.info("Training samples: %d", len(train_df))

    # ── Step 2: Train model ──
    model = TitanicEnsemble(random_state=42)
    model.train(
        train_path=None,
        X_train=train_df.drop("Survived", axis=1),
        y_train=train_df["Survived"],
        test_size=args.test_size,
        cv_folds=args.cv_folds,
    )

    # ── Step 3: Save ──
    saved_path = model.save_model(args.model_path)
    logger.info("💾 Model saved to: %s", saved_path)

    # ── Step 4: SHAP explainer ──
    if not args.no_shap:
        logger.info("\n📊 Fitting SHAP explainer...")
        try:
            explainer = SHAPExplainer(saved_path)
            background = train_df.drop("Survived", axis=1).sample(min(100, len(train_df)))
            explainer.fit_explainer(background, n_samples=100)

            # Re-save with SHAP attached (optional — keeps everything in one file)
            import joblib

            artifact = joblib.load(saved_path)
            artifact["shap_explainer"] = explainer.explainer
            joblib.dump(artifact, saved_path, compress=("lzma", 3))
            logger.info("✅ SHAP explainer attached to model artifact")
        except Exception as exc:
            logger.warning("⚠️ SHAP training failed: %s", exc)

    # ── Step 5: Results ──
    logger.info("\n" + "=" * 60)
    logger.info("📊 Training Results")
    logger.info("=" * 60)

    info = model.get_model_info()
    logger.info("Model Type: %s", info["type"])
    logger.info("Features: %d", info["features"])
    m = info["metrics"]
    logger.info("Validation Accuracy: %.4f", m["val_accuracy"])
    logger.info("Validation AUC:      %.4f", m["val_auc"])
    logger.info("Validation F1:       %.4f", m["val_f1"])
    logger.info("CV AUC:              %.4f (±%.4f)", m["cv_auc_mean"], m["cv_auc_std"])
    logger.info("CV Accuracy:         %.4f (±%.4f)", m["cv_acc_mean"], m["cv_acc_std"])

    logger.info("\n📈 Top 10 Features:")
    for i, item in enumerate(model.get_feature_importance(top_n=10), 1):
        logger.info("   %2d. %-20s %.4f", i, item["feature"], item["importance"])

    logger.info("\n" + "=" * 60)
    logger.info("✅ Training complete!")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
