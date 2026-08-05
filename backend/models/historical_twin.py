import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json

class HistoricalTwinMatcher:
    def __init__(self, manifest_path='./data/passenger_manifest.csv'):
        self.manifest = pd.read_csv(manifest_path)
        self.feature_weights = {
            'Pclass': 0.3,
            'Sex': 0.25,
            'Age': 0.2,
            'SibSp': 0.1,
            'Parch': 0.1,
            'Fare': 0.05
        }
        
    def find_twin(self, passenger_data):
        """Find the closest historical match"""
        # Normalize passenger data
        passenger_vec = self._vectorize_passenger(passenger_data)
        
        # Calculate similarity with all historical passengers
        similarities = []
        for _, historical in self.manifest.iterrows():
            historical_vec = self._vectorize_historical(historical)
            sim = cosine_similarity([passenger_vec], [historical_vec])[0][0]
            similarities.append({
                'name': historical.get('Name', 'Unknown'),
                'age': historical.get('Age', 'Unknown'),
                'gender': historical.get('Sex', 'Unknown'),
                'class': historical.get('Pclass', 'Unknown'),
                'survived': historical.get('Survived', 0),
                'similarity': sim
            })
        
        # Sort by similarity
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        twin = similarities[0]
        
        # Generate descriptive narrative
        narrative = self._generate_narrative(passenger_data, twin)
        
        return {
            'twin': twin,
            'narrative': narrative,
            'top_matches': similarities[:5]
        }
    
    def _vectorize_passenger(self, passenger):
        """Convert passenger data to feature vector"""
        # This is a simplified version - in production, use a learned embedding
        vec = [
            passenger.get('Pclass', 3) / 3.0,
            1 if passenger.get('Sex') == 'female' else 0,
            min(passenger.get('Age', 30) / 100, 1),
            min(passenger.get('SibSp', 0) / 10, 1),
            min(passenger.get('Parch', 0) / 10, 1),
            min(passenger.get('Fare', 32) / 512, 1)
        ]
        return np.array(vec)
    
    def _vectorize_historical(self, historical):
        """Convert historical passenger to feature vector"""
        vec = [
            historical.get('Pclass', 3) / 3.0,
            1 if historical.get('Sex') == 'female' else 0,
            min(historical.get('Age', 30) / 100, 1) if pd.notna(historical.get('Age')) else 0.3,
            min(historical.get('SibSp', 0) / 10, 1) if pd.notna(historical.get('SibSp')) else 0,
            min(historical.get('Parch', 0) / 10, 1) if pd.notna(historical.get('Parch')) else 0,
            min(historical.get('Fare', 32) / 512, 1) if pd.notna(historical.get('Fare')) else 0.06
        ]
        return np.array(vec)
    
    def _generate_narrative(self, passenger, twin):
        """Generate historical twin narrative"""
        survived_text = "survived" if twin['survived'] else "did not survive"
        class_text = {1: "1st Class", 2: "2nd Class", 3: "3rd Class"}.get(twin['class'], "Unknown Class")
        
        narrative = f"""
        Your historical twin is {twin['name']}, a {twin['age']}-year-old {twin['gender']} 
        traveling in {class_text} who {survived_text}. 
        You share {twin['similarity']:.1%} similarity in your passenger profile.
        
        """
        
        # Add personalized details based on comparison
        if passenger.get('Sex') == twin['gender']:
            narrative += f"Like you, they were {twin['gender']}."
        else:
            narrative += f"Unlike you, they were {twin['gender']}."
            
        if passenger.get('Pclass') == twin['class']:
            narrative += f" You both traveled in {class_text}."
        else:
            narrative += f" You traveled in different classes (you: {passenger.get('Pclass')}, them: {twin['class']})."
        
        return narrative