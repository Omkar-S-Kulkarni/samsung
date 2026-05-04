import os
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import pandas as pd
import numpy as np

from .config import PipelineConfig
from .goal_manager import GoalManager
from .reward_system import RewardSystem
from .planner import HealthPlanner
from .learning_engine import LearningEngine
from .privacy_manager import PrivacyManager
from .sync_manager import SyncManager
from .digital_twin import PhysiologicalTwin
from .twin_simulator import TwinSimulator

logger = logging.getLogger(__name__)

@dataclass
class UserProfile:
    """Persistent user profile for true personalization."""
    user_id: str
    age: Optional[int] = 30
    fitness_level: str = "intermediate"  # beginner, intermediate, advanced, elite
    primary_goals: List[str] = field(default_factory=lambda: ["general_health"]) # fat_loss, muscle_gain, better_sleep, stress_reduction
    
    # Learned state
    baselines: Dict[str, Dict[str, float]] = field(default_factory=dict)
    habits: List[Dict] = field(default_factory=list)
    personalized_thresholds: Dict[str, float] = field(default_factory=dict)
    
    # Phase K & L state
    goal_summary: Dict = field(default_factory=dict)
    reward_report: Dict = field(default_factory=dict)
    learned_context: Dict = field(default_factory=dict)
    twin_summary: Dict = field(default_factory=dict)
    last_state: str = "balanced"
    
    # Evolving metadata
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())
    profile_version: int = 2

