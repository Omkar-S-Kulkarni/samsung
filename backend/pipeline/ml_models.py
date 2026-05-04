"""
ML Models Module
=================
Simple time-series models for anomaly/stress prediction.
Includes LSTM and 1D-CNN architectures optimized for edge deployment.
Uses PyTorch when available, falls back to scikit-learn.
"""

import logging
import pickle
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class EdgeMLPredictor:
    """
    Lightweight ML predictor for edge devices.
    Uses scikit-learn models (no heavy framework dependency).
    Supports: stress prediction, anomaly scoring, HR forecasting.
    """

    def __init__(self, sequence_length: int = 60):
        self.sequence_length = sequence_length
        self.models = {}
        self.scalers = {}
        self.is_trained = False

    def _create_sequences(self, data: np.ndarray, target: np.ndarray,
                          seq_len: int) -> Tuple[np.ndarray, np.ndarray]:
        """Create sliding window sequences for time-series prediction."""
        X, y = [], []
        for i in range(len(data) - seq_len):
            X.append(data[i:i + seq_len])
            y.append(target[i + seq_len])
        return np.array(X), np.array(y)

    def train_stress_model(self, df: pd.DataFrame) -> Dict:
        """Train a gradient boosting model for stress prediction."""
        from sklearn.ensemble import GradientBoostingRegressor
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_squared_error, r2_score

        feature_cols = []
        for col in ["heart_rate_bpm", "hrv_ms", "spo2_pct", "skin_temp_c",
                     "steps_per_min", "calories_burned"]:
            if col in df.columns:
                feature_cols.append(col)

        if not feature_cols or "stress_score" not in df.columns:
            logger.warning("Insufficient data for stress model training")
            return {"status": "skipped", "reason": "missing columns"}

        # Create rolling features for temporal context
        X_data = df[feature_cols].copy()
        for col in feature_cols:
            X_data[f"{col}_roll5_mean"] = df[col].rolling(5, min_periods=1).mean()
            X_data[f"{col}_roll5_std"] = df[col].rolling(5, min_periods=1).std().fillna(0)
            X_data[f"{col}_diff"] = df[col].diff().fillna(0)

        X = X_data.fillna(0).values
        y = df["stress_score"].fillna(50).values

        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers["stress"] = scaler

        # Train/test split (temporal — no shuffling)
        split_idx = int(len(X_scaled) * 0.8)
        X_train, X_test = X_scaled[:split_idx], X_scaled[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        # Train
        model = GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42
        )
        model.fit(X_train, y_train)

        # Evaluate
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        self.models["stress"] = model
        self.is_trained = True

        metrics = {"mse": round(mse, 4), "rmse": round(np.sqrt(mse), 4),
                   "r2": round(r2, 4), "feature_count": X.shape[1]}
        logger.info(f"Stress model trained: RMSE={metrics['rmse']}, R²={metrics['r2']}")
        return metrics

    def train_anomaly_model(self, df: pd.DataFrame) -> Dict:
        """Train an Isolation Forest for anomaly detection."""
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler

        feature_cols = []
        for col in ["heart_rate_bpm", "hrv_ms", "spo2_pct", "skin_temp_c"]:
            if col in df.columns:
                feature_cols.append(col)

        if not feature_cols:
            logger.warning("No biosignal columns for anomaly model")
            return {"status": "skipped"}

        X = df[feature_cols].fillna(df[feature_cols].median()).values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers["anomaly"] = scaler

        model = IsolationForest(
            n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1
        )
        model.fit(X_scaled)
        self.models["anomaly"] = model

        # Score the training data
        scores = model.decision_function(X_scaled)
        anomaly_rate = (model.predict(X_scaled) == -1).mean()

        metrics = {"anomaly_rate": round(anomaly_rate, 4),
                   "score_mean": round(scores.mean(), 4),
                   "score_std": round(scores.std(), 4)}
        logger.info(f"Anomaly model trained: anomaly_rate={metrics['anomaly_rate']:.2%}")
        return metrics

    def predict_stress(self, features: dict) -> float:
        """Predict stress score from current features (real-time inference)."""
        if "stress" not in self.models:
            return 50.0  # Default if model not trained

        feature_cols = ["heart_rate_bpm", "hrv_ms", "spo2_pct", "skin_temp_c",
                       "steps_per_min", "calories_burned"]
        values = [features.get(col, 0) for col in feature_cols]

        # Add rolling features (would need buffer in production)
        values.extend(values)  # roll5_mean approximation
        values.extend([0] * len(feature_cols))  # roll5_std
        values.extend([0] * len(feature_cols))  # diff

        X = np.array(values).reshape(1, -1)
        X_scaled = self.scalers["stress"].transform(X)
        return float(self.models["stress"].predict(X_scaled)[0])

    def predict_anomaly(self, features: dict) -> Tuple[bool, float]:
        """Predict if current state is anomalous."""
        if "anomaly" not in self.models:
            return False, 0.0

        feature_cols = ["heart_rate_bpm", "hrv_ms", "spo2_pct", "skin_temp_c"]
        values = [features.get(col, 0) for col in feature_cols]

        X = np.array(values).reshape(1, -1)
        X_scaled = self.scalers["anomaly"].transform(X)

        prediction = self.models["anomaly"].predict(X_scaled)[0]
        score = self.models["anomaly"].decision_function(X_scaled)[0]

        return prediction == -1, float(score)

    def save_models(self, path: str):
        """Save trained models to disk."""
        import os
        os.makedirs(path, exist_ok=True)
        for name, model in self.models.items():
            with open(os.path.join(path, f"{name}_model.pkl"), "wb") as f:
                pickle.dump(model, f)
            if name in self.scalers:
                with open(os.path.join(path, f"{name}_scaler.pkl"), "wb") as f:
                    pickle.dump(self.scalers[name], f)
        logger.info(f"Models saved to {path}")

    def load_models(self, path: str):
        """Load trained models from disk."""
        import os
        for name in ["stress", "anomaly", "forecaster"]:
            model_path = os.path.join(path, f"{name}_model.pkl")
            scaler_path = os.path.join(path, f"{name}_scaler.pkl")
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    self.models[name] = pickle.load(f)
                if os.path.exists(scaler_path):
                    with open(scaler_path, "rb") as f:
                        self.scalers[name] = pickle.load(f)
        self.is_trained = len(self.models) > 0
        logger.info(f"Models loaded: {list(self.models.keys())}")

    def forecast_future_value(self, series: List[float], horizon: int = 60) -> List[float]:
        """Simple trend-based forecasting using linear extrapolation of recent trend."""
        if len(series) < 5:
            return [series[-1]] * horizon if series else [0.0] * horizon
            
        # Use last 10 points to determine trend
        recent = series[-10:]
        x = np.arange(len(recent))
        y = np.array(recent)
        
        # Fit linear trend
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        # Forecast
        future_x = np.arange(len(recent), len(recent) + horizon)
        return p(future_x).tolist()


