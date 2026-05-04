import logging
from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_phase_k_l():
    logger.info("Starting Verification for Phase K (Goals) and Phase L (Learning)...")
    
    config = PipelineConfig()
    coach = HealthCoach(config)
    user_id = "test_user_kl"
    
    # 1. Test Goal Setting (Phase K)
    logger.info("\n[1] Testing Goal Setting...")
    res = coach.set_user_goal(user_id, "step_count", 10000, "steps", 2000)
    logger.info(f"Goal set result: {res}")
    
    # 2. Test Daily Plan (Phase K)
    logger.info("\n[2] Testing Daily Plan Generation...")
    plan = coach.get_daily_plan(user_id)
    logger.info(f"Daily Plan Focus: {plan['focus_area']}")
    for act in plan['activities']:
        logger.info(f"  - {act['name']} ({act['time']})")
        
    # 3. Test Progress Tracking and Rewards (Phase K)
    logger.info("\n[3] Testing Progress Tracking & Rewards...")
    
    # Simulate historical data to learn baseline
    import pandas as pd
    history_df = pd.DataFrame([
        {"user_id": user_id, "heart_rate_bpm": 60, "hrv_ms": 50, "computed_stress": 40, "steps_per_min": 5, "timestamp": datetime.now()} 
        for _ in range(10)
    ])
    coach.personalization_engine.learn_baseline(user_id, history_df)
    
    # Simulate data update
    sample = {
        "heart_rate_bpm": 75,
        "steps_per_min": 10,
        "total_steps_today": 5500, # 55% progress
        "stress_score": 40
    }
    coach.process_realtime(user_id, sample)
    
    rewards = coach.get_gamification_status(user_id)
    logger.info(f"Points: {rewards['points']}, Level: {rewards['level']}, Badges: {rewards['badge_count']}")
    
    # 4. Test User Feedback and Learning (Phase L)
    logger.info("\n[4] Testing Feedback Capture & Learning...")
    coach.submit_user_feedback(
        user_id, 
        "insight_001", 
        rating=5, 
        comment="Great advice on steps!", 
        topics=["activity", "goals"]
    )
    
    # Generate another feedback to reach threshold (min 5)
    for i in range(4):
        coach.submit_user_feedback(user_id, f"insight_00{i+2}", rating=5, topics=["activity"])
        
    # Check learned context
    profile = coach.personalization_engine.get_profile(user_id)
    learned = coach.personalization_engine.learning.get_learned_context(user_id)
    logger.info(f"Learned Context: {learned}")
    
    if learned['modifiers']:
        logger.info(f"Dynamic Prompt Modifiers: {learned['modifiers']}")
    
    # 5. Test Dynamic Plan Adjustment (Phase K)
    logger.info("\n[5] Testing Dynamic Plan Adjustment (Stress scenario)...")
    stress_sample = {
        "heart_rate_bpm": 110,
        "hrv_ms": 15, # Low HRV -> stress
        "computed_stress": 85,
        "total_steps_today": 6000
    }
    coach.process_realtime(user_id, stress_sample)
    
    updated_plan = coach.get_daily_plan(user_id)
    logger.info(f"Updated Plan Focus: {updated_plan['focus_area']}")
    
    logger.info("\nVerification Complete!")

if __name__ == "__main__":
    test_phase_k_l()
