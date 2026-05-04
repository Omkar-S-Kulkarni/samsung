import os
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta

from .config import PipelineConfig

logger = logging.getLogger(__name__)

@dataclass
class Goal:
    """Represents a specific health goal."""
    id: str
    user_id: str
    type: str  # weight_loss, step_count, sleep_improvement, stress_reduction
    target_value: float
    current_value: float = 0.0
    start_value: float = 0.0
    unit: str = ""
    start_date: str = field(default_factory=lambda: datetime.now().isoformat())
    target_date: Optional[str] = None
    status: str = "active"  # active, completed, failed, abandoned
    progress_history: List[Dict] = field(default_factory=list)
    milestones: List[Dict] = field(default_factory=list)
    
    def update_progress(self, current: float):
        self.current_value = current
        self.progress_history.append({
            "timestamp": datetime.now().isoformat(),
            "value": current,
            "delta": current - (self.progress_history[-1]["value"] if self.progress_history else self.start_value)
        })
        
        # Check for completion
        if self.type == "weight_loss":
            if self.current_value <= self.target_value:
                self.status = "completed"
        else:
            if self.current_value >= self.target_value:
                self.status = "completed"

class GoalManager:
    """Manages user goals and tracking."""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.storage_dir = self.config.goals.storage_dir
        self.user_goals: Dict[str, List[Goal]] = {}
        
        if self.config.goals.enable_goals:
            self._load_goals()

    def _load_goals(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith("_goals.json"):
                    user_id = filename.replace("_goals.json", "")
                    with open(os.path.join(self.storage_dir, filename), "r") as f:
                        data = json.load(f)
                        self.user_goals[user_id] = [Goal(**g) for g in data]
            logger.info(f"Loaded goals for {len(self.user_goals)} users.")
        except Exception as e:
            logger.error(f"Failed to load goals: {e}")

    def _save_goals(self, user_id: str):
        if not self.config.goals.enable_goals:
            return
            
        os.makedirs(self.storage_dir, exist_ok=True)
        goals = self.user_goals.get(user_id, [])
        path = os.path.join(self.storage_dir, f"{user_id}_goals.json")
        with open(path, "w") as f:
            json.dump([asdict(g) for g in goals], f, indent=2)

    def set_goal(self, user_id: str, goal_type: str, target: float, unit: str, 
                 start_value: float, duration_days: int = 30) -> Goal:
        """Create a new goal for a user."""
        if user_id not in self.user_goals:
            self.user_goals[user_id] = []
            
        goal_id = f"{goal_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        target_date = (datetime.now() + timedelta(days=duration_days)).isoformat()
        
        new_goal = Goal(
            id=goal_id,
            user_id=user_id,
            type=goal_type,
            target_value=target,
            start_value=start_value,
            current_value=start_value,
            unit=unit,
            target_date=target_date
        )
        
        self.user_goals[user_id].append(new_goal)
        self._save_goals(user_id)
        logger.info(f"Set new {goal_type} goal for user {user_id}")
        return new_goal

    def get_active_goals(self, user_id: str) -> List[Goal]:
        return [g for g in self.user_goals.get(user_id, []) if g.status == "active"]

    def track_progress(self, user_id: str, metrics: Dict):
        """Update goal progress based on current health metrics."""
        active_goals = self.get_active_goals(user_id)
        if not active_goals:
            return
            
        updates = False
        for goal in active_goals:
            # Map metrics to goal types
            if goal.type == "step_count" and "steps_per_min" in metrics:
                # Assuming metrics['steps_per_min'] is daily total or we aggregate elsewhere
                # For this demo, let's say metrics provides the 'total_steps_today'
                total_steps = metrics.get("total_steps_today", 0)
                if total_steps > 0:
                    goal.update_progress(total_steps)
                    updates = True
            elif goal.type == "sleep_improvement" and "sleep_duration_min" in metrics:
                sleep_min = metrics.get("sleep_duration_min", 0)
                if sleep_min > 0:
                    goal.update_progress(sleep_min / 60.0) # hours
                    updates = True
            elif goal.type == "stress_reduction" and "stress_score" in metrics:
                stress = metrics.get("stress_score", 0)
                goal.update_progress(stress)
                updates = True
                
        if updates:
            self._save_goals(user_id)

    def get_goal_summary(self, user_id: str) -> Dict:
        """Get a summary of all goals and their progress for a user."""
        goals = self.user_goals.get(user_id, [])
        if not goals:
            return {"has_goals": False}
            
        summary = {
            "has_goals": True,
            "active_count": len([g for g in goals if g.status == "active"]),
            "completed_count": len([g for g in goals if g.status == "completed"]),
            "goals": []
        }
        
        for g in goals:
            # Calculate progress percentage
            if g.type == "weight_loss":
                total_change = g.start_value - g.target_value
                current_change = g.start_value - g.current_value
                progress_pct = (current_change / total_change) * 100 if total_change != 0 else 0
            else:
                total_to_go = g.target_value - g.start_value
                current_attained = g.current_value - g.start_value
                progress_pct = (current_attained / total_to_go) * 100 if total_to_go != 0 else 0
                
            summary["goals"].append({
                "type": g.type,
                "target": g.target_value,
                "current": g.current_value,
                "unit": g.unit,
                "progress_pct": round(min(100, max(0, progress_pct)), 1),
                "status": g.status,
                "target_date": g.target_date
            })
            
        return summary
