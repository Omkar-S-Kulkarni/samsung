import os
import sys
import json
from typing import Dict

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig

def test_battery_optimization():
    print("=" * 60)
    print("Testing Phase H: Battery + Edge Optimization")
    print("=" * 60)
    
    config = PipelineConfig()
    coach = HealthCoach(config)
    engine = coach.intelligent_engine
    
    # 1. Test Dynamic Sampling Intervals
    print("\n[1] Testing Dynamic Sampling Intervals...")
    print(f"Battery 100% -> Interval: {coach._get_dynamic_interval(100)}s")
    print(f"Battery 25%  -> Interval: {coach._get_dynamic_interval(25)}s")
    print(f"Battery 10%  -> Interval: {coach._get_dynamic_interval(10)}s")
    
    assert coach._get_dynamic_interval(100) == 60
    assert coach._get_dynamic_interval(25) == 300
    assert coach._get_dynamic_interval(10) == 900
    
    # 2. Test Battery-Aware Agent Routing & Model Switching
    print("\n[2] Testing Adaptive Model & Agent Switching...")
    health_data = {"heart_rate_bpm": 70, "computed_stress": 30}
    
    # CASE: Battery 100% (Normal)
    agents_100, model_100 = engine._apply_battery_logic(100, ["safety", "analysis", "coaching"])
    print(f"Battery 100%: Agents: {agents_100}, Model: {model_100}")
    assert "coaching" in agents_100
    assert model_100 == config.model.llm_model_reasoning # 12b
    
    # CASE: Battery 25% (Low Power)
    agents_25, model_25 = engine._apply_battery_logic(25, ["safety", "analysis", "coaching"])
    print(f"Battery 25%: Agents: {agents_25}, Model: {model_25}")
    assert "coaching" not in agents_25 # Coaching disabled in low power
    assert model_25 == config.model.llm_model_name # 4b
    
    # CASE: Battery 10% (Critical)
    agents_10, model_10 = engine._apply_battery_logic(10, ["safety", "analysis", "coaching"])
    print(f"Battery 10%: Agents: {agents_10}, Model: {model_10}")
    assert agents_10 == [] # Empty list triggers fallback
    
    # 3. Test Integrated Flow
    print("\n[3] Testing Integrated Flow...")
    # Simulate a jump that triggers inference but at critical battery
    sample = {"heart_rate_bpm": 100, "computed_stress": 60}
    res = coach.process_realtime("user_1", sample, battery_level=10)
    print(f"Battery 10% Insight Source: {res['fusion'].get('source', 'unknown')}")
    # It should hit fallback and we added 'Deterministic fallback' in Phase G
    assert "Deterministic fallback" in res['insight']

    print("\n[4] Verification complete.")

if __name__ == "__main__":
    test_battery_optimization()
