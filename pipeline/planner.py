import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

from .config import PipelineConfig

logger = logging.getLogger(__name__)

@dataclass
class PlanActivity:
    """A specific activity in a daily plan."""
    id: str
    name: str
    type: str  # exercise, nutrition, rest, mental_health
    description: str
    scheduled_time: str
    duration_min: int
    completed: bool = False
    priority: int = 1 # 1-high, 3-low

@dataclass
class DailyPlan:
    """Holistic daily plan for a user."""
    user_id: str
    date: str
    activities: List[PlanActivity] = field(default_factory=list)
    focus_area: str = "general_wellness"
    status: str = "active"

class HealthPlanner:
    """Generates and adjusts daily health plans."""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.active_plans: Dict[str, DailyPlan] = {}

    def generate_daily_plan(self, user_id: str, goals: List[Dict], user_state: str) -> DailyPlan:
        """Generate a personalized daily plan based on goals and current state."""
        today = datetime.now().date().isoformat()
        
        # Determine focus area based on goals and state
        focus_area = "general_wellness"
        if user_state == "stressed":
            focus_area = "stress_management"
        elif user_state == "tired":
            focus_area = "recovery"
        elif any(g["type"] == "weight_loss" for g in goals):
            focus_area = "metabolic_health"
        elif any(g["type"] == "step_count" for g in goals):
            focus_area = "activity"
            
        plan = DailyPlan(user_id=user_id, date=today, focus_area=focus_area)
        
        # Add activities based on focus area
        if focus_area == "stress_management":
            plan.activities.append(PlanActivity("a1", "Morning Meditation", "mental_health", "10-minute guided breathing.", "08:00", 10, priority=1))
            plan.activities.append(PlanActivity("a2", "Light Evening Walk", "exercise", "Slow walk in nature.", "18:00", 20, priority=2))
        elif focus_area == "recovery":
            plan.activities.append(PlanActivity("a1", "Nap / Quiet Time", "rest", "20-minute power nap.", "14:00", 20, priority=2))
            plan.activities.append(PlanActivity("a2", "Early Bedtime", "rest", "Wind down 1 hour earlier than usual.", "21:00", 60, priority=1))
        elif focus_area == "metabolic_health":
            plan.activities.append(PlanActivity("a1", "HIIT Session", "exercise", "High-intensity intervals.", "07:00", 30, priority=1))
            plan.activities.append(PlanActivity("a2", "Post-Meal Walk", "exercise", "15-minute walk after dinner.", "19:30", 15, priority=2))
        else:
            plan.activities.append(PlanActivity("a1", "General Activity", "exercise", "Reach your daily step goal.", "anytime", 60, priority=1))
            
        self.active_plans[user_id] = plan
        logger.info(f"Generated daily plan for {user_id} with focus: {focus_area}")
        return plan

    def adjust_plan_dynamically(self, user_id: str, current_state: str, current_metrics: Dict) -> Optional[DailyPlan]:
        """Adjust an existing plan if user state changes significantly."""
        if user_id not in self.active_plans:
            return None
            
        plan = self.active_plans[user_id]
        
        # If user becomes stressed/tired, swap high-intensity activities for recovery
        if current_state in ["stressed", "tired"]:
            for activity in plan.activities:
                if activity.type == "exercise" and activity.duration_min > 30 and not activity.completed:
                    logger.info(f"Dynamically adjusting plan for {user_id}: Downscaling {activity.name}")
                    activity.name = f"Gentle {activity.name}"
                    activity.description = "Reduced intensity due to current fatigue/stress levels."
                    activity.duration_min = 15
                    
        return plan

    def get_plan_summary(self, user_id: str) -> Dict:
        if user_id not in self.active_plans:
            return {"has_plan": False}
            
        plan = self.active_plans[user_id]
        return {
            "has_plan": True,
            "focus_area": plan.focus_area,
            "activities_count": len(plan.activities),
            "completed_count": len([a for a in plan.activities if a.completed]),
            "activities": [
                {"name": a.name, "type": a.type, "time": a.scheduled_time, "completed": a.completed}
                for a in plan.activities
            ]
        }
