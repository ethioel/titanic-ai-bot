#!/usr/bin/env python
"""
Model Training Script - Train Titanic Ensemble Model
"""

import os
import sys
import argparse
import logging
from pathlib import Path
import json
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer
from backend.models.counterfactual import CounterfactualAnalyzer
from backend.utils.kaggle_downloader import KaggleDownloader
from backend.utils.data_loader import DataLoader

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('./logs/training.log')
    ]
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Train Titanic Ensemble Model')
    
    parser.add_argument(
        '--data-dir',
        type=str,
        default='./data/raw',
        help='Directory containing dataset'
    )
    parser.add_argument(
        '--model-path',
        type=str,
        default='./data/models/titanic_ensemble.pkl',
        help='Path to save the model'
    )
    parser.add_argument(
        '--force-download',
        action='store_true',
        help='Force re-download of dataset'
    )
    parser.add_argument(
        '--force-train',
        action='store_true',
        help='Force re-training even if model exists'
    )
    parser.add_argument(
        '--cv-folds',
        type=int,
        default=5,
        help='Number of cross-validation folds'
    )
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.2,
        help='Test size for validation split'
    )
    parser.add_argument(
        '--no-shap',
        action='store_true',
        help='Skip SHAP explainer training'
    )
    
    return parser.parse_args()

def main():
    """Main training function."""
    args = parse_args()
    
    logger.info("=" * 60)
    logger.info("🚢 Titanic Ensemble Model Training")
    logger.info("=" * 60)
    
    # Create directories
    Path('./data/models').mkdir(parents=True, exist_ok=True)
    Path('./logs').mkdir(parents=True, exist_ok=True)
    
    # Check if model already exists
    model_path = Path(args.model_path)
    if model_path.exists() and not args.force_train:
        logger.info(f"📁 Model already exists at {model_path}")
        response = input("Model already exists. Retrain? (y/N): ")
        if response.lower() != 'y':
            logger.info("❌ Training cancelled")
            return
    
    # Step 1: Download data
    logger.info("\n📥 Step 1: Downloading dataset...")
    downloader = KaggleDownloader(args.data_dir)
    
    # Try to download using environment variables
    username = os.getenv('KAGGLE_USERNAME')
    key = os.getenv('KAGGLE_KEY')
    
    if username and key:
        downloader.setup_kaggle_credentials(username, key)
    
    data_path, success = downloader.download_dataset(force=args.force_download)
    
    if not success:
        logger.error("❌ Failed to download dataset")
        logger.info("⚠️ Using local files if available...")
    
    # Step 2: Load data
    logger.info("\n📂 Step 2: Loading data...")
    loader = DataLoader(args.data_dir)
    train_df, test_df = loader.load_all()
    
    if train_df is None:
        logger.error("❌ Failed to load training data")
        sys.exit(1)
    
    logger.info(f"   Training: {len(train_df)} rows")
    logger.info(f"   Test: {len(test_df) if test_df is not None else 0} rows")
    
    # Step 3: Train model
    logger.info("\n🧠 Step 3: Training ensemble model...")
    
    model = TitanicEnsemble(random_state=42)
    model.train(
        train_path=None,
        X_train=train_df.drop('Survived', axis=1),
        y_train=train_df['Survived'],
        test_size=args.test_size,
        cv_folds=args.cv_folds
    )
    
    # Save model
    logger.info("\n💾 Saving model...")
    saved_path = model.save_model(args.model_path)
    
    # Step 4: Train SHAP explainer
    if not args.no_shap:
        logger.info("\n📊 Step 4: Training SHAP explainer...")
        try:
            from backend.models.shap_explainer import SHAPExplainer
            explainer = SHAPExplainer(args.model_path)
            
            # Get background data
            background = train_df.drop('Survived', axis=1).sample(min(100, len(train_df)))
            
            # Fit explainer
            explainer.fit_explainer(background)
            
            # Save explainer
            import joblib
            explainer_path = Path(args.model_path).parent / 'shap_explainer.pkl'
            joblib.dump(explainer, str(explainer_path))
            logger.info(f"✅ SHAP explainer saved to {explainer_path}")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to train SHAP explainer: {e}")
    
    # Step 5: Display results
    logger.info("\n" + "=" * 60)
    logger.info("📊 Training Results")
    logger.info("=" * 60)
    
    metrics = model.get_model_info()
    logger.info(f"Model Type: {metrics['type']}")
    logger.info(f"Features: {metrics['features']}")
    logger.info(f"Validation Accuracy: {metrics['metrics']['val_accuracy']:.4f}")
    logger.info(f"Validation AUC: {metrics['metrics']['val_auc']:.4f}")
    logger.info(f"Validation F1: {metrics['metrics']['val_f1']:.4f}")
    logger.info(f"CV AUC Mean: {metrics['metrics']['cv_auc_mean']:.4f} (±{metrics['metrics']['cv_auc_std']:.4f})")
    
    # Feature importance
    logger.info("\n📈 Top 10 Features:")
    importance = model.get_feature_importance(top_n=10)
    for i, item in enumerate(importance, 1):
        logger.info(f"   {i}. {item['feature']}: {item['importance']:.4f}")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ Training complete!")
    logger.info(f"Model saved to: {saved_path}")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()