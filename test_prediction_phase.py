import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.health_coach import HealthCoach

def test_prediction_phase():
    print("=" * 60)
    print("Testing Phase C: Prediction Integration")
    print("=" * 60)
    
    config = PipelineConfig()
    config.prediction.enable_prediction = True
    coach = HealthCoach(config)
    user_id = "predictive_user"
    
    # 1. Create a history with rising stress and high activity
    print("\n[1] Creating user history...")
    timestamps = [datetime.now() - timedelta(minutes=i) for i in range(120, 0, -1)]
    history_df = pd.DataFrame({
        "timestamp": timestamps,
        "user_id": [user_id] * 120,
        "heart_rate_bpm": np.linspace(70, 110, 120), # Rising HR
        "hrv_ms": np.linspace(60, 30, 120),           # Dropping HRV
        "computed_stress": np.linspace(30, 75, 120),  # Rising stress
        "energy_expenditure_proxy": [2.5] * 120,      # High activity
        "steps_per_min": [100] * 120,
        "anomaly_score": [0.1] * 115 + [0.5, 0.8, 1.2, 1.5, 2.0], # Rising anomaly score
        "acwr": [1.4] * 120 # High ACWR
    })
    
    # Inject into coach memory
    coach.feature_data = history_df
    
    # 2. Process real-time sample
    print("[2] Processing real-time sample...")
    current_sample = {
        "timestamp": datetime.now().isoformat(),
        "heart_rate_bpm": 115,
        "hrv_ms": 25,
        "computed_stress": 80,
        "energy_expenditure_proxy": 3.0,
        "steps_per_min": 120,
        "resting_hr": 60,
        "anomaly_score": 2.5,
        "acwr": 1.6,
        "fatigue_index": 85.0
    }
    
    result = coach.process_realtime(user_id, current_sample)
    
    # 3. Verify predictions
    predictions = result.get("predictions", {})
    print("\n--- Prediction Results ---")
    print(f"Fatigue Prediction: {predictions.get('fatigue'):.1f}")
    print(f"Stress Spike Forecast: {predictions.get('stress_forecast')}")
    print(f"Sleep Quality Prediction: {predictions.get('sleep_prediction'):.1f}")
    print(f"Overtraining Status: {predictions.get('overtraining')}")
    print(f"Recovery Time Estimation: {predictions.get('recovery_time_min')} mins")
    print(f"Risk Score: {predictions.get('risk_score'):.1f}")
    print(f"Anomaly Likelihood: {predictions.get('anomaly_likelihood'):.1f}")
    
    # Check if forecasts exist
    forecasts = predictions.get("forecasts", {})
    print(f"\n--- Forecasts (Next 60 mins) ---")
    for metric, values in forecasts.items():
        print(f"{metric}: Start={values[0]:.1f}, End={values[-1]:.1f}")
        
    print("\n[3] Verification complete.")

if __name__ == "__main__":
    test_prediction_phase()
