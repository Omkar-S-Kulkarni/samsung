import logging
import random
import numpy as np
from typing import Dict, List, Any, Optional
from .config import PipelineConfig
from .digital_twin import PhysiologicalTwin, TwinState

logger = logging.getLogger(__name__)

class TwinSimulator:
    """Phase 🧬: Simulation Engine - Predicts future health states based on hypothetical scenarios."""
    
    def __init__(self, config: PipelineConfig, twin: PhysiologicalTwin):
        self.config = config.digital_twin
        self.twin = twin

    def simulate_what_if(self, user_id: str, scenario: Dict) -> Dict:
        """
        Simulate a 'what-if' scenario (e.g., 'If I sleep 2 hours less tonight').
        Returns the predicted impact on readiness and fatigue.
        """
        current_state = self.twin.get_twin_state(user_id)
        
        # Hypothetical inputs
        sleep_delta = scenario.get("sleep_delta", 0) # hours
        extra_workout_load = scenario.get("extra_load", 0) # 0-100
        
        # Simulation Logic (Probabilistic)
        iterations = 50 if self.config.uncertainty_method == "monte_carlo" else 1
        results = []
        
        for _ in range(iterations):
            # Add noise/uncertainty
            noise = random.uniform(-5, 5) if iterations > 1 else 0
            
            # Impact on readiness
            pred_readiness = current_state.readiness_score + (sleep_delta * 8) - (extra_workout_load * 0.2) + noise
            pred_fatigue = current_state.fatigue_index - (sleep_delta * 4) + (extra_workout_load * 0.5) + noise
            
            results.append({
                "readiness": max(0, min(100, pred_readiness)),
                "fatigue": max(0, min(100, pred_fatigue))
            })
            
        # Aggregate results
        avg_readiness = np.mean([r["readiness"] for r in results])
        avg_fatigue = np.mean([r["fatigue"] for r in results])
        uncertainty = np.std([r["readiness"] for r in results]) if iterations > 1 else 0
        
        return {
            "scenario": scenario,
            "predicted_readiness": round(float(avg_readiness), 1),
            "predicted_fatigue": round(float(avg_fatigue), 1),
            "confidence": round(1.0 - (uncertainty / 50.0), 2),
            "impact_assessment": self._assess_impact(current_state.readiness_score, avg_readiness)
        }

    def _assess_impact(self, current: float, predicted: float) -> str:
        diff = predicted - current
        if diff > 10: return "significant_improvement"
        if diff > 3: return "slight_improvement"
        if diff < -10: return "significant_risk"
        if diff < -3: return "slight_decline"
        return "stable"

    def simulate_workout_tradeoff(self, user_id: str, intensity: float) -> Dict:
        """Analyze the tradeoff between a proposed workout and current recovery status."""
        state = self.twin.get_twin_state(user_id)
        
        if state.readiness_score < 40 and intensity > 70:
            return {
                "recommendation": "abstain",
                "risk_level": "high",
                "reason": "Recovery debt is too high for intense activity."
            }
        elif state.readiness_score > 75:
            return {
                "recommendation": "proceed",
                "risk_level": "low",
                "reason": "Optimal readiness for high-intensity training."
            }
        else:
            return {
                "recommendation": "moderate",
                "risk_level": "medium",
                "reason": "Body is in maintenance mode. Suggest zone 2 activity."
            }

    def predict_intervention_impact(self, user_id: str, suggestion: str) -> float:
        """Predict how likely a specific intervention (suggestion) is to improve readiness."""
        # Simple heuristic mapping for demo
        impact_map = {
            "sleep": 0.15,
            "rest": 0.10,
            "walk": 0.05,
            "meditation": 0.08
        }
        
        for key, impact in impact_map.items():
            if key in suggestion.lower():
                return impact
        return 0.02
