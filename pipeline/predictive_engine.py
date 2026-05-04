import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from .config import PipelineConfig
from .ml_models import EdgeMLPredictor, AnomalyForecaster

logger = logging.getLogger(__name__)

class PredictiveEngine:
    """Advanced predictive engine for health forecasting and risk assessment."""
    
    def __init__(self, config: PipelineConfig, ml_predictor: EdgeMLPredictor):
        self.config = config
        self.pred_cfg = config.prediction
        self.ml_predictor = ml_predictor
        self.anomaly_forecaster = AnomalyForecaster()

    def predict_fatigue(self, user_features: Dict) -> float:
        """Predict current and future fatigue level (0-100)."""
        fatigue_idx = user_features.get("fatigue_index", 50)
        hr_trend = user_features.get("hr_trend_30min", 70)
        
        # Simple heuristic: high cumulative load + elevated HR = higher fatigue
        fatigue_score = (fatigue_idx * 0.7 + (hr_trend / 200) * 30)
        return min(100.0, float(fatigue_score))

    def predict_stress_spike(self, stress_history: List[float]) -> Dict:
        """Predict potential stress spikes in the next hour."""
        if not stress_history:
            return {"is_spike_predicted": False, "predicted_max_stress": 50.0, "trend": "unknown"}
            
        forecast = self.ml_predictor.forecast_future_value(stress_history, horizon=60)
        max_forecast = max(forecast)
        
        is_spike = max_forecast > (stress_history[-1] + 20)
        return {
            "is_spike_predicted": bool(is_spike),
            "predicted_max_stress": round(float(max_forecast), 1),
            "trend": "rising" if forecast[-1] > forecast[0] else "stable"
        }

    def predict_sleep_quality(self, daily_load: float, current_stress: float) -> float:
        """Estimate tonight's sleep quality based on today's load and stress."""
        # High load + moderate stress = good deep sleep
        # Extreme stress = poor sleep
        base_quality = 80.0
        stress_penalty = max(0, (current_stress - 40) * 0.5)
        load_bonus = min(20, daily_load / 100) if current_stress < 60 else -10
        
        return max(0.0, min(100.0, float(base_quality - stress_penalty + load_bonus)))

    def detect_overtraining(self, acwr: float) -> Dict:
        """Detect overtraining risk using Acute:Chronic Workload Ratio."""
        low, high = self.pred_cfg.overtraining_acwr_range
        
        status = "optimal"
        if acwr > high:
            status = "overtraining_risk"
        elif acwr < low:
            status = "undertraining"
            
        return {
            "acwr": round(float(acwr), 2),
            "status": status,
            "is_risk": status == "overtraining_risk"
        }

    def estimate_recovery_time(self, current_hr: float, resting_hr: float) -> int:
        """Estimate minutes until HR returns to resting levels."""
        if current_hr <= resting_hr + 5:
            return 0
            
        excess_hr = current_hr - resting_hr
        # Simplified decay model
        minutes = int(excess_hr / self.pred_cfg.recovery_alpha / 10)
        return min(1440, minutes)

    def calculate_risk_score(self, features: Dict) -> float:
        """Aggregate various risk factors into a single score (0-100)."""
        anomaly_score = features.get("anomaly_score", 0.0)
        stress = features.get("computed_stress", 50.0)
        fatigue = features.get("fatigue_index", 50.0)
        acwr = features.get("acwr", 1.0)
        
        # Risk components
        anomaly_risk = (anomaly_score / 5) * 40
        stress_risk = (max(0, stress - 70) / 30) * 30
        fatigue_risk = (max(0, fatigue - 80) / 20) * 20
        overtraining_risk = 10 if (acwr > 1.5 or acwr < 0.5) else 0
        
        return min(100.0, float(anomaly_risk + stress_risk + fatigue_risk + overtraining_risk))

    def forecast_trends(self, history_df: pd.DataFrame, metrics: List[str]) -> Dict:
        """Forecast multiple metrics for the next hour."""
        forecasts = {}
        for metric in metrics:
            if metric in history_df.columns:
                series = history_df[metric].tail(60).tolist()
                forecasts[metric] = self.ml_predictor.forecast_future_value(series)
        return forecasts

    def run_prediction_pipeline(self, user_id: str, current_sample: Dict, history_df: pd.DataFrame) -> Dict:
        """Run the full prediction pipeline for a user."""
        if not self.pred_cfg.enable_prediction:
            return {}

        results = {}
        
        # 1. Fatigue
        results["fatigue"] = self.predict_fatigue(current_sample)
        
        # 2. Stress Spike
        stress_history = history_df["computed_stress"].tail(30).tolist() if not history_df.empty and "computed_stress" in history_df.columns else []
        results["stress_forecast"] = self.predict_stress_spike(stress_history)
        
        # 3. Sleep Quality
        daily_load = history_df["energy_expenditure_proxy"].sum() if not history_df.empty and "energy_expenditure_proxy" in history_df.columns else 0
        results["sleep_prediction"] = self.predict_sleep_quality(daily_load, current_sample.get("computed_stress", 50))
        
        # 4. Overtraining
        results["overtraining"] = self.detect_overtraining(current_sample.get("acwr", 1.0))
        
        # 5. Recovery
        results["recovery_time_min"] = self.estimate_recovery_time(
            current_sample.get("heart_rate_bpm", 70),
            current_sample.get("resting_hr", 60)
        )
        
        # 6. Risk Scoring
        results["risk_score"] = self.calculate_risk_score(current_sample)
        
        # 7. Anomaly Prediction (Likelihood of future anomaly)
        current_anomaly = current_sample.get("anomaly_score", 0.0)
        anomaly_trend = history_df["anomaly_score"].diff().tail(5).mean() if not history_df.empty and "anomaly_score" in history_df.columns else 0.0
        results["anomaly_likelihood"] = self.anomaly_forecaster.predict_risk(current_anomaly, anomaly_trend)
        
        # 8. Forecasting
        results["forecasts"] = self.forecast_trends(history_df, ["heart_rate_bpm", "computed_stress"])
        
        return results
