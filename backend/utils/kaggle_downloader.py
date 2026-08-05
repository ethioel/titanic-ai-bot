"""
Kaggle Downloader - Fetch Titanic Dataset from Kaggle API
"""

import os
import subprocess
import json
import zipfile
import shutil
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KaggleDownloader:
    """
    Handles downloading the Titanic dataset from Kaggle.
    Uses Kaggle API with proper authentication.
    """
    
    def __init__(self, data_dir: str = './data/raw'):
        """
        Initialize Kaggle downloader.
        
        Args:
            data_dir: Directory to store downloaded data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.kaggle_available = False
        self._check_kaggle()
    
    def _check_kaggle(self):
        """Check if Kaggle CLI is available."""
        try:
            result = subprocess.run(
                ['kaggle', '--version'],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0:
                self.kaggle_available = True
                logger.info("✅ Kaggle CLI is available")
            else:
                logger.warning("⚠️ Kaggle CLI not found")
        except FileNotFoundError:
            logger.warning("⚠️ Kaggle CLI not found")
    
    def setup_kaggle_credentials(self, username: str, key: str) -> bool:
        """
        Set up Kaggle API credentials.
        
        Args:
            username: Kaggle username
            key: Kaggle API key
            
        Returns:
            True if credentials were set successfully
        """
        try:
            # Create .kaggle directory
            kaggle_dir = Path.home() / '.kaggle'
            kaggle_dir.mkdir(exist_ok=True)
            
            # Write credentials
            kaggle_file = kaggle_dir / 'kaggle.json'
            with open(kaggle_file, 'w') as f:
                json.dump({
                    'username': username,
                    'key': key
                }, f)
            
            # Set permissions
            os.chmod(kaggle_file, 0o600)
            
            logger.info("✅ Kaggle credentials configured")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to set Kaggle credentials: {e}")
            return False
    
    def download_dataset(self, 
                         competition: str = 'titanic',
                         force: bool = False) -> Tuple[str, bool]:
        """
        Download Titanic dataset from Kaggle.
        
        Args:
            competition: Kaggle competition name
            force: Force re-download
            
        Returns:
            Tuple of (data_path, success)
        """
        if not self.kaggle_available:
            logger.error("❌ Kaggle CLI not available")
            return str(self.data_dir), False
        
        # Check if files already exist
        train_path = self.data_dir / 'train.csv'
        test_path = self.data_dir / 'test.csv'
        
        if train_path.exists() and test_path.exists() and not force:
            logger.info("📁 Dataset already exists, using cached version")
            return str(self.data_dir), True
        
        try:
            logger.info(f"📥 Downloading dataset from Kaggle: {competition}")
            
            # Download from Kaggle
            result = subprocess.run(
                [
                    'kaggle', 'competitions', 'download',
                    '-c', competition,
                    '-p', str(self.data_dir)
                ],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                logger.error(f"❌ Download failed: {result.stderr}")
                return str(self.data_dir), False
            
            # Unzip files
            for file in self.data_dir.glob('*.zip'):
                logger.info(f"📦 Extracting {file.name}")
                with zipfile.ZipFile(file, 'r') as zip_ref:
                    zip_ref.extractall(self.data_dir)
                file.unlink()  # Remove zip file
            
            # Verify files
            if not train_path.exists() or not test_path.exists():
                logger.error("❌ Required files not found after extraction")
                return str(self.data_dir), False
            
            logger.info("✅ Dataset downloaded and extracted successfully")
            logger.info(f"   Training: {train_path}")
            logger.info(f"   Test: {test_path}")
            
            return str(self.data_dir), True
            
        except Exception as e:
            logger.error(f"❌ Download error: {e}")
            return str(self.data_dir), False
    
    def download_from_env(self) -> Tuple[str, bool]:
        """
        Download dataset using environment variables for credentials.
        
        Returns:
            Tuple of (data_path, success)
        """
        username = os.getenv('KAGGLE_USERNAME')
        key = os.getenv('KAGGLE_KEY')
        
        if username and key:
            self.setup_kaggle_credentials(username, key)
        
        return self.download_dataset()
    
    def get_dataset_info(self) -> Dict:
        """
        Get information about the downloaded dataset.
        
        Returns:
            Dict with dataset info
        """
        train_path = self.data_dir / 'train.csv'
        test_path = self.data_dir / 'test.csv'
        
        info = {
            'data_dir': str(self.data_dir),
            'has_train': train_path.exists(),
            'has_test': test_path.exists(),
            'train_rows': None,
            'test_rows': None,
            'train_columns': None,
            'test_columns': None
        }
        
        if train_path.exists():
            try:
                df = pd.read_csv(train_path, nrows=1)
                info['train_rows'] = len(pd.read_csv(train_path))
                info['train_columns'] = list(df.columns)
            except:
                pass
        
        if test_path.exists():
            try:
                df = pd.read_csv(test_path, nrows=1)
                info['test_rows'] = len(pd.read_csv(test_path))
                info['test_columns'] = list(df.columns)
            except:
                pass
        
        return info