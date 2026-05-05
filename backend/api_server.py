import os
import json
import logging
import time
import numpy as np
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
    spO2: Optional[float] = 98.0
    activity_intensity: Optional[float] = 0.0
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

class SimulationRequest(BaseModel):
    """Request body for what-if scenario simulation."""
    user_id: str = "default_user"
    sleep_delta: float = 0.0        # hours change (e.g., -2 means 2 hrs less sleep)
    extra_load: float = 0.0         # workout intensity 0-100
    stress_modifier: float = 0.0    # stress change -50 to +50
    hydration_level: float = 1.0    # 0-1 hydration factor
    scenario_name: str = "custom"

class InterventionRequest(BaseModel):
    """Request body for intervention impact prediction."""
    user_id: str = "default_user"
    suggestion: str                 # e.g., "sleep more", "meditate", "walk"


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


# =============================================================================
# 🧬 DIGITAL TWIN DASHBOARD ENDPOINTS
# =============================================================================

@app.get("/twin/{user_id}")
async def get_twin_dashboard(user_id: str):
    """
    Full Digital Twin dashboard data.
    Returns: twin state, baseline comparison, confidence score, model info.
    """
    try:
        twin_state = coach.get_readiness_report(user_id)
        profile = coach.personalization_engine.get_profile(user_id)

        # Current metrics (from last known state or defaults)
        current_metrics = {
            "heart_rate_bpm": 72.0,
            "hrv_ms": 52.0,
            "spo2_pct": 98.0,
            "computed_stress": 40.0,
            "sleep_duration_min": 420.0,
            "steps_per_min": 80.0,
        }

        # Build baseline vs current vs optimal comparison
        optimal_targets = {
            "heart_rate_bpm":     {"optimal": 65.0,  "unit": "bpm", "label": "Resting HR",  "lower_is_better": True},
            "hrv_ms":             {"optimal": 70.0,  "unit": "ms",  "label": "HRV",          "lower_is_better": False},
            "spo2_pct":           {"optimal": 99.0,  "unit": "%",   "label": "SpO2",         "lower_is_better": False},
            "computed_stress":    {"optimal": 20.0,  "unit": "",    "label": "Stress Score", "lower_is_better": True},
            "sleep_duration_min": {"optimal": 480.0, "unit": "min", "label": "Sleep",        "lower_is_better": False},
            "steps_per_min":      {"optimal": 100.0, "unit": "spm", "label": "Activity",     "lower_is_better": False},
        }

        baseline_comparison = []
        baselines = profile.baselines
        for key, meta in optimal_targets.items():
            current_val = current_metrics.get(key, 0.0)
            baseline_val = baselines.get(key, {}).get("mean", current_val)
            optimal_val = meta["optimal"]

            if meta["lower_is_better"]:
                score = max(0.0, min(100.0, 100.0 - abs(current_val - optimal_val) / max(optimal_val, 1) * 100.0))
            else:
                score = max(0.0, min(100.0, (current_val / max(optimal_val, 1)) * 100.0))

            baseline_comparison.append({
                "key": key,
                "label": meta["label"],
                "unit": meta["unit"],
                "current": round(current_val, 1),
                "baseline": round(float(baseline_val), 1),
                "optimal": round(optimal_val, 1),
                "score": round(score, 1),
                "lower_is_better": meta["lower_is_better"],
            })

        # Radar chart data (Current vs Optimal, 0-100 normalized)
        readiness = twin_state.get("readiness_score", 75.0)
        fatigue = twin_state.get("fatigue_index", 20.0)
        resilience = twin_state.get("stress_resilience", 75.0)

        radar_data = [
            {"dimension": "Readiness",   "current": round(readiness, 1),          "optimal": 90},
            {"dimension": "Recovery",    "current": round(100.0 - fatigue, 1),     "optimal": 85},
            {"dimension": "Resilience",  "current": round(resilience, 1),          "optimal": 88},
            {"dimension": "Sleep",       "current": 75.0,                          "optimal": 90},
            {"dimension": "Activity",    "current": 60.0,                          "optimal": 80},
            {"dimension": "HRV Balance", "current": 65.0,                          "optimal": 85},
        ]

        # Confidence score using ConfidenceScorer
        from pipeline.confidence_scorer import ConfidenceScorer
        scorer = ConfidenceScorer()
        confidence_result = scorer.score_health_insight(
            insight=f"Readiness: {readiness:.1f}, Fatigue: {fatigue:.1f}, Resilience: {resilience:.1f}",
            health_metrics=current_metrics,
            data_completeness=0.85
        )

        # Intervention impacts (ranked)
        suggestions = ["sleep more", "rest", "walk", "meditation", "hydrate", "breathwork", "cold shower"]
        interventions = []
        for s in suggestions:
            impact = coach.personalization_engine.twin_simulator.predict_intervention_impact(user_id, s)
            interventions.append({
                "name": s.title(),
                "impact": round(impact * 100, 1),
                "category": "recovery" if s in ["sleep more", "rest"] else "wellness",
            })
        interventions.sort(key=lambda x: x["impact"], reverse=True)

        # Model info
        model_info = {
            "core_model": "PhysiologicalTwin",
            "simulation_engine": f"TwinSimulator ({config.digital_twin.uncertainty_method.replace('_', ' ').title()}, 50 iters)",
            "llm_realtime": config.model.llm_model_name,
            "llm_reasoning": config.model.llm_model_reasoning,
            "embedding_model": config.model.embedding_model,
            "ml_models": ["GradientBoostingRegressor", "IsolationForest", "EdgeMLPredictor"],
        }

        return {
            "user_id": user_id,
            "twin_state": twin_state,
            "baseline_comparison": baseline_comparison,
            "radar_data": radar_data,
            "confidence": {
                "score": round(confidence_result["overall_confidence"] * 100, 1),
                "level": confidence_result["confidence_level"],
                "component_scores": confidence_result["component_scores"],
            },
            "interventions": interventions,
            "model_info": model_info,
            "last_sync": time.strftime("%H:%M:%S"),
            "twin_version": "v2.1-MC",
        }

    except Exception as e:
        logger.error(f"Twin dashboard error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/twin/simulate")
