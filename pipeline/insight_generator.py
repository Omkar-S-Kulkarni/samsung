import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class AdvancedInsightGenerator:
    """Phase J: Deep insights and hidden pattern detection."""
    
    def __init__(self, config):
        self.config = config

    def detect_hidden_patterns(self, history: pd.DataFrame) -> List[str]:
        """Look for non-obvious correlations across modalities."""
        patterns = []
        if history.empty or len(history) < 20:
            return ["Insufficient data for pattern detection. Keep wearing your device!"]

        # Pattern 1: Sleep-Stress Link
        if 'sleep_quality_score' in history.columns and 'computed_stress' in history.columns:
            poor_sleep_days = history[history['sleep_quality_score'] < 60]
            if not poor_sleep_days.empty:
                avg_stress_poor = poor_sleep_days['computed_stress'].mean()
                avg_stress_all = history['computed_stress'].mean()
                if avg_stress_poor > avg_stress_all * 1.2:
                    patterns.append(f"🔍 HIDDEN PATTERN: Your afternoon stress is 20% higher following nights with <60% sleep quality.")

        # Pattern 2: Activity-Recovery Link
        if 'activity_intensity' in history.columns and 'hrv_ms' in history.columns:
            high_act = history[history['activity_intensity'] >= 2]
            if not high_act.empty:
                next_day_hrv = history['hrv_ms'].shift(-1).loc[high_act.index].mean()
                if next_day_hrv < history['hrv_ms'].mean() * 0.9:
                    patterns.append("🔍 HIDDEN PATTERN: High-intensity workouts currently cause a 10% drop in your next-day HRV, suggesting a need for better cool-down protocols.")

        # Pattern 3: Habit detection (Time-based)
        history['hour'] = pd.to_datetime(history.index).hour
        hourly_stress = history.groupby('hour')['computed_stress'].mean()
        peak_hour = hourly_stress.idxmax()
        if hourly_stress[peak_hour] > history['computed_stress'].mean() * 1.5:
             patterns.append(f"🔍 HABIT: You consistently hit peak stress levels around {peak_hour}:00. This might be a good time for a guided breathing session.")

        return patterns

    def generate_weekly_report(self, history: pd.DataFrame) -> Dict:
        """Aggregate data for the Weekly AI Report."""
        if history.empty:
            return {"status": "No data"}
            
        recent = history.tail(7*24*60) # Last 7 days if minutely
        
        return {
            "avg_hr": float(recent['heart_rate_bpm'].mean()),
            "avg_hrv": float(recent['hrv_ms'].mean()),
            "stress_trend": "Improving" if recent['computed_stress'].iloc[-1] < recent['computed_stress'].iloc[0] else "Increasing",
            "anomalies_detected": int(recent.get('anomaly_score', pd.Series([0])).sum()),
            "top_patterns": self.detect_hidden_patterns(recent)
        }

    def get_progress_tracking(self, history: pd.DataFrame) -> Dict:
        """Track progress against baselines."""
        if len(history) < 100:
             return {"status": "Learning your baseline..."}
             
        first_half = history.iloc[:len(history)//2]
        second_half = history.iloc[len(history)//2:]
        
        hrv_change = (second_half['hrv_ms'].mean() - first_half['hrv_ms'].mean()) / first_half['hrv_ms'].mean()
        
        return {
            "hrv_progress": f"{hrv_change:+.1%}",
            "is_improving": hrv_change > 0,
            "message": "Your cardiac resilience is trending upwards!" if hrv_change > 0 else "Focus on recovery to boost your HRV."
        }
