#!/usr/bin/env python3
from typing import Dict
"""
Personalized Recommendation Runner
=====================================
Usage:
    python3 run_recommendations.py               # Synthetic scenarios
    python3 run_recommendations.py --full        # Real CSV data
"""

import argparse
import logging
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.recommendation_engine import PersonalizedRecommendationEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rec_runner")

# ─────────────────────────────────────────────────────────────────────────────
# Synthetic test cases
# ─────────────────────────────────────────────────────────────────────────────

SCENARIOS = [
    {
        "name": "Alex — Overworked & Sleep-Deprived (Sedentary)",
        "data": {
            "heart_rate_bpm": 95.0,
            "hrv_ms": 21.0,
            "spo2_pct": 96.0,
            "skin_temp_c": 34.1,
            "resting_hr": 88.0,
            "steps_per_min": 0.5,
            "activity_intensity": 0,
            "energy_expenditure_proxy": 1.1,
            "step_intensity_15min": 8.0,
            "sleep_duration_min": 265.0,
            "sleep_quality_score": 38.0,
            "deep_ratio": 0.08,
            "rem_ratio": 0.10,
            "sleep_consistency": 42.0,
            "computed_stress": 78.0,
            "recovery_score": 28.0,
            "health_score": 42.0,
            "hr_trend_30min": 93.0,
            "anomaly_hrv_drop": 1,
            "anomaly_score": 1,
        },
        "alerts": [
            {"severity": "WARNING",
             "message": "HRV has dropped significantly (21 ms). Fatigue or stress likely."},
        ],
    },
    {
        "name": "Sam — Moderately Active, Good Baseline",
        "data": {
            "heart_rate_bpm": 72.0,
            "hrv_ms": 52.0,
            "spo2_pct": 98.0,
            "skin_temp_c": 33.4,
            "resting_hr": 65.0,
            "steps_per_min": 5.0,
            "activity_intensity": 2,
            "energy_expenditure_proxy": 4.2,
            "step_intensity_15min": 75.0,
            "sleep_duration_min": 420.0,
            "sleep_quality_score": 72.0,
            "deep_ratio": 0.18,
            "rem_ratio": 0.20,
            "sleep_consistency": 78.0,
            "computed_stress": 32.0,
            "recovery_score": 68.0,
            "health_score": 74.0,
            "hr_trend_30min": 74.0,
            "anomaly_score": 0,
        },
        "alerts": [],
    },
    {
        "name": "Jordan — Elite Athlete, Peak Condition",
        "data": {
            "heart_rate_bpm": 52.0,
            "hrv_ms": 88.0,
            "spo2_pct": 99.0,
            "skin_temp_c": 33.0,
            "resting_hr": 48.0,
            "steps_per_min": 10.0,
            "activity_intensity": 3,
            "energy_expenditure_proxy": 9.5,
            "step_intensity_15min": 145.0,
            "sleep_duration_min": 510.0,
            "sleep_quality_score": 92.0,
            "deep_ratio": 0.27,
            "rem_ratio": 0.23,
            "sleep_consistency": 91.0,
            "computed_stress": 16.0,
            "recovery_score": 93.0,
            "health_score": 95.0,
            "hr_trend_30min": 55.0,
            "anomaly_score": 0,
        },
        "alerts": [],
    },
    {
        "name": "Riley — Critical Warning Signs",
        "data": {
            "heart_rate_bpm": 118.0,
            "hrv_ms": 16.0,
            "spo2_pct": 87.5,
            "skin_temp_c": 37.9,
            "resting_hr": 105.0,
            "steps_per_min": 0.2,
            "activity_intensity": 0,
            "energy_expenditure_proxy": 1.0,
            "step_intensity_15min": 3.0,
            "sleep_duration_min": 310.0,
            "sleep_quality_score": 30.0,
            "deep_ratio": 0.06,
            "rem_ratio": 0.08,
            "sleep_consistency": 35.0,
            "computed_stress": 88.0,
            "recovery_score": 14.0,
            "health_score": 32.0,
            "hr_trend_30min": 115.0,
            "anomaly_hr_spike": 1,
            "anomaly_hrv_drop": 1,
            "anomaly_low_spo2": 1,
            "anomaly_score": 3,
        },
        "alerts": [
            {"severity": "CRITICAL",
             "message": "Blood oxygen severely low (87.5%). Seek immediate medical attention."},
            {"severity": "WARNING",
             "message": "HRV critically low (16 ms). Complete rest required."},
            {"severity": "WARNING",
             "message": "Sustained high stress (88/100) + low HRV — physiological overload."},
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Display helpers
# ─────────────────────────────────────────────────────────────────────────────

PRIORITY_ICONS = {
    "CRITICAL": "🚨",
    "HIGH":     "🔴",
    "MEDIUM":   "🟡",
    "LOW":      "🟢",
}


def divider(char="═", width=70):
    print(char * width)


def print_result(result: Dict):
    profile = result["profile"].upper()
    model = result["model_used"]
    latency = result["latency_ms"]
    ps = result["priority_summary"]

    print(f"\n  Profile    : {profile}")
    print(f"  Model used : {model}  ({latency:.1f} ms)")
    print(f"  Urgent items: {ps['critical_count']} CRITICAL · {ps['high_count']} HIGH")
    if ps["top_actions"]:
        print(f"  Top actions : {', '.join(ps['top_actions'])}")

    # Rule-based breakdown
    print("\n  ── Rule-Based Recommendations ─────────────────────────────")
    priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    sorted_recs = sorted(
        result["rule_recommendations"],
        key=lambda r: priority_order.index(r.get("priority", "LOW"))
    )
    for rec in sorted_recs:
        icon = PRIORITY_ICONS.get(rec["priority"], "  ")
        print(f"\n  {icon} {rec['category']}")
        print(f"     Target  : {rec['target']}")
        # wrap detail text at ~65 chars
        detail = rec["details"]
        words = detail.split()
        line, out = "", []
        for w in words:
            if len(line) + len(w) + 1 > 65:
                out.append("     " + line)
                line = w
            else:
                line = (line + " " + w).strip()
        if line:
            out.append("     " + line)
        print("\n".join(out))

    # LLM narrative
    print("\n  ── Personalized Narrative ─────────────────────────────────")
    for line in result["llm_narrative"].split("\n"):
        print(f"  {line}")


# ─────────────────────────────────────────────────────────────────────────────
# Full pipeline mode
# ─────────────────────────────────────────────────────────────────────────────

def run_full_pipeline(engine: PersonalizedRecommendationEngine, data_dir: str = "data"):
    divider()
    print("  FULL PIPELINE MODE — REAL DATA")
    divider()
    try:
        from pipeline.health_coach import HealthCoach
        from pipeline.ml_models import RuleEngine

        config = PipelineConfig()
        config.data_dir = data_dir
        coach = HealthCoach(config)
        print("  Running pipeline (preprocess → features → ML)...")
        coach.run_full_pipeline(data_dir, "output")

        if coach.feature_data is None:
            print("  No feature data available.")
            return

        for user_id, udf in coach.feature_data.groupby("user_id"):
            latest = udf.iloc[-1].to_dict()
            latest = {k: (None if isinstance(v, float) and np.isnan(v) else v)
                      for k, v in latest.items()}
            alerts = RuleEngine.evaluate(latest)
            summary = coach._create_state_summary(latest)
            rag_ctx = coach.memory.retrieve(summary, user_id=user_id, top_k=3)

            divider("─")
            print(f"  USER: {user_id}")
            result = engine.recommend(latest, rag_context=rag_ctx, alerts=alerts)
            print_result(result)

    except FileNotFoundError:
        print(f"  Data dir '{data_dir}' not found. Run python3 run_pipeline.py first.")
    except Exception as e:
        import traceback
        print(f"  Pipeline failed: {e}")
        traceback.print_exc()


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Run on real CSV data")
    parser.add_argument("--data-dir", default="data")
    args = parser.parse_args()

    divider("═")
    print("  🏋️  Samsung On-Device — Personalized Recommendation Engine")
    print("  Categories: Sleep · Gym · Cardio · Stress · Recovery · Hydration")
    divider("═")

    config = PipelineConfig()
    engine = PersonalizedRecommendationEngine(config)
    status = "✓ Online" if engine.ollama_available else "✗ Offline (rule-based fallback)"
    print(f"\n  Ollama       : {status}")
    print(f"  Fast model   : {config.model.llm_model_name}")
    print(f"  Deep model   : {config.model.llm_model_reasoning}")

    if args.full:
        run_full_pipeline(engine, args.data_dir)
        return

    # Synthetic scenarios
    total_latency = 0
    for scenario in SCENARIOS:
        divider("═")
        print(f"  {scenario['name']}")
        divider("═")
        result = engine.recommend(
            data=scenario["data"],
            alerts=scenario.get("alerts", []),
            rag_context=None,
            use_deep_model=True,
        )
        print_result(result)
        total_latency += result["latency_ms"]

    # Final summary
    divider("═")
    print(f"  ✅  All {len(SCENARIOS)} scenarios complete.")
    print(f"  Avg latency: {total_latency/len(SCENARIOS):.1f} ms/scenario")
    divider("═")
    print()


if __name__ == "__main__":
    main()
