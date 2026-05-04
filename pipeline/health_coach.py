"""
Health Coach Orchestrator
==========================
Main orchestrator that combines preprocessing, feature engineering,
ML models, RAG memory, and LLM reasoning into a unified pipeline.
Supports both batch processing and real-time streaming.
Now integrated with intelligence upgrades for enhanced reasoning.
"""

import json
import logging
import os
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import asdict

import numpy as np
import pandas as pd

from .config import PipelineConfig
from .preprocessing import AdvancedPreprocessor, StreamingPreprocessor
from .feature_engineering import HealthFeatureEngine
from .ml_models import EdgeMLPredictor, RuleEngine
from .rag_system import HealthMemory
from .llm_reasoning import HealthLLMReasoner
from .multimodal_fusion import MultimodalFusionEngine
from .intelligent_engine import IntelligentHealthEngine
from .personalization_engine import PersonalizationEngine
from .predictive_engine import PredictiveEngine
from .battery_manager import BatteryManager

logger = logging.getLogger(__name__)


class HealthCoach:
    """
    Intelligent health coach that orchestrates the full pipeline.
    Takes raw wearable data → clean signals → features → insights.
    Now with integrated intelligence upgrades:
    - Cross-session conversation memory
    - Tone adaptation
    - Confidence scoring
    - Hallucination detection
    - Reasoning validation
    - Structured outputs
    - Context prioritization
    - Adaptive response length
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()

        # Initialize all components
        self.preprocessor = AdvancedPreprocessor(self.config)
        self.streaming_preprocessor = StreamingPreprocessor(self.config)
        self.feature_engine = HealthFeatureEngine(self.config)
        self.ml_predictor = EdgeMLPredictor(
            sequence_length=self.config.model.sequence_length
        )
        self.memory = HealthMemory(self.config)
        self.reasoner = HealthLLMReasoner(self.config)
        self.fusion = MultimodalFusionEngine(self.config)

        # ★ NEW: Intelligent Engine (all intelligence upgrades)
        self.intelligent_engine = IntelligentHealthEngine(self.config)
        self.personalization_engine = PersonalizationEngine(self.config)
        self.predictive_engine = PredictiveEngine(self.config, self.ml_predictor)
        self.battery_manager = BatteryManager(self.config)

        # State
        self.processed_data: Optional[pd.DataFrame] = None
        self.feature_data: Optional[pd.DataFrame] = None
        self.aggregations: Optional[Dict[str, pd.DataFrame]] = None
        self.feature_descriptions: Optional[Dict[str, str]] = None
        self.user_baselines: Dict[str, Dict] = {}

        logger.info("HealthCoach initialized with Intelligence Upgrades enabled")

    # =========================================================================
    # Batch Pipeline
    # =========================================================================

    def run_full_pipeline(self, data_dir: str, output_dir: str = "output") -> Dict:
        """
        Execute the complete batch pipeline end-to-end.

        Returns dict with results, metrics, and file paths.
        """
        os.makedirs(output_dir, exist_ok=True)
        results = {"start_time": time.time()}
        log_lines = []

        def log(msg):
            logger.info(msg)
            log_lines.append(msg)

        # ── Phase 1: Preprocessing ──────────────────────────────────────
        log("\n" + "=" * 70)
        log("PHASE 1: DATA PREPROCESSING")
        log("=" * 70)

        self.processed_data, quality, preprocess_logs = \
            self.preprocessor.preprocess(data_dir)
        log_lines.extend(preprocess_logs)

        # Save cleaned data
        cleaned_path = os.path.join(output_dir, "cleaned_data.csv")
        self.processed_data.to_csv(cleaned_path, index=False)
        log(f"Cleaned data saved: {cleaned_path}")

        # Save quality report
        quality_path = os.path.join(output_dir, "data_quality_report.json")
        with open(quality_path, "w") as f:
            json.dump(quality, f, indent=2, default=str)
        log(f"Quality report saved: {quality_path}")

        results["preprocessing"] = {
            "rows": len(self.processed_data),
            "columns": len(self.processed_data.columns),
            "quality": quality,
        }

        # ── Phase 2: Feature Engineering ────────────────────────────────
        log("\n" + "=" * 70)
        log("PHASE 2: FEATURE ENGINEERING")
        log("=" * 70)

        self.feature_data, self.aggregations, self.feature_descriptions = \
            self.feature_engine.engineer_features(self.processed_data)

        # Save feature data
        features_path = os.path.join(output_dir, "feature_data.csv")
        self.feature_data.to_csv(features_path, index=False)
        log(f"Feature data saved: {features_path}")

        # Save aggregations
        for name, agg_df in self.aggregations.items():
            agg_path = os.path.join(output_dir, f"aggregation_{name}.csv")
            agg_df.to_csv(agg_path, index=False)
            log(f"Aggregation [{name}] saved: {agg_path}")

        # Save feature descriptions
        desc_path = os.path.join(output_dir, "feature_descriptions.json")
        with open(desc_path, "w") as f:
            json.dump(self.feature_descriptions, f, indent=2)
        log(f"Feature descriptions saved: {desc_path}")

        # Compute user baselines and personalization
        if self.config.personalization.enable_personalization:
            for user_id, udf in self.feature_data.groupby("user_id"):
                self.personalization_engine.learn_baseline(user_id, udf)
                # Step 3: Run Personalization Evolution
                self.personalization_engine.evolve_profile(user_id, self.processed_data)
                self.personalization_engine.recognize_habits(user_id, self.processed_data)
                
                # ★ NEW: Phase D Memory Maintenance
                self.memory.apply_decay()
                self.memory.summarize_memories(user_id)
        else:
            self._compute_baselines()

        results["features"] = {
            "total_features": len(self.feature_data.columns),
            "aggregation_levels": list(self.aggregations.keys()),
            "feature_count": len(self.feature_descriptions),
        }

        # ── Phase 3: ML Models + RAG + LLM ─────────────────────────────
        log("\n" + "=" * 70)
        log("PHASE 3: ML MODELS + RAG + LLM REASONING")
        log("=" * 70)

        # Load or train ML models
        model_dir = os.path.join(output_dir, "models")
        stress_pkl = os.path.join(model_dir, "stress_model.pkl")
        anomaly_pkl = os.path.join(model_dir, "anomaly_model.pkl")

        if os.path.exists(stress_pkl) and os.path.exists(anomaly_pkl):
            # ── Fast path: models already exist on disk ──
            log("\n[3a] Pre-trained models found — loading from disk (skipping training)...")
            self.ml_predictor.load_models(model_dir)
            stress_metrics = {"status": "loaded", "path": stress_pkl}
            anomaly_metrics = {"status": "loaded", "path": anomaly_pkl}
            log(f"  Stress model loaded:  {stress_pkl}")
            log(f"  Anomaly model loaded: {anomaly_pkl}")
        else:
            # ── Cold path: train from scratch and save ──
            log("\n[3a] No saved models found — training ML models...")
            stress_metrics = self.ml_predictor.train_stress_model(self.feature_data)
            anomaly_metrics = self.ml_predictor.train_anomaly_model(self.feature_data)
            log(f"  Stress model: {stress_metrics}")
            log(f"  Anomaly model: {anomaly_metrics}")
            self.ml_predictor.save_models(model_dir)
            log(f"  Models saved to: {model_dir}")

        results["ml_models"] = {
            "stress": stress_metrics,
            "anomaly": anomaly_metrics,
        }

        # Load or build RAG memory
        rag_dir = os.path.join(output_dir, "rag_memory")
        rag_entries_file = os.path.join(rag_dir, "rag_entries.json")

        if os.path.exists(rag_entries_file):
            # ── Fast path: RAG memory already persisted ──
            log("\n[3b] Existing RAG memory found — loading from disk (skipping rebuild)...")
            self.memory.load(rag_dir)
            log(f"  RAG memory loaded: {self.memory.get_stats()}")
        else:
            # ── Cold path: build and persist ──
            log("\n[3b] Building RAG memory from scratch...")
            self._populate_rag_memory()
            self.memory.save(rag_dir)
            log(f"  RAG memory built & saved: {self.memory.get_stats()}")

        results["rag"] = self.memory.get_stats()

        # Generate sample insights
        log("\n[3c] Generating sample health insights...")
        sample_insights = self._generate_sample_insights()
        results["sample_insights"] = sample_insights

        for insight in sample_insights:
            log(f"\n--- Insight for {insight['user_id']} ---")
            log(insight["insight"])

        # ── Finalize ────────────────────────────────────────────────────
        results["end_time"] = time.time()
        results["duration_seconds"] = round(results["end_time"] - results["start_time"], 2)

        # Save pipeline logs
        log_path = os.path.join(output_dir, "pipeline_logs.txt")
        with open(log_path, "w") as f:
            f.write("\n".join(log_lines))

        # Save full results
        results_path = os.path.join(output_dir, "pipeline_results.json")
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        log(f"\nPipeline results saved: {results_path}")

        log(f"\n{'=' * 70}")
        log(f"PIPELINE COMPLETE in {results['duration_seconds']}s")
        log(f"{'=' * 70}")

        return results

    # =========================================================================
    # Real-Time Streaming
    # =========================================================================

    def process_realtime(self, user_id: str, sample: Dict, battery_level: int = 100) -> Dict:
        """
        Process a single real-time sample and generate insights.

        Args:
            user_id: User identifier
            sample: Dict with raw sensor readings

        Returns:
            Dict with cleaned data, alerts, stress prediction, and insight
        """
        # Step 0: Emergency Detection (Phase F)
        emergency = self._detect_emergency(sample)
        if emergency:
            alerts = [{"severity": "CRITICAL", "message": emergency["message"]}]
            logger.critical(f"EMERGENCY DETECTED: {emergency['message']}")
        else:
            alerts = []

        # Step 1: Clean the sample
        cleaned = self.streaming_preprocessor.process_sample(user_id, sample)

        # Step 2: Check rules
        alerts.extend(RuleEngine.evaluate(cleaned))

        # Step 3: ML predictions
        stress_pred = self.ml_predictor.predict_stress(cleaned)
        is_anomaly, anomaly_score = self.ml_predictor.predict_anomaly(cleaned)
        cleaned["predicted_stress"] = stress_pred
        cleaned["anomaly_score"] = anomaly_score

        # Step 4: Compare to baseline (personalization)
        if self.config.personalization.enable_personalization:
            deviation = self.personalization_engine.detect_deviations(user_id, cleaned)
            cleaned["user_state"] = self.personalization_engine.determine_user_state(user_id, cleaned)
            cleaned["adaptive_strategy"] = self.personalization_engine.get_adaptive_coaching(user_id, cleaned["user_state"])
            
            # ★ NEW: Refresh Phase K & L & 🧬 Context
            profile = self.personalization_engine.refresh_user_context(user_id, cleaned)
            self.personalization_engine.rewards.update_streak(user_id)
            
            # Inject twin summary into metrics for the LLM
            cleaned["twin_summary"] = profile.twin_summary
            
            # ★ NEW: Dynamic Plan Adjustment
            self.personalization_engine.planner.adjust_plan_dynamically(user_id, cleaned["user_state"], cleaned)
        else:
            deviation = self._compute_deviation(user_id, cleaned)

        # Phase M: Privacy Check (Biometrics)
        if not self.personalization_engine.privacy.check_permission("biometrics"):
            logger.warning(f"Data processing blocked for {user_id}: Biometric permission denied.")
            return {"status": "blocked", "reason": "privacy_permission_denied"}

        # Step 1: Battery check and Phase N: Offload logic
        battery_level = self.battery_manager.get_battery_level()
        complexity = self._estimate_complexity(sample)
        
        if self.personalization_engine.sync.should_offload_task(complexity, battery_level):
            offloaded_res = self.personalization_engine.sync.offload_task("process_realtime", sample)
            if offloaded_res:
                return offloaded_res # Successfully offloaded
                
        # (Continue normal processing)
        history = self.feature_data[self.feature_data["user_id"] == user_id] if self.feature_data is not None else pd.DataFrame()
        predictions = self.predictive_engine.run_prediction_pipeline(user_id, cleaned, history)
        cleaned.update(predictions)

        # Step 6: Generate insight (only if significant event or state change)
        insight = None
        fusion_result = None
        
        # Phase G: Event-Triggered Inference
        should_infer = self._should_run_inference(user_id, cleaned) or alerts or is_anomaly
        
        if should_infer:
            # Calculate memory priority
            importance = self.memory._calculate_importance(cleaned)
            tier = "event" if importance > 0.8 else "short-term"
            
            # Store in RAG memory
            summary = self._create_state_summary(cleaned)
            self.memory.store(cleaned, summary, user_id, importance=importance, tier=tier)
            
            # Phase N: Sync memory cross-device
            self.personalization_engine.sync.sync_memory_entry({
                "summary": summary, "user_id": user_id, "importance": importance, "tier": tier
            })

            # Retrieve similar past states
            rag_context = self.memory.retrieve(summary, user_id=user_id, top_k=3)
            cleaned['past_patterns'] = rag_context

            # Multi-Agent Intelligent Reasoning (Phase E/F/G/H)
            intelligent_res = self.intelligent_engine.generate_intelligent_response(
                user_message="", # Real-time insights have no user message
                health_data=cleaned,
                context={"alerts": alerts},
                battery_level=battery_level
            )
            insight = intelligent_res["response"]
            fusion_result = intelligent_res.get("metadata", {})
            
            # Track last inference
            if not hasattr(self, "_last_inference_data"):
                self._last_inference_data = {}
            self._last_inference_data[user_id] = cleaned.copy()

        return {
            "cleaned": cleaned,
            "alerts": alerts,
            "stress_prediction": round(stress_pred, 1),
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 4),
            "deviation": deviation,
            "predictions": predictions,
            "insight": insight,
            "fusion": fusion_result,
        }

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _compute_baselines(self):
        """Compute per-user baselines for personalization."""
        if self.feature_data is None:
            return

        for user_id, udf in self.feature_data.groupby("user_id"):
            self.user_baselines[user_id] = {}
            for col in ["heart_rate_bpm", "hrv_ms", "spo2_pct", "stress_score",
                        "computed_stress", "health_score"]:
                if col in udf.columns:
                    self.user_baselines[user_id][col] = {
                        "mean": float(udf[col].mean()),
                        "std": float(udf[col].std()),
                        "p10": float(udf[col].quantile(0.10)),
                        "p90": float(udf[col].quantile(0.90)),
                    }

        logger.info(f"Baselines computed for {len(self.user_baselines)} users")

    def _compute_deviation(self, user_id: str, current: Dict) -> Dict:
        """Compute how current values deviate from the user's baseline."""
        baseline = self.user_baselines.get(user_id, {})
        deviation = {}

        for key in ["heart_rate_bpm", "hrv_ms", "stress_score"]:
            if key in current and key in baseline:
                b = baseline[key]
                std = b["std"] if b["std"] > 0 else 1
                deviation[f"{key}_deviation"] = (current[key] - b["mean"]) / std

        return deviation

    def _populate_rag_memory(self):
        """Populate RAG memory with representative health states."""
        if self.feature_data is None:
            return

        # Sample representative states (every hour)
        for user_id, udf in self.feature_data.groupby("user_id"):
            hourly = udf.set_index("timestamp").resample("1h").mean(numeric_only=True)

            for ts, row in hourly.iterrows():
                state = row.to_dict()
                state = {k: float(v) for k, v in state.items() if not np.isnan(v)}
                summary = self._create_state_summary(state)
                self.memory.store(state, summary, user_id)

        logger.info(f"RAG memory populated: {self.memory.get_stats()['total_entries']} entries")

    def _detect_emergency(self, data: Dict) -> Optional[Dict]:
        """Real-time emergency detection (HR extremes, potential hypoxia)."""
        hr = data.get("heart_rate_bpm", 0) or 0
        intensity = data.get("activity_intensity", 0) or 0
        spo2 = data.get("spo2_pct", 100) or 100
        
        if hr > 160 and intensity == 0:
            return {"type": "HR_EXTREME", "message": "Heart rate > 160 bpm while sedentary!"}
            
        if spo2 < 85:
            return {"type": "HYPOXIA", "message": "SpO2 dropped below 85%!"}
            
        return None

    def _should_run_inference(self, user_id: str, new_data: Dict) -> bool:
        """Phase G: Event-Triggered Inference logic."""
        if not hasattr(self, "_last_inference_data"):
            return True
            
        last_data = self._last_inference_data.get(user_id)
        if not last_data:
            return True
            
        # Check for significant delta
        hr_delta = abs(new_data.get("heart_rate_bpm", 0) - last_data.get("heart_rate_bpm", 0))
        stress_delta = abs(new_data.get("computed_stress", 0) - last_data.get("computed_stress", 0))
        
        if hr_delta > 10 or stress_delta > 15:
            return True
            
        return False

    def _get_dynamic_interval(self, battery_level: int) -> int:
        """Phase H: Calculate sampling interval based on battery."""
        if battery_level < self.config.battery.battery_critical_threshold:
            return self.config.battery.sampling_critical
        if battery_level < self.config.battery.battery_low_threshold:
            return self.config.battery.sampling_low_power
        return self.config.battery.sampling_normal

    def _create_state_summary(self, state: Dict) -> str:
        """Create a text summary of a health state for embedding."""
        parts = []
        hr = state.get("heart_rate_bpm")
        if hr:
            level = "elevated" if hr > 90 else "low" if hr < 50 else "normal"
            parts.append(f"HR {level} ({hr:.0f}bpm)")

        hrv = state.get("hrv_ms")
        if hrv:
            level = "high" if hrv > 60 else "low" if hrv < 30 else "moderate"
            parts.append(f"HRV {level} ({hrv:.0f}ms)")

        stress = state.get("stress_score") or state.get("computed_stress")
        if stress:
            level = "high" if stress > 70 else "low" if stress < 30 else "moderate"
            parts.append(f"stress {level} ({stress:.0f})")

        health = state.get("health_score")
        if health:
            parts.append(f"health score {health:.0f}/100")

        return "; ".join(parts) if parts else "normal state"

    def _generate_sample_insights(self) -> List[Dict]:
        """Generate sample insights for each user."""
        insights = []

        if self.feature_data is None:
            return insights

        for user_id, udf in self.feature_data.groupby("user_id"):
            # Get latest daily stats
            latest = udf.iloc[-1].to_dict()
            daily_stats = {
                "hr_avg": latest.get("hr_trend_30min", latest.get("heart_rate_bpm")),
                "resting_hr": latest.get("resting_hr"),
                "hrv_avg": latest.get("hrv_ms"),
                "spo2_avg": latest.get("spo2_pct"),
                "total_steps": udf["steps_per_min"].sum() if "steps_per_min" in udf.columns else None,
                "sleep_hours": latest.get("sleep_duration_min", 0) / 60 if latest.get("sleep_duration_min") else None,
                "sleep_quality": latest.get("sleep_quality_score"),
                "stress_avg": latest.get("computed_stress") or latest.get("stress_score"),
                "health_score": latest.get("health_score"),
                "anomaly_count": udf.get("anomaly_score", pd.Series([0])).sum() if "anomaly_score" in udf.columns else 0,
            }

            # Check alerts
            alerts = RuleEngine.evaluate(latest)

            # Get RAG context
            summary = self._create_state_summary(latest)
            rag_context = self.memory.retrieve(summary, user_id=user_id, top_k=3)

            # Multimodal fusion insight (replaces single-model generate_insight)
            fusion_result = self.fusion.fuse(
                data=latest,
                rag_context=rag_context,
                alerts=alerts,
                use_deep_model=True,  # Use gemma3:12b for batch insights
            )
            insight = fusion_result["fused_insight"]
            daily_summary = self.reasoner.generate_daily_summary(daily_stats, user_id)

            insights.append({
                "user_id": user_id,
                "daily_stats": {k: round(v, 2) if isinstance(v, float) else v
                               for k, v in daily_stats.items() if v is not None},
                "alerts": alerts,
                "insight": insight,
                "daily_summary": daily_summary,
                "fusion_consistency": fusion_result["consistency"]["consistency_score"],
                "model_used": fusion_result["model_used"],
            })

        return insights

    def get_user_dashboard(self, user_id: str) -> Dict:
        """Get a complete dashboard snapshot for a user."""
        if self.feature_data is None:
            return {"error": "Pipeline not run yet"}

        udf = self.feature_data[self.feature_data["user_id"] == user_id]
        if len(udf) == 0:
            return {"error": f"User {user_id} not found"}

        latest = udf.iloc[-1].to_dict()
        baseline = self.user_baselines.get(user_id, {})

        return {
            "user_id": user_id,
            "current": {
                "heart_rate": latest.get("heart_rate_bpm"),
                "hrv": latest.get("hrv_ms"),
                "spo2": latest.get("spo2_pct"),
                "stress": latest.get("computed_stress") or latest.get("stress_score"),
                "health_score": latest.get("health_score"),
                "activity": latest.get("activity_level"),
                "sleep_quality": latest.get("sleep_quality_score"),
                "recovery": latest.get("recovery_score"),
            },
            "baseline": baseline,
            "anomalies_today": int(udf.tail(1440).get("anomaly_score", pd.Series([0])).sum()),
            "total_steps_today": int(udf.tail(1440)["steps_per_min"].sum()) if "steps_per_min" in udf.columns else 0,
        }

    # =========================================================================
    # ★ NEW: Intelligent Engine Methods
    # =========================================================================

    def start_intelligent_conversation(self, user_id: str) -> Dict:
        """
        Start an intelligent conversation session with all upgrades.

        Returns:
            Session info with session ID and engine status
        """
        session_id = self.intelligent_engine.start_conversation(user_id)
        
        return {
            'session_id': session_id,
            'user_id': user_id,
            'features_enabled': {
                'conversation_memory': self.config.intelligence.enable_conversation_memory,
                'tone_adaptation': self.config.intelligence.enable_tone_adaptation,
                'confidence_scoring': self.config.intelligence.enable_confidence_scoring,
                'hallucination_detection': self.config.intelligence.enable_hallucination_detection,
                'self_correction': self.config.intelligence.enable_self_correction,
                'reasoning_validation': self.config.intelligence.enable_reasoning_validation,
                'structured_output': self.config.intelligence.enable_structured_output,
                'context_prioritization': self.config.intelligence.enable_context_prioritization,
                'chain_of_thought': self.config.intelligence.enable_chain_of_thought,
                'adaptive_length': self.config.intelligence.enable_adaptive_length,
            },
            'engine_status': self.intelligent_engine.get_engine_status()
        }

    def respond_intelligently(self, user_message: str, health_data: Dict,
                            user_id: Optional[str] = None,
                            response_type: str = 'insight') -> Dict:
        """
        Generate intelligent response using the full intelligence pipeline.

        Args:
            user_message: User's input message
            health_data: Current health metrics
            user_id: Optional user ID (uses current session if not provided)
            response_type: Type of response ('insight', 'recommendation', 'analysis')

        Returns:
            Complete response package with confidence, validation, structure
        """
        if user_id and not self.intelligent_engine.current_user_id:
            self.start_intelligent_conversation(user_id)

        response_package = self.intelligent_engine.generate_intelligent_response(
            user_message, health_data, response_type
        )

        logger.info(f"Generated {response_type} with confidence: "
                   f"{response_package['metadata']['confidence']:.2f}")

        return response_package

    def generate_intelligent_daily_insight(self, health_metrics: Dict,
                                          user_id: Optional[str] = None) -> Dict:
        """
        Generate comprehensive daily insight with all intelligence features.

        Args:
            health_metrics: Daily health metrics
            user_id: User identifier

        Returns:
            Structured daily insight with validation and confidence
        """
        if user_id and not self.intelligent_engine.current_user_id:
            self.start_intelligent_conversation(user_id)

        return self.intelligent_engine.generate_daily_insight(health_metrics, user_id)

    def get_intelligent_engine_report(self) -> Dict:
        """Get comprehensive report on intelligence engine state."""
        return {
            'status': self.intelligent_engine.get_engine_status(),
            'confidence_stats': self.intelligent_engine.confidence_scorer.get_confidence_summary(),
            'conversation_sessions': len(self.intelligent_engine.conversation_memory.sessions),
            'reasoning_capabilities': {
                'chain_of_thought': self.config.intelligence.enable_chain_of_thought,
                'context_prioritization': self.config.intelligence.enable_context_prioritization,
                'multi_step_reasoning': True,
            },
            'quality_assurance': {
                'hallucination_detection': self.config.intelligence.enable_hallucination_detection,
                'confidence_scoring': self.config.intelligence.enable_confidence_scoring,
                'output_validation': self.config.intelligence.enable_reasoning_validation,
                'self_correction': self.config.intelligence.enable_self_correction,
                'max_correction_attempts': self.config.intelligence.max_correction_attempts,
            },
            'personalization': {
                'tone_adaptation': self.config.intelligence.enable_tone_adaptation,
                'conversation_memory': self.config.intelligence.enable_conversation_memory,
                'adaptive_response_length': self.config.intelligence.enable_adaptive_length,
            }
        }

    # =========================================================================
    # ★ NEW: Phase M & N Orchestration
    # =========================================================================

    def set_privacy_permission(self, user_id: str, data_type: str, allowed: bool):
        """Update user privacy permissions."""
        self.personalization_engine.privacy.set_permission(data_type, allowed)
        return {"status": "success", "permission": data_type, "allowed": allowed}

    def export_user_data(self, user_id: str) -> Dict:
        """Export all user data to a readable format (Visibility)."""
        if not self.config.privacy.enable_data_export:
            return {"status": "error", "message": "Data export disabled in config."}
            
        profile = self.personalization_engine.get_profile(user_id)
        # In a real app, this would bundle all files into a ZIP
        return {
            "status": "success",
            "data": {
                "profile": asdict(profile),
                "goals": self.personalization_engine.goals.get_goal_summary(user_id),
                "rewards": self.personalization_engine.rewards.get_reward_report(user_id)
            }
        }

    def delete_user_account(self, user_id: str) -> Dict:
        """GDPR Purge - Delete all user data."""
        self.personalization_engine.privacy.purge_user_data()
        return {"status": "success", "message": "All user data has been purged."}

    def trigger_phone_sync(self, user_id: str) -> Dict:
        """Manually trigger a synchronization with the phone."""
        self.personalization_engine.sync.process_sync_queue()
        return {"status": "success", "message": "Sync queue processed."}

    def _estimate_complexity(self, data: Dict) -> int:
        """Estimate task complexity for offloading decisions."""
        return len(data) + (5 if "anomaly_score" in data else 0)

    # =========================================================================
    # ★ NEW: Phase 🧬: Digital Twin Orchestration
    # =========================================================================

    def run_twin_simulation(self, user_id: str, scenario: Dict) -> Dict:
        """Run a 'what-if' health scenario using the Digital Twin."""
        res = self.personalization_engine.twin_simulator.simulate_what_if(user_id, scenario)
        
        # Log action for learning
        self.personalization_engine.learning.learn_from_actions(user_id, {
            "type": "simulation_run", "scenario": scenario.get("name", "custom")
        })
        return res

    def get_readiness_report(self, user_id: str) -> Dict:
        """Get the current readiness and recovery status from the Twin."""
        return self.personalization_engine.twin.get_summary(user_id)

    def analyze_workout_feasibility(self, user_id: str, intensity: int) -> Dict:
        """Analyze if a specific workout intensity is safe/optimal today."""
        return self.personalization_engine.twin_simulator.simulate_workout_tradeoff(user_id, intensity)

    # =========================================================================
    # ★ NEW: Phase K & L Orchestration
    # =========================================================================

    def set_user_goal(self, user_id: str, goal_type: str, target: float, unit: str,
                      start_value: float, duration_days: int = 30) -> Dict:
        """Set a new health goal for a user."""
        goal = self.personalization_engine.goals.set_goal(
            user_id, goal_type, target, unit, start_value, duration_days
        )
        # Record action for learning
        self.personalization_engine.learning.learn_from_actions(user_id, {"type": "goal_set", "goal_type": goal_type})
        return {"status": "success", "goal_id": goal.id}

    def get_daily_plan(self, user_id: str) -> Dict:
        """Generate or retrieve the daily plan for a user."""
        profile = self.personalization_engine.get_profile(user_id)
        active_goals = self.personalization_engine.goals.get_active_goals(user_id)
        
        # Determine user state (if not already known from recent processing)
        # In a real app, we'd use the last known state
        user_state = getattr(profile, "last_state", "balanced")
        
        # Convert goals to dict for the planner
        goal_dicts = [{"type": g.type, "target": g.target_value} for g in active_goals]
        
        plan = self.personalization_engine.planner.generate_daily_plan(user_id, goal_dicts, user_state)
        return self.personalization_engine.planner.get_plan_summary(user_id)

    def submit_user_feedback(self, user_id: str, insight_id: str, rating: int,
                             comment: Optional[str] = None, topics: Optional[List[str]] = None) -> Dict:
        """Submit user feedback for learning and reinforcement."""
        self.personalization_engine.learning.capture_feedback(
            user_id, insight_id, rating, comment, {"topics": topics or []}
        )
        # Reward for feedback
        self.personalization_engine.rewards.add_points(user_id, 10, "Providing feedback")
        return {"status": "success", "message": "Feedback captured. Learning system updated."}

    def get_gamification_status(self, user_id: str) -> Dict:
        """Get the user's current points, badges, and level."""
        return self.personalization_engine.rewards.get_reward_report(user_id)