class PersonalizationEngine:
    """Engine to learn and manage true personalization."""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.storage_dir = self.config.personalization.storage_dir
        self.profiles: Dict[str, UserProfile] = {}
        
        self.goals = GoalManager(config)
        self.rewards = RewardSystem(config)
        self.planner = HealthPlanner(config)
        self.learning = LearningEngine(config)
        self.privacy = PrivacyManager(config)
        self.sync = SyncManager(config)
        self.twin = PhysiologicalTwin(config)
        self.twin_simulator = TwinSimulator(config, self.twin)
        
        if self.config.personalization.enable_personalization:
            self._load_profiles()
            
    def _load_profiles(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith("_profile.json"):
                    path = os.path.join(self.storage_dir, filename)
                    data = self.privacy.secure_load(path)
                    if data:
                        self.profiles[data["user_id"]] = UserProfile(**data)
            logger.info(f"Loaded {len(self.profiles)} secure user profiles.")
        except Exception as e:
            logger.error(f"Failed to load secure user profiles: {e}")

    def _save_profile(self, user_id: str):
        if not self.config.personalization.enable_personalization:
            return
            
        os.makedirs(self.storage_dir, exist_ok=True)
        profile = self.profiles.get(user_id)
        if profile:
            path = os.path.join(self.storage_dir, f"{user_id}_profile.json")
            self.privacy.secure_save(asdict(profile), path)
            
            # Sync update cross-device
            self.sync.enqueue_sync("update_profile", asdict(profile))

    def get_profile(self, user_id: str) -> UserProfile:
        if user_id not in self.profiles:
            self.profiles[user_id] = UserProfile(user_id=user_id)
            self._save_profile(user_id)
        return self.profiles[user_id]

    def update_goals(self, user_id: str, goals: List[str], fitness_level: Optional[str] = None):
        profile = self.get_profile(user_id)
        profile.primary_goals = goals
        if fitness_level:
            profile.fitness_level = fitness_level
        profile.last_updated = datetime.now().isoformat()
        self._save_profile(user_id)

    def learn_baseline(self, user_id: str, historical_data: pd.DataFrame):
        """Learn and update baselines for HR, sleep, and activity from historical data."""
        if not self.config.personalization.enable_personalization or historical_data.empty:
            return
            
        profile = self.get_profile(user_id)
        
        metrics_to_track = ["heart_rate_bpm", "hrv_ms", "spo2_pct", "stress_score", 
                            "computed_stress", "health_score", "steps_per_min", 
                            "sleep_duration_min", "sleep_quality_score"]
                            
        for col in metrics_to_track:
            if col in historical_data.columns:
                valid_data = historical_data[col].dropna()
                if len(valid_data) > 0:
                    profile.baselines[col] = {
                        "mean": float(valid_data.mean()),
                        "std": float(valid_data.std()),
                        "p10": float(valid_data.quantile(0.10)),
                        "p90": float(valid_data.quantile(0.90)),
                    }
        
        # Adjust personalized thresholds based on new baselines
        self._adjust_personalized_thresholds(profile)
        
        profile.last_updated = datetime.now().isoformat()
        self._save_profile(user_id)
        logger.info(f"Learned baseline for user {user_id}")

    def _adjust_personalized_thresholds(self, profile: UserProfile):
        """Dynamically adjust physiological thresholds based on user's baseline."""
        generic = self.config.thresholds
        pt = profile.personalized_thresholds
        
        # Example: if user's baseline HR is high, adjust the "critical high" threshold
        if "heart_rate_bpm" in profile.baselines:
            mean_hr = profile.baselines["heart_rate_bpm"]["mean"]
            std_hr = profile.baselines["heart_rate_bpm"]["std"]
            
            # Elite athletes might have very low resting HR
            if profile.fitness_level in ["advanced", "elite"]:
                pt["hr_resting_low"] = min(generic.hr_resting_low, profile.baselines["heart_rate_bpm"]["p10"] - 5)
            else:
                pt["hr_resting_low"] = generic.hr_resting_low
                
            pt["hr_critical_high"] = max(generic.hr_critical_high, mean_hr + 4 * std_hr)
        
        if "hrv_ms" in profile.baselines:
            mean_hrv = profile.baselines["hrv_ms"]["mean"]
            pt["hrv_low_threshold"] = min(generic.hrv_low_threshold, mean_hrv * 0.5)

    def detect_deviations(self, user_id: str, current_sample: Dict) -> Dict:
        """Detect deviations from the user's PERSONAL baseline, not global thresholds."""
        profile = self.get_profile(user_id)
        deviations = {}
        
        for key, value in current_sample.items():
            if key in profile.baselines and isinstance(value, (int, float)):
                b = profile.baselines[key]
                std = b["std"] if b["std"] > 0 else 1.0
                z_score = (value - b["mean"]) / std
                
                deviations[f"{key}_deviation_z"] = round(z_score, 2)
                
                if abs(z_score) > 2.0:
                    deviations[f"{key}_is_significant_deviation"] = True
                    
        return deviations

    def recognize_habits(self, user_id: str, historical_data: pd.DataFrame) -> List[Dict]:
        """Simple habit recognition based on recurring patterns in time series."""
        if historical_data.empty:
            return []
            
        profile = self.get_profile(user_id)
        habits = []
        
        if "sleep_duration_min" in historical_data.columns and "timestamp" in historical_data.columns:
            # Example logic: recognize if user consistently sleeps < 6 hours
            recent_sleep = historical_data["sleep_duration_min"].dropna().tail(7)
            if len(recent_sleep) >= 3 and recent_sleep.mean() < 360:
                habits.append({"type": "sleep_deprived", "description": "Consistently sleeps less than 6 hours."})
        
        if "steps_per_min" in historical_data.columns:
            recent_activity = historical_data["steps_per_min"].dropna().tail(7 * 24 * 60) # 7 days
            if len(recent_activity) > 0 and recent_activity.sum() < 20000:
                 habits.append({"type": "sedentary", "description": "Low physical activity over the past week."})
                 
        profile.habits = habits
        self._save_profile(user_id)
        return habits

    def determine_user_state(self, user_id: str, current_sample: Dict) -> str:
        """Classify holistic user state: tired, active, stressed, recovering."""
        profile = self.get_profile(user_id)
        deviations = self.detect_deviations(user_id, current_sample)
        
        # Default state
        state = "balanced"
        
        # Rule-based classification utilizing personal deviations
        hr_dev = deviations.get("heart_rate_bpm_deviation_z", 0)
        hrv_dev = deviations.get("hrv_ms_deviation_z", 0)
        stress_dev = deviations.get("computed_stress_deviation_z", deviations.get("stress_score_deviation_z", 0))
        
        if stress_dev > 1.5 and hrv_dev < -1.0:
            state = "stressed"
        elif hrv_dev > 1.5 and hr_dev < -0.5:
            state = "recovering"
        elif hr_dev > 2.0:
            state = "active"
        elif "sleep_duration_min_deviation_z" in deviations and deviations["sleep_duration_min_deviation_z"] < -1.5:
            state = "tired"
            
        profile.last_state = state
        return state

    def get_adaptive_coaching(self, user_id: str, current_state: str) -> Dict:
        """Provide adaptive coaching strategies based on profile, goals, and current state."""
        profile = self.get_profile(user_id)
        
        strategy = {
            "tone": "supportive",
            "focus_area": "general_wellness",
            "prompt_modifier": ""
        }
        
        # Adapt tone based on state
        if current_state == "stressed":
            strategy["tone"] = "empathetic"
            strategy["prompt_modifier"] = "The user is currently stressed. Use a calming, empathetic tone and suggest relaxation techniques."
        elif current_state == "tired":
            strategy["tone"] = "gentle"
            strategy["prompt_modifier"] = "The user is tired. Keep recommendations simple and focus on rest."
        elif current_state == "active":
            strategy["tone"] = "motivational"
            strategy["prompt_modifier"] = "The user is active. Be energetic and encourage their effort."
            
        # Adapt focus based on goals
        if "fat_loss" in profile.primary_goals:
            strategy["focus_area"] = "metabolism_and_activity"
            if current_state == "balanced":
                strategy["prompt_modifier"] += " Focus on maintaining a caloric deficit and steady activity."
        elif "better_sleep" in profile.primary_goals:
            strategy["focus_area"] = "recovery"
            strategy["prompt_modifier"] += " Emphasize sleep hygiene and evening routines."
            
        return strategy

    def evolve_profile(self, user_id: str):
        """Evolve the user profile over time based on sustained changes."""
        profile = self.get_profile(user_id)
        
        # Example evolution: If resting HR baseline has dropped significantly over months,
        # they might have moved from beginner to intermediate fitness.
        # (Simplified logic for demonstration)
        if "heart_rate_bpm" in profile.baselines:
            mean_hr = profile.baselines["heart_rate_bpm"]["mean"]
            if profile.fitness_level == "beginner" and mean_hr < 65:
                profile.fitness_level = "intermediate"
                logger.info(f"User {user_id} evolved to intermediate fitness level.")
                
        profile.last_updated = datetime.now().isoformat()
        self._save_profile(user_id)

    def refresh_user_context(self, user_id: str, current_metrics: Optional[Dict] = None):
        """Refresh all high-level context (goals, rewards, learning) for a user."""
        profile = self.get_profile(user_id)
        
        # Update goal progress if metrics provided
        if current_metrics:
            self.goals.track_progress(user_id, current_metrics)
            
        # Sync state from sub-engines
        profile.goal_summary = self.goals.get_goal_summary(user_id)
        profile.reward_report = self.rewards.get_reward_report(user_id)
        profile.learned_context = self.learning.get_learned_context(user_id)
        
        # ★ Phase 🧬: Update Digital Twin
        self.twin.update_with_data(user_id, current_metrics, profile.baselines)
        profile.twin_summary = self.twin.get_summary(user_id)
        
        # Check milestones
        self.rewards.check_milestones(user_id, profile.goal_summary)
        
        self._save_profile(user_id)
        return profile
