import logging
import pandas as pd
from datetime import datetime
from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_digital_twin():
    logger.info("Starting Verification for Phase 🧬 (Digital Twin)...")
    
    config = PipelineConfig()
    config.sync.enable_sync = False
    config.sync.enable_task_offloading = False
    coach = HealthCoach(config)
    user_id = "twin_test_user"
    
    # 1. Initialize Twin with Baseline
    logger.info("\n[1] Initializing Digital Twin...")
    history_df = pd.DataFrame([
        {"user_id": user_id, "heart_rate_bpm": 60, "hrv_ms": 55, "computed_stress": 30, "timestamp": datetime.now()} 
        for _ in range(20)
    ])
    coach.personalization_engine.learn_baseline(user_id, history_df)
    
    # Update with current data
    sample = {"heart_rate_bpm": 65, "hrv_ms": 58, "total_steps_today": 8000}
    coach.process_realtime(user_id, sample)
    
    report = coach.get_readiness_report(user_id)
    logger.info(f"✅ Initial Twin State: Readiness={report['readiness_score']:.1f}, Status={report['recovery_status']}")

    # 2. Test 'What-If' Simulation
    logger.info("\n[2] Testing 'What-If' Scenario (Less sleep, More load)...")
    scenario = {
        "name": "Bad Night + Heavy Gym",
        "sleep_delta": -2.5, # 2.5 hours less sleep
        "extra_load": 40.0
    }
    sim_res = coach.run_twin_simulation(user_id, scenario)
    logger.info(f"Predicted Readiness after scenario: {sim_res['predicted_readiness']}")
    logger.info(f"Impact Assessment: {sim_res['impact_assessment']}")
    logger.info(f"Confidence Score: {sim_res['confidence']}")

    # 3. Test Workout Tradeoff
    logger.info("\n[3] Testing Workout Feasibility...")
    # Scenario: High intensity workout while readiness is low (simulated)
    # Manually lowering readiness for test
    coach.personalization_engine.twin.get_twin_state(user_id).readiness_score = 35.0
    
    tradeoff = coach.analyze_workout_feasibility(user_id, intensity=85) # High intensity
    logger.info(f"Recommendation for intense workout: {tradeoff['recommendation']}")
    logger.info(f"Reason: {tradeoff['reason']}")
    
    # 4. Test LLM Integration (Inference with Twin Context)
    logger.info("\n[4] Testing LLM Integration with Twin Context...")
    # This will trigger an inference that includes twin_summary in the metrics
    res = coach.process_realtime(user_id, {"heart_rate_bpm": 110, "hrv_ms": 25})
    # Check if twin_summary is in the processed metrics
    if "twin_summary" in res:
        logger.info("✅ Digital Twin summary successfully injected into processing pipeline.")

    logger.info("\nVerification Complete!")

if __name__ == "__main__":
    test_digital_twin()
