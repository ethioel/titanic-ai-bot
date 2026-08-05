import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from xgboost import XGBClassifier
from catboost import CatBoostClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

class TitanicEnsemble:
    """
    Ensemble model for Titanic survival prediction.
    Combines XGBoost, CatBoost, and Random Forest.
    """
    
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_importance = None
        
    def create_features(self, df):
        """
        Create features from raw passenger data.
        """
        df_fe = df.copy()
        
        # Family size
        df_fe['FamilySize'] = df_fe['SibSp'] + df_fe['Parch'] + 1
        df_fe['IsAlone'] = (df_fe['FamilySize'] == 1).astype(int)
        
        # Title extraction from name
        if 'Name' in df_fe.columns:
            df_fe['Title'] = df_fe['Name'].apply(
                lambda x: x.split(',')[1].split('.')[0].strip()
            )
            title_mapping = {
                'Mr': 'Mr', 'Miss': 'Miss', 'Mrs': 'Mrs', 'Master': 'Master',
                'Dr': 'Rare', 'Rev': 'Rare', 'Col': 'Rare', 'Major': 'Rare',
                'Lady': 'Rare', 'Countess': 'Rare', 'Capt': 'Rare', 'Don': 'Rare',
                'Jonkheer': 'Rare', 'Sir': 'Rare', 'Mme': 'Mrs', 'Mlle': 'Miss',
                'Ms': 'Miss'
            }
            df_fe['Title'] = df_fe['Title'].map(lambda x: title_mapping.get(x, 'Rare'))
        
        # Age binning
        if 'Age' in df_fe.columns:
            bins = [0, 12, 18, 35, 60, 100]
            labels = ['Child', 'Teen', 'Adult', 'Middle', 'Senior']
            df_fe['AgeBin'] = pd.cut(
                df_fe['Age'].fillna(df_fe['Age'].median()),
                bins=bins,
                labels=labels
            )
        
        # Fare binning
        if 'Fare' in df_fe.columns and df_fe['Fare'].notna().any():
            try:
                df_fe['FareBin'] = pd.qcut(
                    df_fe['Fare'].fillna(df_fe['Fare'].median()),
                    q=4,
                    labels=['Low', 'Medium', 'High', 'Very High']
                )
            except:
                df_fe['FareBin'] = 'Medium'
        
        return df_fe
    
    def preprocess(self, df, is_train=True):
        """
        Preprocess data for training or prediction.
        """
        df_proc = self.create_features(df)
        
        # Define feature columns
        feature_cols = [
            'Pclass', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare',
            'Embarked', 'Title', 'FamilySize', 'IsAlone'
        ]
        
        # Add optional features
        optional_cols = ['AgeBin', 'FareBin']
        for col in optional_cols:
            if col in df_proc.columns:
                feature_cols.append(col)
        
        X = df_proc[feature_cols].copy()
        
        # Encode categoricals
        categorical_cols = ['Sex', 'Embarked', 'Title']
        if 'AgeBin' in X.columns:
            categorical_cols.append('AgeBin')
        if 'FareBin' in X.columns:
            categorical_cols.append('FareBin')
        
        for col in categorical_cols:
            if col in X.columns:
                if is_train:
                    self.label_encoders[col] = LabelEncoder()
                    X[col] = self.label_encoders[col].fit_transform(X[col].astype(str))
                else:
                    if col in self.label_encoders:
                        # Handle unseen categories
                        X[col] = X[col].apply(
                            lambda x: str(x) if str(x) in self.label_encoders[col].classes_ else 'Unknown'
                        )
                        X[col] = self.label_encoders[col].transform(X[col].astype(str))
        
        # Scale numeric
        numeric_cols = ['Age', 'Fare', 'SibSp', 'Parch', 'FamilySize']
        numeric_cols = [c for c in numeric_cols if c in X.columns]
        X[numeric_cols] = self.scaler.fit_transform(X[numeric_cols]) if is_train else self.scaler.transform(X[numeric_cols])
        
        self.feature_names = feature_cols
        
        return X
    
    def train(self, train_path):
        """
        Train ensemble model on full dataset.
        """
        print("Loading data...")
        df = pd.read_csv(train_path)
        
        print("Preprocessing features...")
        X = self.preprocess(df, is_train=True)
        y = df['Survived']
        
        print("Training ensemble model...")
        
        # Create ensemble
        self.model = VotingClassifier(
            estimators=[
                ('xgb', XGBClassifier(
                    n_estimators=200,
                    learning_rate=0.05,
                    max_depth=6,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    eval_metric='logloss',
                    use_label_encoder=False
                )),
                ('cat', CatBoostClassifier(
                    iterations=200,
                    learning_rate=0.05,
                    depth=6,
                    l2_leaf_reg=3,
                    random_seed=42,
                    verbose=0
                )),
                ('rf', RandomForestClassifier(
                    n_estimators=200,
                    max_depth=12,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1
                ))
            ],
            voting='soft',
            weights=[1, 1, 0.8]
        )
        
        # Train
        self.model.fit(X, y)
        
        # Get feature importance from Random Forest
        rf_model = self.model.named_estimators_['rf']
        self.feature_importance = dict(zip(self.feature_names, rf_model.feature_importances_))
        
        print("✅ Model training complete!")
        print(f"   Features used: {len(self.feature_names)}")
        print(f"   Top features: {sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]}")
        
        # Save model
        self.save_model('./data/models/titanic_ensemble.pkl')
        
        return self.model
    
    def load_model(self, path='./data/models/titanic_ensemble.pkl'):
        """
        Load trained model.
        """
        data = joblib.load(path)
        self.model = data['model']
        self.feature_names = data['feature_names']
        self.label_encoders = data['label_encoders']
        self.scaler = data['scaler']
        self.feature_importance = data.get('feature_importance', {})
        return self.model
    
    def save_model(self, path='./data/models/titanic_ensemble.pkl'):
        """
        Save model to disk.
        """
        import os
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        joblib.dump({
            'model': self.model,
            'feature_names': self.feature_names,
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_importance': self.feature_importance
        }, path)
        print(f"Model saved to {path}")
    
    def predict(self, passenger_data):
        """
        Predict survival for a single passenger.
        """
        if self.model is None:
            self.load_model()
        
        # Convert to DataFrame
        df = pd.DataFrame([passenger_data])
        
        # Preprocess
        X = self.preprocess(df, is_train=False)
        
        # Predict
        prob = self.model.predict_proba(X)[0][1]
        
        return {
            'survived': bool(prob > 0.5),
            'probability': float(prob),
            'confidence': float(abs(prob - 0.5) * 2),
            'feature_importance': self.feature_importance
        }