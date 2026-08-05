"""
Data Loader - Load and Preprocess Titanic Data
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Union
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataLoader:
    """
    Load and preprocess Titanic dataset.
    Provides utilities for data validation and preparation.
    """
    
    def __init__(self, data_dir: str = './data/raw'):
        """
        Initialize data loader.
        
        Args:
            data_dir: Directory containing dataset files
        """
        self.data_dir = Path(data_dir)
        self.train_df = None
        self.test_df = None
        self.feature_names = None
        
    def load_train(self, path: Optional[str] = None) -> pd.DataFrame:
        """
        Load training data.
        
        Args:
            path: Path to training CSV (uses default if None)
            
        Returns:
            Training DataFrame
        """
        if path is None:
            path = self.data_dir / 'train.csv'
        else:
            path = Path(path)
        
        if not path.exists():
            logger.error(f"❌ Training file not found: {path}")
            return None
        
        try:
            self.train_df = pd.read_csv(path)
            logger.info(f"✅ Loaded training data: {len(self.train_df)} rows, {len(self.train_df.columns)} columns")
            return self.train_df
        except Exception as e:
            logger.error(f"❌ Failed to load training data: {e}")
            return None
    
    def load_test(self, path: Optional[str] = None) -> pd.DataFrame:
        """
        Load test data.
        
        Args:
            path: Path to test CSV (uses default if None)
            
        Returns:
            Test DataFrame
        """
        if path is None:
            path = self.data_dir / 'test.csv'
        else:
            path = Path(path)
        
        if not path.exists():
            logger.error(f"❌ Test file not found: {path}")
            return None
        
        try:
            self.test_df = pd.read_csv(path)
            logger.info(f"✅ Loaded test data: {len(self.test_df)} rows, {len(self.test_df.columns)} columns")
            return self.test_df
        except Exception as e:
            logger.error(f"❌ Failed to load test data: {e}")
            return None
    
    def load_all(self, train_path: Optional[str] = None, 
                 test_path: Optional[str] = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Load both training and test data.
        
        Returns:
            Tuple of (train_df, test_df)
        """
        train = self.load_train(train_path)
        test = self.load_test(test_path)
        return train, test
    
    def get_feature_columns(self, exclude: List[str] = None) -> List[str]:
        """
        Get feature column names.
        
        Args:
            exclude: Columns to exclude from features
            
        Returns:
            List of feature column names
        """
        if self.train_df is None:
            self.load_train()
        
        if self.train_df is None:
            return []
        
        exclude = exclude or ['PassengerId', 'Survived', 'Name', 'Ticket', 'Cabin']
        exclude = [e for e in exclude if e in self.train_df.columns]
        
        features = [c for c in self.train_df.columns if c not in exclude]
        self.feature_names = features
        
        return features
    
    def get_target_column(self) -> str:
        """
        Get target column name.
        
        Returns:
            Target column name
        """
        return 'Survived'
    
    def get_passenger_id_column(self) -> str:
        """
        Get passenger ID column name.
        
        Returns:
            Passenger ID column name
        """
        return 'PassengerId'
    
    def get_data_summary(self) -> Dict:
        """
        Get summary of loaded data.
        
        Returns:
            Dict with data summary
        """
        summary = {
            'train_shape': None,
            'test_shape': None,
            'train_columns': None,
            'test_columns': None,
            'features': self.feature_names,
            'target': self.get_target_column()
        }
        
        if self.train_df is not None:
            summary['train_shape'] = self.train_df.shape
            summary['train_columns'] = list(self.train_df.columns)
        
        if self.test_df is not None:
            summary['test_shape'] = self.test_df.shape
            summary['test_columns'] = list(self.test_df.columns)
        
        return summary
    
    def validate_data(self, df: pd.DataFrame) -> Dict:
        """
        Validate data for common issues.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Dict with validation results
        """
        validation = {
            'has_missing': False,
            'missing_columns': [],
            'missing_values': {},
            'outliers': {},
            'valid': True,
            'issues': []
        }
        
        # Check for missing values
        missing = df.isnull().sum()
        if missing.sum() > 0:
            validation['has_missing'] = True
            validation['missing_values'] = missing[missing > 0].to_dict()
            validation['issues'].append('Missing values detected')
        
        # Check for invalid values
        for col in df.columns:
            if df[col].dtype in ['int64', 'float64']:
                if df[col].min() < 0:
                    validation['outliers'][col] = f"Negative values: {df[col].min()}"
                    validation['issues'].append(f'Negative values in {col}')
        
        validation['valid'] = len(validation['issues']) == 0
        
        return validation
    
    def get_sample_data(self, n: int = 5, random: bool = False) -> pd.DataFrame:
        """
        Get sample of training data.
        
        Args:
            n: Number of samples
            random: Whether to sample randomly
            
        Returns:
            Sample DataFrame
        """
        if self.train_df is None:
            self.load_train()
        
        if self.train_df is None:
            return pd.DataFrame()
        
        if random:
            return self.train_df.sample(min(n, len(self.train_df)))
        else:
            return self.train_df.head(n)
    
    def save_processed_data(self, df: pd.DataFrame, filename: str = 'processed_data.csv') -> str:
        """
        Save processed data.
        
        Args:
            df: DataFrame to save
            filename: Output filename
            
        Returns:
            Path to saved file
        """
        output_dir = Path('./data/processed')
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = output_dir / filename
        df.to_csv(output_path, index=False)
        
        logger.info(f"✅ Saved processed data to {output_path}")
        return str(output_path)