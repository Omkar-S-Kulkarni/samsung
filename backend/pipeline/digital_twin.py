import logging
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from .config import PipelineConfig

logger = logging.getLogger(__name__)

@dataclass
class TwinState:
    """Snapshot of the Digital Twin's internal state."""
    user_id: str
    readiness_score: float = 75.0  # 0-100
    fatigue_index: float = 20.0     # 0-100
    stress_resilience: float = 80.0  # 0-100
    current_load: float = 0.0
    recovery_status: str = "recovering" # recovering, strained, optimal
    last_sync: str = field(default_factory=lambda: datetime.now().isoformat())

class PhysiologicalTwin:
    """Phase 🧬: Core Digital Twin Modeling - Simulates the user's body response."""
    
    def __init__(self, config: PipelineConfig):
        self.config = config.digital_twin
        self.states: Dict[str, TwinState] = {}
        self.baselines: Dict[str, Dict] = {}

    def get_twin_state(self, user_id: str) -> TwinState:
        """Get or initialize the twin state for a user."""
        if user_id not in self.states:
            self.states[user_id] = TwinState(user_id=user_id)
        return self.states[user_id]

    def update_with_data(self, user_id: str, current_metrics: Dict, baseline: Dict):
        """Update the twin's state based on real-world data."""
        twin = self.get_twin_state(user_id)
        
        # 1. Update Readiness based on HRV and Sleep
        hrv = current_metrics.get("hrv_ms", 50)
        hrv_base = baseline.get("hrv_ms", {}).get("mean", 50)
        
        # HRV ratio as a proxy for nervous system balance
        hrv_ratio = hrv / hrv_base if hrv_base > 0 else 1.0
        
        # 2. Update Fatigue based on Activity Load
        steps = current_metrics.get("total_steps_today", 0)
        twin.current_load = min(100.0, (steps / 15000.0) * 100)
        
        # 3. Dynamic State Calculation
        twin.readiness_score = (hrv_ratio * 70) + (30 * (1 - twin.fatigue_index/100))
        twin.readiness_score = max(0, min(100, twin.readiness_score))
        
        # 4. Stress Response Behavior
        stress = current_metrics.get("computed_stress", 40)
        if stress > 70:
            twin.stress_resilience -= 5
        else:
            twin.stress_resilience += 2
        twin.stress_resilience = max(20, min(100, twin.stress_resilience))
        
        twin.last_sync = datetime.now().isoformat()
        logger.debug(f"Updated Digital Twin for {user_id}: Readiness={twin.readiness_score:.1f}")

    def model_recovery_cycle(self, user_id: str, sleep_hours: float):
        """Model how sleep impacts the twin's readiness for the next day."""
        twin = self.get_twin_state(user_id)
        
        # Sleep impact formula
        sleep_quality = min(1.0, sleep_hours / 8.0)
        recovery_gain = (sleep_quality * 40) - (twin.current_load * 0.2)
        
        twin.readiness_score = min(100, twin.readiness_score + recovery_gain)
        twin.fatigue_index = max(0, twin.fatigue_index - (sleep_quality * 50))
        
        if twin.readiness_score > 85:
            twin.recovery_status = "optimal"
        elif twin.readiness_score < 50:
            twin.recovery_status = "strained"
        else:
            twin.recovery_status = "recovering"

    def get_summary(self, user_id: str) -> Dict:
        """Return a readable summary of the digital twin."""
        twin = self.get_twin_state(user_id)
        return asdict(twin)
