"""Risk modeling and prediction."""

import os
import json
import pickle
from datetime import datetime
from typing import Dict, List, Tuple, Optional

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, classification_report
)

from risk_features import RiskFeatureEngine


class RiskModel:
    """Risk prediction model using scikit-learn."""

    MODEL_DIR = "risk_models"
    LATEST_MODEL_FILE = os.path.join(MODEL_DIR, "latest_model.pkl")
    LATEST_SCALER_FILE = os.path.join(MODEL_DIR, "latest_scaler.pkl")
    METADATA_FILE = os.path.join(MODEL_DIR, "model_metadata.json")

    def __init__(self):
        """Initialize model container."""
        self.model = None
        self.scaler = None
        self.metadata = None
        self.feature_names = RiskFeatureEngine.get_feature_names()
        
        # Ensure model directory exists
        os.makedirs(self.MODEL_DIR, exist_ok=True)

    def train(self, df: pd.DataFrame, force_retrain: bool = False) -> Dict:
        """
        Train the risk model.
        
        Args:
            df: Feature DataFrame from RiskFeatureEngine
            force_retrain: Whether to force retraining even if model exists
            
        Returns:
            Dict with training metrics
        """
        # Check if model exists and is reasonably recent
        if os.path.exists(self.LATEST_MODEL_FILE) and not force_retrain:
            model_age_hours = (datetime.utcnow().timestamp() - 
                             os.path.getmtime(self.LATEST_MODEL_FILE)) / 3600
            if model_age_hours < 24:
                # Model is fresh, load it instead
                self.load()
                return {"status": "loaded_existing", "model_age_hours": model_age_hours}

        # Filter for opportunities with known outcomes
        df_with_outcomes = df[
            (df['status'] == 'RECOVERED') |
            (df['status'] == 'LOST')
        ].copy()

        if len(df_with_outcomes) < 10:
            # Not enough data for training
            return {
                "status": "insufficient_data",
                "available_samples": len(df_with_outcomes),
                "required_samples": 10
            }

        # Create target: 1 if LOST, 0 if RECOVERED
        y = (df_with_outcomes['status'] == 'LOST').astype(int)
        
        # Use only feature columns
        X = df_with_outcomes[self.feature_names].copy()

        # Handle any NaN values
        X = X.fillna(X.median(numeric_only=True))

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train logistic regression model
        self.model = LogisticRegression(
            random_state=42,
            max_iter=1000,
            class_weight='balanced'  # Handle class imbalance
        )
        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]

        metrics = {
            "status": "trained",
            "train_size": len(X_train),
            "test_size": len(X_test),
            "training_timestamp": datetime.utcnow().isoformat(),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_pred_proba)) if len(np.unique(y_test)) > 1 else 0.0,
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(y_test, y_pred, output_dict=True, zero_division=0),
            "feature_names": self.feature_names,
            "model_type": "LogisticRegression",
            "dataset_info": {
                "total_samples": len(df),
                "outcomes_available": len(df_with_outcomes),
                "target_distribution": {
                    "LOST": int((y == 1).sum()),
                    "RECOVERED": int((y == 0).sum())
                }
            }
        }

        # Store model coefficients for explainability
        metrics["feature_importance"] = self._get_feature_importance()

        # Save model and metadata
        self.metadata = metrics
        self.save()

        return metrics

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """
        Predict loss probability for opportunities.
        
        Returns array of probabilities (0-1) for each opportunity.
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        X = df[self.feature_names].copy()
        X = X.fillna(X.median(numeric_only=True))
        
        X_scaled = self.scaler.transform(X)
        proba = self.model.predict_proba(X_scaled)[:, 1]
        
        return proba

    def save(self):
        """Save model and scaler to disk."""
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        
        with open(self.LATEST_MODEL_FILE, 'wb') as f:
            pickle.dump(self.model, f)
        
        with open(self.LATEST_SCALER_FILE, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        if self.metadata:
            with open(self.METADATA_FILE, 'w') as f:
                json.dump(self.metadata, f, indent=2)

    def load(self):
        """Load model and scaler from disk."""
        if not os.path.exists(self.LATEST_MODEL_FILE):
            raise FileNotFoundError(f"Model not found at {self.LATEST_MODEL_FILE}")
        
        with open(self.LATEST_MODEL_FILE, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(self.LATEST_SCALER_FILE, 'rb') as f:
            self.scaler = pickle.load(f)
        
        if os.path.exists(self.METADATA_FILE):
            with open(self.METADATA_FILE, 'r') as f:
                self.metadata = json.load(f)

    def _get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance based on model coefficients."""
        if self.model is None:
            return {}
        
        coef = self.model.coef_[0]
        importance = {}
        
        for name, coef_val in zip(self.feature_names, coef):
            importance[name] = float(abs(coef_val))
        
        # Normalize to 0-100
        max_importance = max(importance.values()) if importance.values() else 1
        for name in importance:
            importance[name] = (importance[name] / max_importance) * 100
        
        # Sort by importance
        importance = dict(sorted(
            importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return importance

    def get_top_features(self, top_n: int = 5) -> List[str]:
        """Get top N most important features."""
        if not self.metadata or 'feature_importance' not in self.metadata:
            return self.feature_names[:top_n]
        
        importance = self.metadata['feature_importance']
        return list(importance.keys())[:top_n]


class RiskScorer:
    """Convert model predictions to risk scores and levels."""

    @staticmethod
    def probability_to_score(probability: float) -> int:
        """
        Convert loss probability (0-1) to risk score (0-100).
        
        Args:
            probability: Loss probability from 0 to 1
            
        Returns:
            Risk score from 0 to 100
        """
        score = int(probability * 100)
        return max(0, min(100, score))

    @staticmethod
    def score_to_level(score: int) -> str:
        """
        Classify risk score into level.
        
        Args:
            score: Risk score from 0 to 100
            
        Returns:
            Risk level: LOW, MEDIUM, HIGH, or CRITICAL
        """
        if score < 25:
            return "LOW"
        elif score < 50:
            return "MEDIUM"
        elif score < 75:
            return "HIGH"
        else:
            return "CRITICAL"

    @staticmethod
    def calculate_expected_loss(amount: float, probability: float) -> float:
        """Calculate expected loss amount."""
        return amount * probability

    @staticmethod
    def calculate_priority_score(
        amount: float,
        probability: float,
        recoverability_score: float,
        age_days: int
    ) -> float:
        """
        Calculate priority score for opportunity.
        
        Considers:
        - Expected loss amount
        - Recoverability (higher recoverability = higher priority)
        - Urgency (older opportunities = higher priority)
        
        Returns score from 0 to 100.
        """
        expected_loss = amount * probability
        
        # Urgency increases with age (cap at 30 days)
        urgency = min(1.0, age_days / 30.0)
        
        # Recoverability factor (0-1)
        recov_factor = recoverability_score / 100.0
        
        # Priority = expected loss * recoverability * urgency factor
        # Normalized to 0-100
        priority_value = expected_loss * (0.5 + recov_factor * 0.5) * (0.5 + urgency * 0.5)
        
        # Normalize across typical ranges (approximate max expected loss)
        max_typical_loss = 50000  # 50K typical max
        normalized = min(100, (priority_value / max_typical_loss) * 100)
        
        return max(0, min(100, normalized))
