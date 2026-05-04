import os
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime

from .config import PipelineConfig

logger = logging.getLogger(__name__)

@dataclass
class Badge:
    """Represents a badge earned by a user."""
    id: str
    name: str
    description: str
    icon: str
    date_earned: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class UserRewards:
    """Persistent reward state for a user."""
    user_id: str
    points: int = 0
    badges: List[Badge] = field(default_factory=list)
    milestones_reached: int = 0
    daily_streak: int = 0
    last_activity_date: Optional[str] = None
    level: int = 1

class RewardSystem:
    """Manages points, badges, and gamification."""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.storage_dir = os.path.join(self.config.output_dir, "rewards")
        self.rewards: Dict[str, UserRewards] = {}
        
        if self.config.goals.enable_gamification:
            self._load_rewards()

    def _load_rewards(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith("_rewards.json"):
                    with open(os.path.join(self.storage_dir, filename), "r") as f:
                        data = json.load(f)
                        user_id = data["user_id"]
                        # Convert badges back to Badge objects
                        data["badges"] = [Badge(**b) for b in data["badges"]]
                        self.rewards[user_id] = UserRewards(**data)
            logger.info(f"Loaded rewards for {len(self.rewards)} users.")
        except Exception as e:
            logger.error(f"Failed to load rewards: {e}")

    def _save_rewards(self, user_id: str):
        if not self.config.goals.enable_gamification:
            return
            
        os.makedirs(self.storage_dir, exist_ok=True)
        reward = self.rewards.get(user_id)
        if reward:
            path = os.path.join(self.storage_dir, f"{user_id}_rewards.json")
            with open(path, "w") as f:
                json.dump(asdict(reward), f, indent=2)

    def get_user_rewards(self, user_id: str) -> UserRewards:
        if user_id not in self.rewards:
            self.rewards[user_id] = UserRewards(user_id=user_id)
            self._save_rewards(user_id)
        return self.rewards[user_id]

    def add_points(self, user_id: str, points: int, reason: str = ""):
        """Add points to a user and check for level up."""
        if not self.config.goals.enable_gamification:
            return
            
        rewards = self.get_user_rewards(user_id)
        rewards.points += points
        
        # Simple level calculation: Level = sqrt(points / 100) + 1
        new_level = int((rewards.points / 100) ** 0.5) + 1
        if new_level > rewards.level:
            rewards.level = new_level
            logger.info(f"User {user_id} leveled up to {new_level}!")
            
        self._save_rewards(user_id)
        if reason:
            logger.info(f"Added {points} points to {user_id} for: {reason}")

    def check_milestones(self, user_id: str, goal_summary: Dict):
        """Check for badge awards based on goal progress."""
        rewards = self.get_user_rewards(user_id)
        existing_badge_ids = [b.id for b in rewards.badges]
        
        # Example milestone: First Goal Set
        if goal_summary.get("has_goals") and "first_goal" not in existing_badge_ids:
            self.award_badge(user_id, "first_goal", "Goal Getter", "Set your first health goal.", "🎯")
            
        # Example milestone: Goal Completed
        if goal_summary.get("completed_count", 0) > 0 and "goal_complete_1" not in existing_badge_ids:
            self.award_badge(user_id, "goal_complete_1", "Achiever", "Completed your first goal!", "🏆")
            self.add_points(user_id, self.config.goals.reward_points_per_milestone, "First goal completion")

        # Example milestone: 100% Progress on any goal
        for goal in goal_summary.get("goals", []):
            if goal["progress_pct"] >= 50 and "halfway_hero" not in existing_badge_ids:
                 self.award_badge(user_id, "halfway_hero", "Halfway Hero", "Reached 50% on a goal.", "🏃")
                 self.add_points(user_id, 20, "Halfway milestone")

    def award_badge(self, user_id: str, badge_id: str, name: str, description: str, icon: str):
        rewards = self.get_user_rewards(user_id)
        if any(b.id == badge_id for b in rewards.badges):
            return
            
        badge = Badge(id=badge_id, name=name, description=description, icon=icon)
        rewards.badges.append(badge)
        self.add_points(user_id, 50, f"Earned badge: {name}")
        self._save_rewards(user_id)
        logger.info(f"Awarded badge '{name}' to {user_id}")

    def update_streak(self, user_id: str):
        """Update daily activity streak."""
        rewards = self.get_user_rewards(user_id)
        today = datetime.now().date()
        
        if rewards.last_activity_date:
            last_date = datetime.fromisoformat(rewards.last_activity_date).date()
            if last_date == today:
                return # Already active today
            elif last_date == today - timedelta(days=1):
                rewards.daily_streak += 1
                if rewards.daily_streak % 7 == 0:
                    self.add_points(user_id, 100, f"{rewards.daily_streak} day streak!")
            else:
                rewards.daily_streak = 1
        else:
            rewards.daily_streak = 1
            
        rewards.last_activity_date = datetime.now().isoformat()
        self._save_rewards(user_id)

    def get_reward_report(self, user_id: str) -> Dict:
        rewards = self.get_user_rewards(user_id)
        return {
            "points": rewards.points,
            "level": rewards.level,
            "streak": rewards.daily_streak,
            "badge_count": len(rewards.badges),
            "recent_badges": [asdict(b) for b in rewards.badges[-3:]]
        }
