import os
import json
import logging
import time
import numpy as np
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig
from pipeline.whatsapp_manager import WhatsAppManager
import threading
import asyncio

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
whatsapp = WhatsAppManager()

def whatsapp_scheduler():
    """Background task to send WhatsApp updates every hour."""
    while True:
        try:
            # Wait for 1 hour
            time.sleep(3600) 
            logger.info("Hourly WhatsApp update triggered")
            # Pull daily plan for content
            plan = coach.get_daily_plan("default_user")
            data = {
                "sleep": plan.get("sleep_guideline", "Optimized sleep recommended."),
                "activity": plan.get("activity_target", "Active recovery suggested."),
                "meals": "Targeting metabolic efficiency with balanced macros.",
                "rest": "Scheduled rest intervals active."
            }
            whatsapp.send_instant_update(data)
        except Exception as e:
            logger.error(f"WhatsApp scheduler error: {e}")

# Start the scheduler in a background thread
threading.Thread(target=whatsapp_scheduler, daemon=True).start()

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

class AnomalyExplanationRequest(BaseModel):
    """Request body for explaining an anomaly."""
    user_id: str = "default_user"
    anomaly_id: str
    metrics: Dict
    rule: str

class TrendInsightRequest(BaseModel):
    """Request body for trend insights."""
    user_id: str = "default_user"
    timeframe: str = "7d"

class ReportRequest(BaseModel):
    user_id: str = "default_user"
    report_type: str
    extra_context: str = ""

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

@app.get("/pipeline/status")
async def get_pipeline_status():
    """Retrieve full pipeline health and statistics for the visualizer."""
    try:
        try:
            rag_stats = coach.memory.get_stats()
        except Exception:
            rag_stats = {"total_entries": 0}
            
        try:
            intelligent_report = coach.get_intelligent_engine_report()
        except Exception:
            intelligent_report = {"status": "unknown"}

        return {
            "status": "online",
            "ingestion": {
                "active": True,
                "components": ["StreamingPreprocessor", "AdvancedPreprocessor"]
            },
            "edge_ml": {
                "models": ["GradientBoosting (Stress)", "IsolationForest (Anomaly)", "EdgeMLPredictor"],
                "status": "active"
            },
            "personalization": {
                "modules": ["BaselineTracker", "PrivacyManager", "SyncManager", "GoalManager"],
                "privacy_rules": len(coach.personalization_engine.privacy._permissions)
            },
            "simulation": {
                "core": "PhysiologicalTwin",
                "engine": "TwinSimulator (Monte Carlo)",
                "active": True
            },
            "cognitive": {
                "rag_stats": rag_stats,
                "llm_realtime": config.model.llm_model_name,
                "llm_reasoning": config.model.llm_model_reasoning,
                "hallucination_detector": config.intelligence.enable_hallucination_detection
            },
            "intelligent_engine": intelligent_report
        }
    except Exception as e:
        logger.error(f"Pipeline status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reports/build_prompt")
async def build_report_prompt(req: ReportRequest):
    """Builds the comprehensive prompt for client-side Ollama streaming."""
    try:
        profile = coach.personalization_engine.get_profile(req.user_id)
        twin_data = coach.get_readiness_report(req.user_id)
        
        # Pull latest features if available to add richness
        history = coach.feature_data[coach.feature_data["user_id"] == req.user_id] if coach.feature_data is not None else None
        latest_hrv = history.iloc[-1].get("hrv_ms", 60) if history is not None and len(history) > 0 else 60
        
        health_data = {
            "readiness_score": twin_data.get("readiness_score", 75),
            "fatigue_index": twin_data.get("fatigue_index", 20),
            "hrv": latest_hrv,
            "extra_context": req.extra_context
        }

        if req.report_type == "schedule":
            prompt = "Generate a complete, minute-by-minute daily schedule for today based on my current readiness and fatigue. Make it realistic and actionable in plain English. Format using markdown."
        elif req.report_type == "meal_plan":
            prompt = f"I have already eaten: '{req.extra_context}'. Based on my health metrics, give me a complete meal plan for the rest of the day in plain English. Suggest macros and specific foods. Format using markdown."
        elif req.report_type == "health_report":
            prompt = "Give me a complete, detailed report about my current health condition in plain English based on my metrics. What am I doing right, and what needs immediate attention? Format using markdown."
        elif req.report_type == "mistakes":
            prompt = "Analyze my health profile and tell me what common health mistakes I might have committed recently based on my metrics (or generally if data is sparse). Provide actionable solutions to fix them. Use plain English and markdown."
        elif req.report_type == "sleep_plan":
            prompt = "Create a complete, optimized sleep plan and wind-down routine for me tonight based on my current fatigue levels. Use plain English and markdown format."
        else:
            raise HTTPException(status_code=400, detail="Invalid report type")

        full_prompt = f"Health Data:\n{json.dumps(health_data, indent=2)}\n\nRequest:\n{prompt}"
        system_prompt = "You are a professional health AI coach. Provide direct, plain-English answers using Markdown formatting. Be specific and actionable. Do not use JSON."

        return {
            "user_id": req.user_id,
            "report_type": req.report_type,
            "prompt": full_prompt,
            "system": system_prompt,
            "model": config.model.llm_model_name
        }
        
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

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


