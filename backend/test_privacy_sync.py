import logging
import os
import json
from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_phase_m_n():
    logger.info("Starting Verification for Phase M (Privacy) and Phase N (Sync)...")
    
    config = PipelineConfig()
    coach = HealthCoach(config)
    user_id = "privacy_test_user"
    
    # 1. Test Privacy: Encryption (Phase M)
    logger.info("\n[1] Testing Data Encryption...")
    coach.set_user_goal(user_id, "sleep", 8, "hours", 6)
    
    # Check if the profile on disk is encrypted
    profile_path = os.path.join(config.personalization.storage_dir, f"{user_id}_profile.json")
    if os.path.exists(profile_path):
        with open(profile_path, "rb") as f:
            raw_content = f.read()
            try:
                # Attempt to parse as JSON. If it fails, it's likely encrypted (binary)
                json.loads(raw_content)
                logger.error("❌ Profile is NOT encrypted on disk!")
            except:
                logger.info("✅ Profile is encrypted on disk (non-JSON binary detected).")
    
    # 2. Test Privacy: Permission Control (Phase M)
    logger.info("\n[2] Testing Permission Blocking...")
    # Deny biometric permission
    coach.set_privacy_permission(user_id, "biometrics", False)
    
    sample = {"heart_rate_bpm": 80}
    res = coach.process_realtime(user_id, sample)
    if res.get("status") == "blocked":
        logger.info("✅ Biometric processing successfully blocked by privacy filter.")
    else:
        logger.error(f"❌ Processing was NOT blocked! Result: {res}")
        
    # Re-allow for further tests
    coach.set_privacy_permission(user_id, "biometrics", True)
    
    # 3. Test Sync: Offline-First Queue (Phase N)
    logger.info("\n[3] Testing Sync Queue...")
    coach.set_user_goal(user_id, "active_minutes", 60, "min", 0)
    
    sync_queue_path = os.path.join(config.data_dir, "sync_queue.json")
    if os.path.exists(sync_queue_path):
        with open(sync_queue_path, "r") as f:
            queue = json.load(f)
            logger.info(f"✅ Sync queue has {len(queue)} pending actions.")
    else:
        logger.error("❌ Sync queue not found!")

    # 4. Test Sync: Task Offloading (Phase N)
    logger.info("\n[4] Testing Task Offloading Logic...")
    # Simulate low battery
    coach.battery_manager.battery_level = 15 # Below 30% threshold
    
    # The coach should try to offload
    # (Since phone endpoint doesn't exist, it will fallback to local, but we can check logs)
    logger.info("Triggering high-complexity task with low battery...")
    coach.process_realtime(user_id, {"heart_rate_bpm": 120, "anomaly_score": 5.0})
    
    # 5. Test Visibility: Data Export (Phase M)
    logger.info("\n[5] Testing User Data Visibility...")
    export = coach.export_user_data(user_id)
    if export["status"] == "success":
        logger.info(f"✅ Data export successful. Profile ID: {export['data']['profile']['user_id']}")
    else:
        logger.error(f"❌ Data export failed: {export}")

    logger.info("\nVerification Complete!")

if __name__ == "__main__":
    test_phase_m_n()