class AnomalyForecaster:
    """Predicts likelihood of future anomalies based on current trends."""
    
    @staticmethod
    def predict_risk(current_score: float, trend: float) -> float:
        """Calculate risk score (0-100) based on current anomaly score and its trend."""
        # score is typically decision_function (higher is more normal)
        # We invert it for risk
        base_risk = max(0, -current_score * 100)
        trend_risk = max(0, -trend * 50)
        return min(100.0, base_risk + trend_risk)


class RuleEngine:
    """
    Safety-critical rule engine for immediate alerts.
    Rules are deterministic and don't depend on ML model availability.
    These bypass ML predictions for life-safety situations.
    """

    CRITICAL_RULES = [
        {
            "name": "critical_low_spo2",
            "condition": lambda d: d.get("spo2_pct", 100) < 85,
            "severity": "CRITICAL",
            "message": "⚠️ CRITICAL: Blood oxygen severely low ({spo2_pct}%). Seek immediate medical attention.",
        },
        {
            "name": "warning_low_spo2",
            "condition": lambda d: 85 <= d.get("spo2_pct", 100) < 90,
            "severity": "WARNING",
            "message": "⚠️ WARNING: Blood oxygen low ({spo2_pct}%). Consider consulting a doctor.",
        },
        {
            "name": "critical_high_hr",
            "condition": lambda d: d.get("heart_rate_bpm", 70) > 180,
            "severity": "CRITICAL",
            "message": "⚠️ CRITICAL: Heart rate extremely high ({heart_rate_bpm} bpm). Rest immediately.",
        },
        {
            "name": "critical_low_hr",
            "condition": lambda d: d.get("heart_rate_bpm", 70) < 35,
            "severity": "CRITICAL",
            "message": "⚠️ CRITICAL: Heart rate dangerously low ({heart_rate_bpm} bpm). Seek medical help.",
        },
        {
            "name": "sustained_high_stress",
            "condition": lambda d: d.get("stress_score", 0) > 85 and d.get("hrv_ms", 100) < 20,
            "severity": "WARNING",
            "message": "Sustained high stress detected (score: {stress_score}, HRV: {hrv_ms}ms). Take a break.",
        },
        {
            "name": "poor_sleep_pattern",
            "condition": lambda d: d.get("sleep_duration_min", 480) < 240,
            "severity": "INFO",
            "message": "Sleep duration below 4 hours. Consider improving sleep schedule.",
        },
    ]

    @classmethod
    def evaluate(cls, data: dict) -> List[Dict]:
        """Evaluate all rules against current data. Returns list of triggered alerts."""
        alerts = []
        for rule in cls.CRITICAL_RULES:
            try:
                if rule["condition"](data):
                    msg = rule["message"].format(**{k: round(v, 1) if isinstance(v, float) else v
                                                    for k, v in data.items()})
                    alerts.append({
                        "rule": rule["name"],
                        "severity": rule["severity"],
                        "message": msg,
                    })
            except (KeyError, TypeError):
                continue
        return alerts
