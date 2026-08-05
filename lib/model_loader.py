"""
Model Loader - Python wrapper for loading models in Next.js API routes
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer
from backend.models.counterfactual import CounterfactualAnalyzer

class ModelLoader:
    """
    Singleton model loader for API routes.
    Loads models once and reuses them for all predictions.
    """
    
    _instance = None
    _model = None
    _shap_explainer = None
    _counterfactual_analyzer = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.model_path = os.getenv('MODEL_PATH', './data/models/titanic_ensemble.pkl')
        self.loaded = False
    
    def load(self, force: bool = False):
        """
        Load all models.
        
        Args:
            force: Force reload even if already loaded
        """
        if self.loaded and not force:
            return
        
        try:
            # Load main model
            self._model = TitanicEnsemble()
            self._model.load_model(self.model_path)
            
            # Load SHAP explainer
            try:
                explainer_path = Path(self.model_path).parent / 'shap_explainer.pkl'
                if explainer_path.exists():
                    self._shap_explainer = joblib.load(str(explainer_path))
            except:
                pass
            
            # Load counterfactual analyzer
            self._counterfactual_analyzer = CounterfactualAnalyzer(self.model_path)
            
            self.loaded = True
            print("✅ Models loaded successfully")
            
        except Exception as e:
            print(f"❌ Failed to load models: {e}")
            raise
    
    def predict(self, passenger_data: dict) -> dict:
        """
        Make prediction for a passenger.
        
        Args:
            passenger_data: Passenger features
            
        Returns:
            Prediction result
        """
        if not self.loaded:
            self.load()
        
        return self._model.predict(passenger_data)
    
    def explain(self, passenger_data: dict) -> dict:
        """
        Get SHAP explanation for a passenger.
        
        Args:
            passenger_data: Passenger features
            
        Returns:
            SHAP explanation
        """
        if not self.loaded:
            self.load()
        
        if self._shap_explainer is None:
            raise ValueError("SHAP explainer not available")
        
        return self._shap_explainer.explain_passenger(passenger_data)
    
    def get_counterfactuals(self, passenger_data: dict) -> dict:
        """
        Get counterfactual scenarios.
        
        Args:
            passenger_data: Passenger features
            
        Returns:
            Counterfactual analysis
        """
        if not self.loaded:
            self.load()
        
        return self._counterfactual_analyzer.analyze(passenger_data)
    
    def get_model_info(self) -> dict:
        """Get model information."""
        if not self.loaded:
            self.load()
        
        return self._model.get_model_info()

# Global instance
model_loader = ModelLoader()