# =============================================================================
# 🚨 ANOMALY & ALERT CENTER ENDPOINTS
# =============================================================================

@app.get("/anomalies/{user_id}")
async def get_anomaly_history(user_id: str):
    """
    Returns simulated historical anomalies for the timeline and list.
    """
    try:
        from pipeline.ml_models import AnomalyForecaster
        current = coach.get_readiness_report(user_id)
        
        # Simulate some recent anomalies
        now = time.time()
        anomalies = [
            {
                "id": f"anom_{int(now - 86400 * 1.5)}",
                "timestamp": time.strftime("%Y-%m-%d %H:%M", time.localtime(now - 86400 * 1.5)),
                "rule": "sustained_high_stress",
                "severity": "WARNING",
                "metrics": {"stress_score": 88.0, "hrv_ms": 18.0},
                "risk_score": round(AnomalyForecaster.predict_risk(-0.8, -0.2), 1)
            },
            {
                "id": f"anom_{int(now - 86400 * 0.2)}",
                "timestamp": time.strftime("%Y-%m-%d %H:%M", time.localtime(now - 86400 * 0.2)),
                "rule": "poor_sleep_pattern",
                "severity": "INFO",
                "metrics": {"sleep_duration_min": 210.0},
                "risk_score": round(AnomalyForecaster.predict_risk(-0.5, 0.1), 1)
            },
            {
                "id": f"anom_{int(now - 3600 * 2)}",
                "timestamp": time.strftime("%Y-%m-%d %H:%M", time.localtime(now - 3600 * 2)),
                "rule": "critical_high_hr",
                "severity": "CRITICAL",
                "metrics": {"heart_rate_bpm": 185.0},
                "risk_score": round(AnomalyForecaster.predict_risk(-1.2, -0.5), 1)
            }
        ]
        return {"user_id": user_id, "anomalies": anomalies}
    except Exception as e:
        logger.error(f"Anomaly history error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/{user_id}")
async def get_active_alerts(user_id: str):
    """
    Evaluates current metrics against RuleEngine and returns active alerts.
    """
    try:
        from pipeline.ml_models import RuleEngine
        
        # Mock some current data based on user state
        twin_state = coach.get_readiness_report(user_id)
        current_metrics = {
            "heart_rate_bpm": 72.0,
            "hrv_ms": 19.0, # Intentional trigger for sustained_high_stress if stress > 85
            "spo2_pct": 98.0,
            "stress_score": 86.0, # Intentional trigger for sustained_high_stress
            "sleep_duration_min": 420.0
        }
        
        alerts = RuleEngine.evaluate(current_metrics)
        return {"user_id": user_id, "alerts": alerts, "timestamp": time.strftime("%H:%M:%S")}
    except Exception as e:
        logger.error(f"Alerts error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anomalies/{user_id}/explain")
