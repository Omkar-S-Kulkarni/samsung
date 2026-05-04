import os
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime

from .config import PipelineConfig

logger = logging.getLogger(__name__)

@dataclass
class UserFeedback:
    """Feedback from a user on a specific insight or action."""
    id: str
    user_id: str
    target_id: str  # ID of the insight/recommendation
    rating: int  # 1-5
    comment: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    context: Dict = field(default_factory=dict)

class LearningEngine:
    """Core engine for the learning system (Phase L)."""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.storage_dir = self.config.learning.feedback_storage_dir
        self.user_preferences: Dict[str, Dict] = {}
        self.feedback_history: Dict[str, List[UserFeedback]] = {}
        
        if self.config.learning.enable_learning:
            self._load_data()

    def _load_data(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        try:
            # Load preferences
            pref_path = os.path.join(self.storage_dir, "user_preferences.json")
            if os.path.exists(pref_path):
                with open(pref_path, "r") as f:
                    self.user_preferences = json.load(f)
                    
            # Load feedback history
            for filename in os.listdir(self.storage_dir):
                if filename.endswith("_feedback.json"):
                    user_id = filename.replace("_feedback.json", "")
                    with open(os.path.join(self.storage_dir, filename), "r") as f:
                        data = json.load(f)
                        self.feedback_history[user_id] = [UserFeedback(**fb) for fb in data]
                        
            logger.info(f"Loaded learning data for {len(self.feedback_history)} users.")
        except Exception as e:
            logger.error(f"Failed to load learning data: {e}")

    def _save_feedback(self, user_id: str):
        if not self.config.learning.enable_learning:
            return
            
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # Save feedback list
        fb_list = self.feedback_history.get(user_id, [])
        path = os.path.join(self.storage_dir, f"{user_id}_feedback.json")
        with open(path, "w") as f:
            json.dump([asdict(fb) for fb in fb_list], f, indent=2)
            
        # Save global preferences
        pref_path = os.path.join(self.storage_dir, "user_preferences.json")
        with open(pref_path, "w") as f:
            json.dump(self.user_preferences, f, indent=2)

    def capture_feedback(self, user_id: str, target_id: str, rating: int, 
                         comment: Optional[str] = None, context: Optional[Dict] = None):
        """Capture and store user feedback."""
        if user_id not in self.feedback_history:
            self.feedback_history[user_id] = []
            
        feedback = UserFeedback(
            id=f"fb_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            user_id=user_id,
            target_id=target_id,
            rating=rating,
            comment=comment,
            context=context or {}
        )
        
        self.feedback_history[user_id].append(feedback)
        self._update_preferences(user_id, feedback)
        self._save_feedback(user_id)
        
        logger.info(f"Captured feedback from {user_id}: rating {rating}")

    def _update_preferences(self, user_id: str, feedback: UserFeedback):
        """Update learned preferences based on feedback."""
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = {
                "preferred_topics": {}, # count of positive feedback per topic
                "avoid_topics": {},     # count of negative feedback per topic
                "avg_rating": 0.0,
                "feedback_count": 0,
                "prompt_modifiers": []
            }
            
        prefs = self.user_preferences[user_id]
        prefs["feedback_count"] += 1
        
        # Running average rating
        alpha = 0.2
        prefs["avg_rating"] = (1-alpha) * prefs["avg_rating"] + alpha * feedback.rating
        
        # Extract topics from context if available
        topics = feedback.context.get("topics", [])
        for topic in topics:
            if feedback.rating >= 4:
                prefs["preferred_topics"][topic] = prefs["preferred_topics"].get(topic, 0) + 1
            elif feedback.rating <= 2:
                prefs["avoid_topics"][topic] = prefs["avoid_topics"].get(topic, 0) + 1
                
        # Generate prompt modifiers if enough feedback exists
        if prefs["feedback_count"] >= self.config.learning.min_feedback_for_adaptation:
            self._generate_prompt_modifiers(user_id)

    def _generate_prompt_modifiers(self, user_id: str):
        """Dynamically create prompt modifiers based on learned preferences."""
        prefs = self.user_preferences[user_id]
        modifiers = []
        
        # Topic-based modifiers
        best_topics = [t for t, c in sorted(prefs["preferred_topics"].items(), key=lambda x: x[1], reverse=True)[:2]]
        if best_topics:
            modifiers.append(f"The user responds well to advice about: {', '.join(best_topics)}.")
            
        worst_topics = [t for t, c in sorted(prefs["avoid_topics"].items(), key=lambda x: x[1], reverse=True)[:2]]
        if worst_topics:
            modifiers.append(f"Avoid or be brief when discussing: {', '.join(worst_topics)}.")
            
        # Overall tone modifiers
        if prefs["avg_rating"] < 3.0:
            modifiers.append("The user has been dissatisfied with recent advice. Be extra cautious, evidence-based, and empathetic.")
            
        prefs["prompt_modifiers"] = modifiers

    def get_learned_context(self, user_id: str) -> Dict:
        """Get learned context to inject into LLM prompts."""
        prefs = self.user_preferences.get(user_id, {})
        return {
            "modifiers": prefs.get("prompt_modifiers", []),
            "preferred_topics": list(prefs.get("preferred_topics", {}).keys()),
            "avoid_topics": list(prefs.get("avoid_topics", {}).keys())
        }

    def learn_from_actions(self, user_id: str, action_data: Dict):
        """Reinforcement loop: learn from what the user ACTUALLY does."""
        # e.g., if we recommended a walk and they did it, that's implicit positive feedback
        if action_data.get("type") == "goal_milestone":
            self.capture_feedback(user_id, "system", 5, "Implicit: Goal milestone reached", {"topics": ["goals"]})
        elif action_data.get("type") == "plan_completion":
            self.capture_feedback(user_id, "system", 5, "Implicit: Plan activity completed", {"topics": ["planning"]})
