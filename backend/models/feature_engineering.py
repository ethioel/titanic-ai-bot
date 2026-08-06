from typing import Dict, List
import pandas as pd
import numpy as np


class FeatureEngineer:
    """Stateless feature transformer. No model state attached."""

    TITLE_MAP: Dict[str, str] = {
        "Mr": "Mr", "Miss": "Miss", "Mrs": "Mrs", "Master": "Master",
        "Dr": "Rare", "Rev": "Rare", "Col": "Rare", "Major": "Rare",
        "Lady": "Rare", "Countess": "Rare", "Capt": "Rare", "Don": "Rare",
        "Jonkheer": "Rare", "Sir": "Rare", "Mme": "Mrs", "Mlle": "Miss", "Ms": "Miss",
    }
    AGE_BINS: List[int] = [0, 12, 18, 35, 60, 100]
    AGE_LABELS: List[str] = ["Child", "Teen", "Adult", "Middle", "Senior"]

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw passenger DataFrame into engineered features."""
        df_fe = df.copy()

        # Family features
        df_fe["FamilySize"] = df_fe["SibSp"] + df_fe["Parch"] + 1
        df_fe["IsAlone"] = (df_fe["FamilySize"] == 1).astype(int)

        # Title extraction (vectorized)
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

        # ── Advanced features for higher accuracy ──
        # Deck from Cabin first letter
        if "Cabin" in df_fe.columns:
            df_fe["Deck"] = df_fe["Cabin"].str[0].fillna("U")
        else:
            df_fe["Deck"] = "U"

        # Ticket frequency (group size proxy)
        if "Ticket" in df_fe.columns:
            ticket_counts = df_fe["Ticket"].value_counts()
            df_fe["TicketFreq"] = df_fe["Ticket"].map(ticket_counts).fillna(1)
        else:
            df_fe["TicketFreq"] = 1

        # Fare per person (catches shared tickets)
        df_fe["FarePerPerson"] = df_fe["Fare"] / df_fe["FamilySize"].replace(0, 1)

        # Age × Class interaction
        df_fe["AgeClass"] = df_fe["Age"].fillna(30) * df_fe["Pclass"]

        # IsMother (high survival group: women with children)
        df_fe["IsMother"] = (
            (df_fe["Sex"] == "female")
            & (df_fe["Age"] > 18)
            & (df_fe["Parch"] > 0)
            & (df_fe.get("Title", "") != "Miss")
        ).astype(int)

        # IsChild (children had high priority)
        df_fe["IsChild"] = (df_fe["Age"].fillna(99) < 16).astype(int)

        return df_fe
