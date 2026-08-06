"""
Pure feature engineering pipeline.
Fits into: backend/models/feature_engineering.py
"""
from typing import Dict, List
import pandas as pd
import numpy as np


class FeatureEngineer:
    """Stateless feature transformer. No ML model state attached."""

    TITLE_MAP: Dict[str, str] = {
        "Mr": "Mr", "Miss": "Miss", "Mrs": "Mrs", "Master": "Master",
        "Dr": "Rare", "Rev": "Rare", "Col": "Rare", "Major": "Rare",
        "Lady": "Rare", "Countess": "Rare", "Capt": "Rare", "Don": "Rare",
        "Jonkheer": "Rare", "Sir": "Rare", "Mme": "Mrs", "Mlle": "Miss", "Ms": "Miss",
    }
    AGE_BINS: List[int] = [0, 12, 18, 35, 60, 100]
    AGE_LABELS: List[str] = ["Child", "Teen", "Adult", "Middle", "Senior"]

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform raw passenger DataFrame into engineered features.
        Pure function — does not mutate input.
        """
        df_fe = df.copy()

        # Family features
        df_fe["FamilySize"] = df_fe["SibSp"] + df_fe["Parch"] + 1
        df_fe["IsAlone"] = (df_fe["FamilySize"] == 1).astype(int)

        # Title extraction (vectorized, robust)
        if "Name" in df_fe.columns:
            names = df_fe["Name"].astype(str)
            titles = (
                names.str.split(",", n=1, expand=True)[1]
                .str.split(".", n=1, expand=True)[0]
                .str.strip()
                .map(self.TITLE_MAP)
                .fillna("Rare")
            )
            df_fe["Title"] = titles

        # Age binning
        if "Age" in df_fe.columns:
            median_age = df_fe["Age"].median() if df_fe["Age"].notna().any() else 30.0
            df_fe["AgeBin"] = pd.cut(
                df_fe["Age"].fillna(median_age),
                bins=self.AGE_BINS,
                labels=self.AGE_LABELS,
            )

        # Fare binning
        if "Fare" in df_fe.columns and df_fe["Fare"].notna().any():
            median_fare = df_fe["Fare"].median() if df_fe["Fare"].notna().any() else 32.0
            try:
                df_fe["FareBin"] = pd.qcut(
                    df_fe["Fare"].fillna(median_fare),
                    q=4,
                    labels=["Low", "Medium", "High", "Very High"],
                )
            except ValueError:
                df_fe["FareBin"] = "Medium"

        return df_fe
