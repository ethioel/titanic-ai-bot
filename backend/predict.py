#!/usr/bin/env python
"""
Prediction Script - Predict Survival for Passenger
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer
from backend.models.counterfactual import CounterfactualAnalyzer
from backend.utils.data_loader import DataLoader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Predict Titanic Survival')
    
    parser.add_argument(
        '--input',
        type=str,
        help='Input JSON file or JSON string with passenger data'
    )
    parser.add_argument(
        '--passenger-id',
        type=int,
        help='Passenger ID to predict (uses sample if not provided)'
    )
    parser.add_argument(
        '--model-path',
        type=str,
        default='./data/models/titanic_ensemble.pkl',
        help='Path to model file'
    )
    parser.add_argument(
        '--explain',
        action='store_true',
        help='Generate SHAP explanations'
    )
    parser.add_argument(
        '--counterfactuals',
        action='store_true',
        help='Generate counterfactual scenarios'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Output file for results (JSON)'
    )
    
    return parser.parse_args()

def get_sample_passenger() -> Dict:
    """Get a sample passenger for prediction."""
    return {
        'Pclass': 3,
        'Sex': 'male',
        'Age': 30,
        'SibSp': 0,
        'Parch': 0,
        'Fare': 32.0,
        'Embarked': 'S',
        'Name': 'Sample Passenger'
    }

def load_passenger_data(args) -> Dict:
    """Load passenger data from arguments."""
    if args.input:
        try:
            # Check if input is a file
            if os.path.exists(args.input):
                with open(args.input, 'r') as f:
                    data = json.load(f)
                return data
            else:
                # Try parsing as JSON string
                return json.loads(args.input)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON input: {e}")
            return None
    
    if args.passenger_id:
        # Load from dataset
        loader = DataLoader()
        train_df = loader.load_train()
        if train_df is not None:
            passenger = train_df[train_df['PassengerId'] == args.passenger_id]
            if len(passenger) > 0:
                return passenger.iloc[0].to_dict()
        logger.error(f"❌ Passenger ID {args.passenger_id} not found")
        return None
    
    # Use sample passenger
    logger.info("ℹ️ Using sample passenger data")
    return get_sample_passenger()

def format_output(result: Dict, passenger_data: Dict) -> Dict:
    """Format prediction output."""
    output = {
        'passenger': passenger_data,
        'prediction': {
            'survived': result['survived'],
            'probability': result['probability'],
            'confidence': result['confidence']
        },
        'timestamp': result.get('prediction_time', '')
    }
    
    # Add explanations if available
    if 'explanations' in result:
        output['explanations'] = result['explanations']
    
    # Add counterfactuals if available
    if 'counterfactuals' in result:
        output['counterfactuals'] = result['counterfactuals']
    
    return output

def main():
    """Main prediction function."""
    args = parse_args()
    
    logger.info("=" * 60)
    logger.info("🚢 Titanic Survival Prediction")
    logger.info("=" * 60)
    
    # Load passenger data
    passenger_data = load_passenger_data(args)
    if passenger_data is None:
        sys.exit(1)
    
    logger.info("\n👤 Passenger Data:")
    for key, value in passenger_data.items():
        logger.info(f"   {key}: {value}")
    
    # Load model
    logger.info("\n🧠 Loading model...")
    model = TitanicEnsemble()
    
    try:
        model.load_model(args.model_path)
        logger.info(f"✅ Model loaded from {args.model_path}")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        sys.exit(1)
    
    # Make prediction
    logger.info("\n🔮 Making prediction...")
    result = model.predict(passenger_data)
    
    # Get explanations
    if args.explain:
        logger.info("\n📊 Generating explanations...")
        try:
            from backend.models.shap_explainer import SHAPExplainer
            explainer = SHAPExplainer(args.model_path)
            explanation = explainer.explain_passenger(passenger_data)
            result['explanations'] = explanation
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate explanations: {e}")
    
    # Get counterfactuals
    if args.counterfactuals:
        logger.info("\n🔄 Generating counterfactuals...")
        try:
            analyzer = CounterfactualAnalyzer(args.model_path)
            analysis = analyzer.analyze(passenger_data)
            result['counterfactuals'] = analysis
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate counterfactuals: {e}")
    
    # Display results
    logger.info("\n" + "=" * 60)
    logger.info("📊 Prediction Results")
    logger.info("=" * 60)
    
    survived = result['survived']
    prob = result['probability']
    confidence = result['confidence']
    
    logger.info(f"   Survival: {'✅ SURVIVED' if survived else '❌ PERISHED'}")
    logger.info(f"   Probability: {prob:.1%}")
    logger.info(f"   Confidence: {confidence:.1%}")
    
    # Show explanations
    if 'explanations' in result:
        logger.info("\n📈 Key Factors:")
        for item in result['explanations'].get('shap_values', [])[:5]:
            impact = '⬆️' if item['shap_value'] > 0 else '⬇️'
            logger.info(f"   {impact} {item['feature']}: {item['shap_value']:.3f}")
    
    # Show counterfactuals
    if 'counterfactuals' in result:
        logger.info("\n🔄 What-If Scenarios:")
        for cf in result['counterfactuals'].get('counterfactuals', [])[:3]:
            logger.info(f"   {'✅' if cf['improvement'] > 0 else '⚠️'} {cf['scenario']}: {cf['improvement']:.1%}")
    
    # Save output
    if args.output:
        output = format_output(result, passenger_data)
        with open(args.output, 'w') as f:
            json.dump(output, f, indent=2)
        logger.info(f"\n💾 Results saved to {args.output}")
    
    # Return JSON for API calls
    if sys.stdout.isatty():
        logger.info("\n" + "=" * 60)
    else:
        # Print JSON for API
        print(json.dumps({
            'survived': survived,
            'probability': prob,
            'confidence': confidence,
            'explanations': result.get('explanations', {}),
            'counterfactuals': result.get('counterfactuals', {})
        }))

if __name__ == "__main__":
    main()