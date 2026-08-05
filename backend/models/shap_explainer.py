import shap
import pandas as pd
import numpy as np
import joblib

class SHAPExplainer:
    def __init__(self, model_path='./data/models/titanic_ensemble.pkl'):
        self.model_data = joblib.load(model_path)
        self.model = self.model_data['model']
        self.feature_names = self.model_data['feature_names']
        self.explainer = None
        self.background_data = None
        
    def fit_explainer(self, X_background):
        """Fit SHAP explainer"""
        self.background_data = X_background
        # Use TreeExplainer for tree-based models
        self.explainer = shap.TreeExplainer(self.model)
        
    def explain_prediction(self, X_instance):
        """Get SHAP values for a single prediction"""
        if self.explainer is None:
            raise ValueError("Explainer not fitted. Call fit_explainer first.")
        
        shap_values = self.explainer.shap_values(X_instance)
        
        # For classification, shap_values is a list
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Positive class
        
        # Create explanation
        explanation = []
        for i, feature in enumerate(self.feature_names):
            explanation.append({
                'feature': feature,
                'value': float(X_instance[0][i]),
                'shap_value': float(shap_values[0][i]),
                'impact': 'positive' if shap_values[0][i] > 0 else 'negative'
            })
        
        # Sort by absolute SHAP value
        explanation.sort(key=lambda x: abs(x['shap_value']), reverse=True)
        
        return explanation

class CounterfactualAnalyzer:
    def __init__(self, model_path='./data/models/titanic_ensemble.pkl'):
        self.model_data = joblib.load(model_path)
        self.model = self.model_data['model']
        self.feature_names = self.model_data['feature_names']
        self.scaler = self.model_data['scaler']
        self.label_encoders = self.model_data['label_encoders']
        
    def generate_counterfactuals(self, passenger_data, num_alternatives=3):
        """Generate counterfactual explanations"""
        # Get current prediction
        from .titanic_model import TitanicEnsemble
        predictor = TitanicEnsemble()
        predictor.load_model()
        current_result = predictor.predict(passenger_data)
        current_prob = current_result['probability']
        
        counterfactuals = []
        
        # Alternative scenarios based on actionable changes
        scenarios = []
        
        # Class upgrade
        if passenger_data.get('Pclass', 3) > 1:
            alt = passenger_data.copy()
            alt['Pclass'] = 1
            scenarios.append({
                'scenario': f'Upgrade to 1st Class',
                'passenger': alt,
                'description': f"Current {passenger_data['Pclass']}rd Class → 1st Class"
            })
        
        # Gender (if male, change to female)
        if passenger_data.get('Sex') == 'male':
            alt = passenger_data.copy()
            alt['Sex'] = 'female'
            scenarios.append({
                'scenario': 'Gender Change',
                'passenger': alt,
                'description': 'Male → Female'
            })
        
        # Age (if senior, change to child)
        if passenger_data.get('Age', 30) > 30:
            alt = passenger_data.copy()
            alt['Age'] = 8
            scenarios.append({
                'scenario': 'Travel as Child',
                'passenger': alt,
                'description': f"Age {passenger_data['Age']} → 8 years old"
            })
        
        # Add more company
        alt = passenger_data.copy()
        alt['SibSp'] = min(passenger_data.get('SibSp', 0) + 2, 5)
        scenarios.append({
            'scenario': 'Travel with Family',
            'passenger': alt,
            'description': f"Add 2 family members"
        })
        
        # Limit to requested number
        scenarios = scenarios[:num_alternatives]
        
        # Calculate alternative probabilities
        for scenario in scenarios:
            result = predictor.predict(scenario['passenger'])
            scenario['probability'] = result['probability']
            scenario['survived'] = result['survived']
            scenario['improvement'] = result['probability'] - current_prob
            
            # Generate human-readable explanation
            if scenario['improvement'] > 0.05:
                scenario['explanation'] = f"✅ {scenario['description']}: Survival odds increase from {current_prob:.0%} to {result['probability']:.0%}"
            elif scenario['improvement'] < -0.05:
                scenario['explanation'] = f"⚠️ {scenario['description']}: Survival odds decrease from {current_prob:.0%} to {result['probability']:.0%}"
            else:
                scenario['explanation'] = f"ℹ️ {scenario['description']}: Survival odds remain similar ({result['probability']:.0%})"
            
            counterfactuals.append(scenario)
        
        return {
            'current_probability': current_prob,
            'survived': current_result['survived'],
            'counterfactuals': counterfactuals,
            'best_action': max(counterfactuals, key=lambda x: x['probability']) if counterfactuals else None
        }