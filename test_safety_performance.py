import os
import sys
import json
import time
from typing import Dict

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.health_coach import HealthCoach
from pipeline.intelligent_engine import IntelligentHealthEngine
from pipeline.config import PipelineConfig

def test_safety_and_performance():
    print("=" * 60)
    print("Testing Phase F & G: Safety, Trust, and Performance")
    print("=" * 60)
    
    config = PipelineConfig()
    coach = HealthCoach(config)
    user_id = "test_user_fg"
    
    # 1. Test Emergency Detection
    print("\n[1] Testing Emergency Detection...")
    emergency_data = {
        "heart_rate_bpm": 170,
        "activity_intensity": 0, # Sedentary but high HR
        "spo2_pct": 80 # Hypoxia
    }
    res = coach.process_realtime(user_id, emergency_data)
    alerts = res.get('alerts', [])
    print(f"Alerts for HR 170 (sedentary): {alerts}")
    assert any("160 bpm" in a['message'] for a in alerts)
    
    # 2. Test Response Caching
    print("\n[2] Testing Response Caching...")
    engine = coach.intelligent_engine
    health_data = {"heart_rate_bpm": 70, "computed_stress": 30, "hrv_ms": 50, "activity_intensity": 1}
    
    # First run (Cache Miss)
    t0 = time.time()
    res1 = engine.generate_intelligent_response("How is my health?", health_data)
    lat1 = (time.time() - t0) * 1000
    print(f"Run 1 (Miss) Latency: {lat1:.1f}ms")
    
    # Second run (Cache Hit - identical data)
    t0 = time.time()
    res2 = engine.generate_intelligent_response("How is my health?", health_data)
    lat2 = (time.time() - t0) * 1000
    print(f"Run 2 (Hit) Latency: {lat2:.1f}ms")
    assert res2['metadata'].get('source') == 'cache'
    assert lat2 < lat1 / 10 # Cache should be significantly faster
    
    # Third run (Cache Hit - similar data within bucket)
    health_data_similar = {"heart_rate_bpm": 72, "computed_stress": 32, "hrv_ms": 55, "activity_intensity": 1}
    t0 = time.time()
    res3 = engine.generate_intelligent_response("How is my health?", health_data_similar)
    lat3 = (time.time() - t0) * 1000
    print(f"Run 3 (Bucket Hit) Latency: {lat3:.1f}ms")
    assert res3['metadata'].get('source') == 'cache'

    # 3. Test Event-Triggered Inference
    print("\n[3] Testing Event-Triggered Inference...")
    # Stable data should skip inference
    stable_data = {"heart_rate_bpm": 70, "computed_stress": 30}
    coach.process_realtime(user_id, stable_data) # Populate last_data
    
    stable_data_2 = {"heart_rate_bpm": 72, "computed_stress": 31}
    res_stable = coach.process_realtime(user_id, stable_data_2)
    print(f"Stable data - Insight generated? {'Yes' if res_stable.get('insight') else 'No'}")
    assert res_stable.get('insight') is None
    
    # Large jump should trigger inference
    jump_data = {"heart_rate_bpm": 95, "computed_stress": 60}
    res_jump = coach.process_realtime(user_id, jump_data)
    print(f"Jump data - Insight generated? {'Yes' if res_jump.get('insight') else 'No'}")
    assert res_jump.get('insight') is not None

    # 4. Test Explainability & Transparency
    print("\n[4] Testing Explainability & Transparency...")
    if res_jump.get('insight'):
        insight_text = res_jump['insight']
        print("Insight Snippet:")
        print(insight_text[:200] + "...")
        assert "💡 WHY THIS ADVICE?" in insight_text
        assert "🔍 DATA SOURCES" in insight_text
        assert "Disclaimer" in insight_text

    print("\n[5] Verification complete.")

if __name__ == "__main__":
    test_safety_and_performance()