async def simulate_twin_scenario(req: SimulationRequest):
    """
    Run a Monte Carlo what-if simulation using TwinSimulator.
    Returns predicted readiness, fatigue, confidence, impact assessment.
    """
    try:
        scenario = {
            "sleep_delta": req.sleep_delta,
            "extra_load": req.extra_load,
            "stress_modifier": req.stress_modifier,
            "hydration_level": req.hydration_level,
            "name": req.scenario_name,
        }
        result = coach.run_twin_simulation(req.user_id, scenario)
        feasibility = coach.analyze_workout_feasibility(req.user_id, int(req.extra_load))
        current = coach.get_readiness_report(req.user_id)

        readiness_delta = round(result["predicted_readiness"] - current.get("readiness_score", 75.0), 1)
        fatigue_delta   = round(result["predicted_fatigue"]   - current.get("fatigue_index", 20.0),    1)

        return {
            "scenario": scenario,
            "current": {
                "readiness": round(current.get("readiness_score", 75.0), 1),
                "fatigue":   round(current.get("fatigue_index", 20.0), 1),
                "stress_resilience": round(current.get("stress_resilience", 75.0), 1),
            },
            "predicted": {
                "readiness":       result["predicted_readiness"],
                "fatigue":         result["predicted_fatigue"],
                "readiness_delta": readiness_delta,
                "fatigue_delta":   fatigue_delta,
            },
            "confidence":        round(result["confidence"] * 100, 1),
            "impact_assessment": result["impact_assessment"],
            "workout_feasibility": feasibility,
            "model_used": "TwinSimulator (Monte Carlo, 50 iterations)",
        }

    except Exception as e:
        logger.error(f"Simulation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/twin/timeline/{user_id}")
async def get_twin_timeline(user_id: str):
    """
    Generate a 24-hour simulation timeline using EdgeMLPredictor.forecast_future_value.
    """
    try:
        twin_state = coach.get_readiness_report(user_id)
        current_readiness = float(twin_state.get("readiness_score", 75.0))
        current_fatigue   = float(twin_state.get("fatigue_index", 20.0))

        # Seed with small history
        readiness_history = [max(0.0, min(100.0, current_readiness + float(np.random.uniform(-3, 3)))) for _ in range(10)]
        readiness_history[-1] = current_readiness
        fatigue_history = [max(0.0, min(100.0, current_fatigue + float(np.random.uniform(-2, 2)))) for _ in range(10)]
        fatigue_history[-1] = current_fatigue

        # Forecast next 24 hours
        readiness_forecast = coach.ml_predictor.forecast_future_value(readiness_history, horizon=24)
        fatigue_forecast   = coach.ml_predictor.forecast_future_value(fatigue_history,   horizon=24)

        timeline = []
        for i in range(25):
            if i == 0:
                r, f = current_readiness, current_fatigue
            else:
                r = max(0.0, min(100.0, float(readiness_forecast[i - 1])))
                f = max(0.0, min(100.0, float(fatigue_forecast[i - 1])))
            timeline.append({
                "hour":      i,
                "label":     f"{i}h",
                "readiness": round(r, 1),
                "fatigue":   round(f, 1),
                "recovery":  round(100.0 - f, 1),
            })

        # Optimal trajectory
        optimal = [{"hour": i, "readiness": round(min(100, 70 + i * 1.25), 1), "fatigue": round(max(0, 30 - i * 1.0), 1)} for i in range(25)]

        return {
            "user_id":          user_id,
            "current_readiness": round(current_readiness, 1),
            "current_fatigue":   round(current_fatigue, 1),
            "timeline":          timeline,
            "optimal_trajectory": optimal,
            "model_used":        "EdgeMLPredictor (linear trend forecast)",
            "horizon_hours":     24,
        }

    except Exception as e:
        logger.error(f"Timeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/twin/intervention")
async def get_intervention_impact(req: InterventionRequest):
    """Predict the readiness gain from a specific intervention."""
    try:
        impact = coach.personalization_engine.twin_simulator.predict_intervention_impact(req.user_id, req.suggestion)
        current = coach.get_readiness_report(req.user_id)
        predicted_readiness = min(100.0, current.get("readiness_score", 75.0) + (impact * 100))
        return {
            "suggestion":          req.suggestion,
            "impact_score":        round(impact * 100, 1),
            "current_readiness":   round(current.get("readiness_score", 75.0), 1),
            "predicted_readiness": round(predicted_readiness, 1),
            "readiness_gain":      round(impact * 100, 1),
        }
    except Exception as e:
        logger.error(f"Intervention error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/twin/baseline/{user_id}")
async def get_twin_baseline(user_id: str):
    """Return the user's learned baseline, thresholds, and habits."""
    try:
        profile = coach.personalization_engine.get_profile(user_id)
        return {
            "user_id":                 user_id,
            "fitness_level":           profile.fitness_level,
            "baselines":               profile.baselines,
            "personalized_thresholds": profile.personalized_thresholds,
            "habits":                  profile.habits,
            "last_updated":            profile.last_updated,
        }
    except Exception as e:
        logger.error(f"Baseline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Legacy /simulate (now fixed with proper model)
@app.post("/simulate")
async def simulate_scenario(req: SimulationRequest):
    """Legacy simulate endpoint. Use /twin/simulate instead."""
    return await simulate_twin_scenario(req)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
