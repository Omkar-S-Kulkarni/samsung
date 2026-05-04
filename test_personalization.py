import os
import sys
import pandas as pd
from datetime import datetime

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.health_coach import HealthCoach

def test_personalization():
    print("Testing Personalization Engine Integration...")
    config = PipelineConfig()
    config.personalization.enable_personalization = True
    
    coach = HealthCoach(config)
    user_id = "test_user_1"
    
    # Update goals to see if they save
    coach.personalization_engine.update_goals(user_id, ["fat_loss", "better_sleep"], "advanced")
    profile = coach.personalization_engine.get_profile(user_id)
    print(f"User Goals: {profile.primary_goals}")
    print(f"Fitness Level: {profile.fitness_level}")
    
    # Mock historical data to learn baseline
    print("\nLearning baselines...")
    hist_data = pd.DataFrame({
        "timestamp": pd.date_range(start="2026-05-01", periods=10, freq="1h"),
        "heart_rate_bpm": [60, 62, 59, 61, 65, 58, 60, 61, 63, 59],
        "hrv_ms": [80, 85, 82, 81, 79, 86, 83, 80, 82, 84],
        "computed_stress": [30, 32, 28, 35, 31, 29, 30, 33, 31, 30],
        "sleep_duration_min": [300, 320, 310, 330, 340, 310, 300, 320, 310, 330]
    })
    
    coach.personalization_engine.learn_baseline(user_id, hist_data)
    profile = coach.personalization_engine.get_profile(user_id)
    print("Baselines learned:")
    for metric, stats in profile.baselines.items():
        print(f"  {metric}: Mean={stats['mean']:.1f}, Std={stats['std']:.1f}")
        
    print("\nTesting Realtime Processing with Personalization...")
    current_sample = {
        "timestamp": datetime.now().isoformat(),
        "heart_rate_bpm": 85,  # High deviation from ~60
        "hrv_ms": 50,          # Low deviation from ~82
        "computed_stress": 55, # High deviation from ~30
        "sleep_duration_min": 240 # High negative deviation from ~320
    }
    
    # process_realtime requires user_id and sample
    result = coach.process_realtime(user_id, current_sample)
    
    cleaned = result.get("cleaned", {})
    print(f"\nUser State detected: {cleaned.get('user_state')}")
    strategy = cleaned.get("adaptive_strategy", {})
    print(f"Adaptive Tone: {strategy.get('tone')}")
    print(f"Focus Area: {strategy.get('focus_area')}")
    print(f"Prompt Modifier: {strategy.get('prompt_modifier')}")
    
    print("\nTest Complete.")

if __name__ == "__main__":
    test_personalization()
