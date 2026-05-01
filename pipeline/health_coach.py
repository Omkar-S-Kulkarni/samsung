"""
Health Coach Orchestrator
==========================
Main orchestrator that combines preprocessing, feature engineering,
ML models, RAG memory, and LLM reasoning into a unified pipeline.
Supports both batch processing and real-time streaming.
"""

import json
import logging
import os
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from .config import PipelineConfig
from .preprocessing import AdvancedPreprocessor, StreamingPreprocessor
from .feature_engineering import HealthFeatureEngine
from .ml_models import EdgeMLPredictor, RuleEngine
from .rag_system import HealthMemory
from .llm_reasoning import HealthLLMReasoner

logger = logging.getLogger(__name__)


class HealthCoach:
    """
    Intelligent health coach that orchestrates the full pipeline.
    Takes raw wearable data → clean signals → features → insights.
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

        # State
        self.processed_data: Optional[pd.DataFrame] = None
        self.feature_data: Optional[pd.DataFrame] = None
        self.aggregations: Optional[Dict[str, pd.DataFrame]] = None
        self.feature_descriptions: Optional[Dict[str, str]] = None
        self.user_baselines: Dict[str, Dict] = {}

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

        # Compute user baselines
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

    def process_realtime(self, user_id: str, sample: Dict) -> Dict:
        """
        Process a single real-time sample and generate insights.

        Args:
            user_id: User identifier
            sample: Dict with raw sensor readings

        Returns:
            Dict with cleaned data, alerts, stress prediction, and insight
        """
        # Step 1: Clean the sample
        cleaned = self.streaming_preprocessor.process_sample(user_id, sample)

        # Step 2: Rule engine (safety-critical, no latency)
        alerts = RuleEngine.evaluate(cleaned)

        # Step 3: ML predictions
        stress_pred = self.ml_predictor.predict_stress(cleaned)
        is_anomaly, anomaly_score = self.ml_predictor.predict_anomaly(cleaned)
        cleaned["predicted_stress"] = stress_pred
        cleaned["anomaly_score"] = anomaly_score

        # Step 4: Compare to baseline (personalization)
        deviation = self._compute_deviation(user_id, cleaned)

        # Step 5: Generate insight (only if significant event)
        insight = None
        if alerts or is_anomaly or abs(deviation.get("stress_deviation", 0)) > 20:
            # Store in RAG memory
            summary = self._create_state_summary(cleaned)
            self.memory.store(cleaned, summary, user_id)

            # Retrieve similar past states
            rag_context = self.memory.retrieve(summary, user_id=user_id, top_k=3)

            # Generate LLM insight
            insight = self.reasoner.generate_insight(cleaned, rag_context, alerts)

        return {
            "cleaned": cleaned,
            "alerts": alerts,
            "stress_prediction": round(stress_pred, 1),
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 4),
            "deviation": deviation,
            "insight": insight,
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

            # Generate insight
            insight = self.reasoner.generate_insight(latest, rag_context, alerts)
            daily_summary = self.reasoner.generate_daily_summary(daily_stats, user_id)

            insights.append({
                "user_id": user_id,
                "daily_stats": {k: round(v, 2) if isinstance(v, float) else v
                               for k, v in daily_stats.items() if v is not None},
                "alerts": alerts,
                "insight": insight,
                "daily_summary": daily_summary,
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
