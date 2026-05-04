import os
import json
import logging
import time
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ADEO-API")

app = FastAPI(title="ADEO Health Intelligence API")

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize HealthCoach
config = PipelineConfig()
coach = HealthCoach(config)

class HealthSample(BaseModel):
    user_id: str = "default_user"
    heart_rate_bpm: float
    hrv_ms: float
    computed_stress: Optional[float] = 40.0
    total_steps_today: Optional[int] = 0

class GoalRequest(BaseModel):
    user_id: str
    category: str
    target: float
    unit: str
    urgency: int = 5

class FeedbackRequest(BaseModel):
    user_id: str
    rating: int
    comment: str
    topic: str

@app.get("/")
async def root():
    return {"status": "online", "engine": "ADEO Intelligence Pipeline"}

@app.post("/process")
async def process_metrics(sample: HealthSample):
    """Real-time processing with Digital Twin and Adaptive Coaching."""
    try:
        res = coach.process_realtime(sample.user_id, sample.dict())
        # Add twin summary and reward status to the response
        res["twin"] = coach.get_readiness_report(sample.user_id)
        res["rewards"] = coach.get_gamification_status(sample.user_id)
        return res
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    """Aggregate all pipeline state for the frontend."""
    profile = coach.personalization_engine.get_profile(user_id)
    twin_data = coach.get_readiness_report(user_id)
    
    # Calculate Unified Health Score (Readiness + Sleep + Activity)
    health_score = (twin_data.get("readiness_score", 70) * 0.6) + \
                   (profile.goal_summary.get("overall_progress", 60) * 0.4)
    
    # Determine Risk Level
    risk_level = "low"
    if health_score < 40: risk_level = "high"
    elif health_score < 65: risk_level = "medium"
    
    return {
        "user_id": user_id,
        "unified_score": round(health_score, 1),
        "state_summary": f"{twin_data.get('recovery_status', 'stable').capitalize()}: Recovery suggested" if health_score < 60 else "Stable: Performance optimal",
        "risk_level": risk_level,
        "goals": coach.personalization_engine.goals.get_goal_summary(user_id),
        "rewards": coach.get_gamification_status(user_id),
        "twin": twin_data,
        "plan": coach.get_daily_plan(user_id),
        "timestamp": time.strftime("%H:%M:%S"),
        "battery_mode": "AI-Performance" if twin_data.get("readiness_score", 0) > 30 else "Eco-Mode",
        "privacy": {
            "encryption": config.privacy.enable_encryption,
            "permissions": coach.personalization_engine.privacy._permissions
        }
    }

@app.post("/goals")
async def set_goal(req: GoalRequest):
    return coach.set_user_goal(req.user_id, req.category, req.target, req.unit, req.urgency)

@app.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    return coach.submit_user_feedback(req.user_id, req.rating, req.comment, req.topic)

@app.post("/simulate")
async def simulate_scenario(user_id: str, scenario: Dict):
    return coach.run_twin_simulation(user_id, scenario)

@app.get("/memory/{user_id}")
async def get_memory(user_id: str):
    """Retrieve RAG memories for the user."""
    return coach.personalization_engine.learning.get_learned_context(user_id)

@app.post("/privacy/permissions")
async def update_permissions(user_id: str, permissions: Dict):
    """Update privacy permissions (biometrics, location)."""
    for key, value in permissions.items():
        coach.personalization_engine.privacy.set_permission(key, value)
    return {"status": "updated", "permissions": coach.personalization_engine.privacy._permissions}

@app.post("/sync/trigger")
async def trigger_sync(user_id: str):
    """Manually trigger a sync with the 'phone'."""
    return coach.personalization_engine.sync.sync_now()

@app.get("/export/{user_id}")
async def export_data(user_id: str):
    return coach.export_user_data(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