async def explain_anomaly(req: AnomalyExplanationRequest):
    """
    Uses the Intelligent Engine LLM to explain why an anomaly occurred and suggest actions.
    """
    try:
        context = {
            "anomaly_rule": req.rule,
            "metrics": req.metrics,
            "user_profile": coach.personalization_engine.get_profile(req.user_id).__dict__
        }
        
        # Use reasoner directly for the explanation
        prompt = (
            f"An anomaly was detected: {req.rule}.\n"
            f"Metrics recorded during anomaly: {req.metrics}\n"
            f"Based on physiological principles, explain briefly in 2-3 sentences why this might have happened. "
            f"Then list 3 short, actionable suggestions to resolve it. "
            f"Format the output as valid JSON with two keys: 'explanation' (string) and 'actions' (list of strings)."
        )
        
        try:
            response = coach.reasoner.llm.invoke(prompt)
            # Try to parse JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = {"explanation": response.strip(), "actions": ["Rest and recover", "Hydrate well", "Monitor your vitals"]}
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            result = {
                "explanation": f"The system detected a deviation matching the '{req.rule}' pattern based on your current biometric load. This typically occurs when your physiological stress exceeds recovery capacity.",
                "actions": ["Prioritize deep sleep tonight", "Avoid high-intensity workouts today", "Practice 10 minutes of box breathing"]
            }
        
        # Compute contributing factors (mocked based on metrics)
        factors = []
        for key, val in req.metrics.items():
            factors.append({
                "metric": key.replace("_", " ").title(),
                "value": val,
                "contribution": min(100, int(val) % 50 + 40) # Mock contribution percentage
            })
            
        return {
            "anomaly_id": req.anomaly_id,
            "explanation": result.get("explanation", ""),
            "actions": result.get("actions", []),
            "factors": factors
        }
    except Exception as e:
        logger.error(f"Explain anomaly error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 📈 TRENDS & ANALYTICS ENDPOINTS
# =============================================================================

def generate_trend_data(days: int, base_readiness: float, base_sleep: float, base_stress: float):
    """Procedurally generate realistic trend data."""
    data = []
    now = time.time()
    for i in range(days, -1, -1):
        # Add some sine wave seasonality + noise
        t = (days - i) / 7.0
        r = min(100, max(0, base_readiness + np.sin(t) * 10 + np.random.normal(0, 5)))
        sl = min(12, max(4, base_sleep + np.cos(t) * 1.5 + np.random.normal(0, 0.8)))
        st = min(100, max(0, base_stress - np.sin(t) * 15 + np.random.normal(0, 8)))
        hr = min(100, max(40, 65 - np.sin(t) * 5 + np.random.normal(0, 3)))
        
        data.append({
            "date": time.strftime("%b %d", time.localtime(now - i * 86400)),
            "readiness": round(r, 1),
            "sleep_hrs": round(sl, 1),
            "stress": round(st, 1),
            "hr": round(hr, 1)
        })
    return data

@app.get("/trends/{user_id}")
async def get_trends(user_id: str, timeframe: str = "7d"):
    """Returns historical trend data based on timeframe."""
    try:
        current = coach.get_readiness_report(user_id)
        br = float(current.get("readiness_score", 75))
        bs = 7.5
        bst = 40.0
        
        if timeframe == "7d":
            data = generate_trend_data(7, br, bs, bst)
        elif timeframe == "30d":
            data = generate_trend_data(30, br, bs, bst)
        elif timeframe == "6m":
            # For 6m, group by month (mocking 6 points)
            data = []
            now = time.time()
            for i in range(6, -1, -1):
                t = (6 - i)
                data.append({
                    "date": time.strftime("%b %Y", time.localtime(now - i * 30 * 86400)),
                    "readiness": round(float(br + t*2 + np.random.normal(0, 3)), 1),
                    "sleep_hrs": round(float(bs + t*0.2 + np.random.normal(0, 0.5)), 1),
                    "stress": round(float(bst - t*3 + np.random.normal(0, 4)), 1),
                    "hr": round(float(65 - t + np.random.normal(0, 2)), 1)
                })
        else:
            data = generate_trend_data(7, br, bs, bst)
            
        # Calculate indicators (compare last vs first)
        if len(data) >= 2:
            first, last = data[0], data[-1]
            indicators = {
                "readiness": {"value": last["readiness"], "delta": round(last["readiness"] - first["readiness"], 1)},
                "sleep": {"value": last["sleep_hrs"], "delta": round(last["sleep_hrs"] - first["sleep_hrs"], 1)},
                "stress": {"value": last["stress"], "delta": round(last["stress"] - first["stress"], 1)},
                "hr": {"value": last["hr"], "delta": round(last["hr"] - first["hr"], 1)}
            }
        else:
            indicators = {}
            
        return {"user_id": user_id, "timeframe": timeframe, "data": data, "indicators": indicators}
    except Exception as e:
        logger.error(f"Trends error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trends/correlations/{user_id}")
async def get_correlations(user_id: str):
    """Returns scatter plot data for correlations (Sleep vs HRV, Stress vs Readiness)."""
    try:
        data = []
        for _ in range(30):
            sleep = float(np.random.uniform(4, 10))
            hrv = float(sleep * 8 + np.random.normal(0, 10))
            stress = float(100 - (sleep * 8) + np.random.normal(0, 15))
            readiness = float(sleep * 9 + np.random.normal(0, 8))
            
            data.append({
                "sleep": round(sleep, 1),
                "hrv": round(hrv, 1),
                "stress": round(stress, 1),
                "readiness": round(readiness, 1)
            })
        return {"user_id": user_id, "data": data}
    except Exception as e:
        logger.error(f"Correlations error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trends/insights")
async def generate_trend_insights(req: TrendInsightRequest):
    """Use LLM to explain the trends."""
    try:
        current = coach.get_readiness_report(req.user_id)
        prompt = (
            f"The user has requested a trend analysis. Their current readiness is {current.get('readiness_score', 75)}. "
            f"Over the last {req.timeframe}, their sleep has slightly improved and stress has decreased, leading to better HRV. "
            f"Write a short, encouraging 3-sentence insight explaining how their sleep improvements are driving better cardiovascular recovery (HRV) and overall readiness. "
            f"Format as valid JSON with an 'insight' key (string)."
        )
        
        try:
            response = coach.reasoner.llm.invoke(prompt)
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = {"insight": response.strip()}
        except Exception as e:
            logger.error(f"LLM trend insight failed: {e}")
            result = {"insight": "Your recent data shows a strong positive correlation between your sleep duration and HRV. By maintaining this consistent sleep schedule, you are actively lowering your physiological stress and boosting your daily readiness."}
            
        return {"user_id": req.user_id, "insight": result.get("insight", "")}
    except Exception as e:
        logger.error(f"Trend insights error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Legacy /simulate (now fixed with proper model)
@app.post("/simulate")
async def simulate_scenario(req: SimulationRequest):
    """Legacy simulate endpoint. Use /twin/simulate instead."""
    return await simulate_twin_scenario(req)


# =============================================================================
# ⚙️ PERSONALIZATION SETTINGS ENDPOINTS
# =============================================================================

from pipeline.tone_adapter import ToneAdapter, TONE_TEMPLATES
tone_adapter = ToneAdapter()

class PersonalizationSettingsUpdate(BaseModel):
    user_id: str = "default_user"
    personality_mode: Optional[str] = None      # 'strict', 'friendly', 'coach'
    notification_frequency: Optional[str] = None # 'low', 'medium', 'high'
    alert_sensitivity: Optional[str] = None      # 'low', 'medium', 'high'
    privacy_biometrics: Optional[bool] = None
    privacy_location: Optional[bool] = None
    privacy_cloud: Optional[bool] = None
    data_visibility_hr: Optional[bool] = None
    data_visibility_sleep: Optional[bool] = None
    data_visibility_stress: Optional[bool] = None
    data_visibility_activity: Optional[bool] = None

# In-memory settings store (production would persist)
_user_settings: Dict[str, Dict] = {}

def _get_settings(user_id: str) -> Dict:
    if user_id not in _user_settings:
        _user_settings[user_id] = {
            "personality_mode": tone_adapter.get_user_tone(user_id),
            "notification_frequency": "medium",
            "alert_sensitivity": "medium",
            "privacy": {
                "biometrics": coach.personalization_engine.privacy._permissions.get("biometrics", True),
                "location": coach.personalization_engine.privacy._permissions.get("location", False),
                "cloud": coach.personalization_engine.privacy._permissions.get("cloud", False),
            },
            "data_visibility": {
                "heart_rate": True,
                "sleep": True,
                "stress": True,
                "activity": True,
            },
        }
    return _user_settings[user_id]


@app.get("/settings/{user_id}")
async def get_personalization_settings(user_id: str):
    """Get all personalization settings for a user."""
    try:
        settings = _get_settings(user_id)
        tone_info = tone_adapter.get_user_tone(user_id)
        all_tones = tone_adapter.get_all_tones()

        return {
            "user_id": user_id,
            "settings": settings,
            "current_tone": tone_info,
            "available_tones": all_tones,
            "tone_descriptions": {k: v['description'] for k, v in TONE_TEMPLATES.items()},
        }
    except Exception as e:
        logger.error(f"Settings GET error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/settings/{user_id}")
async def update_personalization_settings(user_id: str, req: PersonalizationSettingsUpdate):
    """Update personalization settings for a user."""
    try:
        settings = _get_settings(user_id)

        if req.personality_mode and req.personality_mode in TONE_TEMPLATES:
            settings["personality_mode"] = req.personality_mode
            tone_adapter.set_user_tone(user_id, req.personality_mode)

        if req.notification_frequency:
            settings["notification_frequency"] = req.notification_frequency
        if req.alert_sensitivity:
            settings["alert_sensitivity"] = req.alert_sensitivity

        # Privacy
        if req.privacy_biometrics is not None:
            settings["privacy"]["biometrics"] = req.privacy_biometrics
            coach.personalization_engine.privacy.set_permission("biometrics", req.privacy_biometrics)
        if req.privacy_location is not None:
            settings["privacy"]["location"] = req.privacy_location
            coach.personalization_engine.privacy.set_permission("location", req.privacy_location)
        if req.privacy_cloud is not None:
            settings["privacy"]["cloud"] = req.privacy_cloud
            coach.personalization_engine.privacy.set_permission("cloud", req.privacy_cloud)

        # Data visibility
        if req.data_visibility_hr is not None:
            settings["data_visibility"]["heart_rate"] = req.data_visibility_hr
        if req.data_visibility_sleep is not None:
            settings["data_visibility"]["sleep"] = req.data_visibility_sleep
        if req.data_visibility_stress is not None:
            settings["data_visibility"]["stress"] = req.data_visibility_stress
        if req.data_visibility_activity is not None:
            settings["data_visibility"]["activity"] = req.data_visibility_activity

        _user_settings[user_id] = settings
        return {"status": "updated", "settings": settings}
    except Exception as e:
        logger.error(f"Settings POST error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 🧠 EMOTIONAL STATE DASHBOARD ENDPOINTS
# =============================================================================

@app.get("/emotional/{user_id}")
async def get_emotional_state(user_id: str):
    """
    Returns the user's emotional state, mood trend, stress level,
    emotional insights, and suggested wellness actions.
    """
    try:
        twin_state = coach.get_readiness_report(user_id)
        profile = coach.personalization_engine.get_profile(user_id)

        # Determine emotional state from physiological signals
        readiness = float(twin_state.get("readiness_score", 75.0))
        fatigue = float(twin_state.get("fatigue_index", 20.0))
        resilience = float(twin_state.get("stress_resilience", 75.0))

        # Compute stress level (0-100)
        stress_level = max(0, min(100, 100 - resilience + fatigue * 0.5))

        # Map to emotional state
        if stress_level > 70:
            emotional_state = "stressed"
            state_color = "#f87171"
            state_emoji = "😰"
        elif stress_level > 50:
            emotional_state = "anxious"
            state_color = "#FF9A3C"
            state_emoji = "😟"
        elif fatigue > 60:
            emotional_state = "fatigued"
            state_color = "#fbbf24"
            state_emoji = "😴"
        elif readiness > 80 and resilience > 70:
            emotional_state = "energized"
            state_color = "#39FF6A"
            state_emoji = "😊"
        elif readiness > 60:
            emotional_state = "calm"
            state_color = "#00E5FF"
            state_emoji = "😌"
        else:
            emotional_state = "neutral"
            state_color = "#94a3b8"
            state_emoji = "😐"

        # Generate mood trend (last 7 days simulated)
        now = time.time()
        mood_trend = []
        for i in range(7, -1, -1):
            day_stress = max(0, min(100, stress_level + float(np.random.normal(0, 12)) - i * 2))
            day_mood = max(0, min(100, 100 - day_stress))
            mood_trend.append({
                "date": time.strftime("%b %d", time.localtime(now - i * 86400)),
                "mood_score": round(day_mood, 1),
                "stress_score": round(day_stress, 1),
            })

        # Emotional insights
        insights = []
        if stress_level > 60:
            insights.append({
                "type": "warning",
                "title": "Elevated Stress Detected",
                "text": "Your HRV and resilience scores suggest your body is under higher-than-normal stress. Consider incorporating relaxation techniques.",
            })
        if fatigue > 50:
            insights.append({
                "type": "info",
                "title": "Recovery Needed",
                "text": f"Your fatigue index is at {fatigue:.0f}%. Prioritize sleep quality and reduce training intensity.",
            })
        if readiness > 80:
            insights.append({
                "type": "positive",
                "title": "Strong Readiness",
                "text": "Your body is well-recovered. This is a great day for challenging activities or focused work.",
            })
        if resilience > 70:
            insights.append({
                "type": "positive",
                "title": "Good Stress Resilience",
                "text": "Your autonomic nervous system is handling stress well. Keep up your current recovery habits.",
            })
        else:
            insights.append({
                "type": "info",
                "title": "Building Resilience",
                "text": "Regular breathing exercises and consistent sleep can improve your stress resilience over time.",
            })

        # Suggested wellness actions
        actions = []
        if stress_level > 50:
            actions.extend([
                {"action": "Box Breathing", "duration": "5 min", "impact": "high", "icon": "🫁", "description": "4-4-4-4 breathing pattern to activate parasympathetic response"},
                {"action": "Progressive Relaxation", "duration": "10 min", "impact": "high", "icon": "🧘", "description": "Systematically tense and release muscle groups"},
            ])
        if fatigue > 40:
            actions.extend([
                {"action": "Power Nap", "duration": "20 min", "impact": "medium", "icon": "😴", "description": "Short nap to restore cognitive function and reduce fatigue"},
            ])
        actions.extend([
            {"action": "Mindful Walk", "duration": "15 min", "impact": "medium", "icon": "🚶", "description": "Light outdoor walk with focus on surroundings"},
            {"action": "Gratitude Journal", "duration": "5 min", "impact": "medium", "icon": "📝", "description": "Write 3 things you're grateful for to shift perspective"},
            {"action": "Cold Exposure", "duration": "2 min", "impact": "high", "icon": "🧊", "description": "Cold shower to boost endorphins and reduce inflammation"},
        ])

        return {
            "user_id": user_id,
            "emotional_state": emotional_state,
            "state_emoji": state_emoji,
            "state_color": state_color,
            "stress_level": round(stress_level, 1),
            "readiness": round(readiness, 1),
            "fatigue": round(fatigue, 1),
            "resilience": round(resilience, 1),
            "mood_trend": mood_trend,
            "insights": insights,
            "actions": actions,
            "last_updated": time.strftime("%H:%M:%S"),
        }
    except Exception as e:
        logger.error(f"Emotional state error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class WhatsAppSimRequest(BaseModel):
    phone: str

@app.post("/whatsapp/simulate")
async def simulate_whatsapp(req: WhatsAppSimRequest):
    """Trigger an immediate WhatsApp update with simple Hi for testing."""
    try:
        # SIMPLE HI FOR VERIFICATION
        data = {
            "is_test": True,
            "message": "Hi"
        }
        
        # Use the provided phone number
        phone = req.phone
        
        # Run in background to not block the API response
        threading.Thread(target=whatsapp.simulate_demo, args=(data, phone)).start()
        return {"status": "success", "message": f"Test Hi triggered for {phone}"}
    except Exception as e:
        logger.error(f"WhatsApp simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

