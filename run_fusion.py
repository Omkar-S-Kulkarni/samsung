#!/usr/bin/env python3
"""
Multimodal Fusion Runner
=========================
Tests the full multimodal fusion pipeline end-to-end.

Usage:
    python run_fusion.py                  # Run all fusion tests
    python run_fusion.py --full-pipeline  # Load real data + fuse
    python run_fusion.py --prompt-only    # Show serialized prompts only
"""

import argparse
import json
import logging
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.multimodal_fusion import MultimodalFusionEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fusion_runner")

# ─────────────────────────────────────────────────────────────────────────────
# Synthetic test cases covering different health scenarios
# ─────────────────────────────────────────────────────────────────────────────

TEST_CASES = [
    {
        "name": "Scenario A — Stressed & Sleep-Deprived",
        "data": {
            "heart_rate_bpm": 98.0,
            "hrv_ms": 22.0,
            "spo2_pct": 96.5,
            "skin_temp_c": 34.2,
            "steps_per_min": 1.0,
            "activity_intensity": 0,
            "energy_expenditure_proxy": 1.2,
            "step_intensity_15min": 15.0,
            "sleep_duration_min": 280.0,
            "sleep_quality_score": 42.0,
            "deep_ratio": 0.10,
            "rem_ratio": 0.12,
            "sleep_consistency": 55.0,
            "computed_stress": 74.0,
            "recovery_score": 32.0,
            "health_score": 55.0,
            "hr_trend_30min": 96.0,
            "anomaly_hr_spike": 0,
            "anomaly_hrv_drop": 1,
            "anomaly_low_spo2": 0,
            "anomaly_critical_hr": 0,
            "anomaly_score": 1,
            "anomaly_flags": "HRV_DROP;",
        },
        "alerts": [
            {"severity": "WARNING", "message": "HRV has dropped significantly (22 ms). High stress or fatigue likely."}
        ],
    },
    {
        "name": "Scenario B — Post-Exercise Recovery",
        "data": {
            "heart_rate_bpm": 78.0,
            "hrv_ms": 68.0,
            "spo2_pct": 98.0,
            "skin_temp_c": 36.1,
            "steps_per_min": 2.0,
            "activity_intensity": 1,
            "energy_expenditure_proxy": 2.4,
            "step_intensity_15min": 30.0,
            "sleep_duration_min": 450.0,
            "sleep_quality_score": 82.0,
            "deep_ratio": 0.22,
            "rem_ratio": 0.21,
            "sleep_consistency": 88.0,
            "computed_stress": 25.0,
            "recovery_score": 78.0,
            "health_score": 84.0,
            "hr_trend_30min": 80.0,
            "anomaly_hr_spike": 0,
            "anomaly_hrv_drop": 0,
            "anomaly_low_spo2": 0,
            "anomaly_critical_hr": 0,
            "anomaly_score": 0,
            "anomaly_flags": "",
        },
        "alerts": [],
    },
    {
        "name": "Scenario C — Critical SpO2 + High HR",
        "data": {
            "heart_rate_bpm": 115.0,
            "hrv_ms": 18.0,
            "spo2_pct": 88.0,
            "skin_temp_c": 37.8,
            "steps_per_min": 0.5,
            "activity_intensity": 0,
            "energy_expenditure_proxy": 1.0,
            "step_intensity_15min": 5.0,
            "sleep_duration_min": 360.0,
            "sleep_quality_score": 38.0,
            "deep_ratio": 0.08,
            "rem_ratio": 0.09,
            "sleep_consistency": 40.0,
            "computed_stress": 85.0,
            "recovery_score": 18.0,
            "health_score": 38.0,
            "hr_trend_30min": 112.0,
            "anomaly_hr_spike": 1,
            "anomaly_hrv_drop": 1,
            "anomaly_low_spo2": 1,
            "anomaly_critical_hr": 0,
            "anomaly_score": 3,
            "anomaly_flags": "HR_SPIKE;HRV_DROP;LOW_SPO2;",
        },
        "alerts": [
            {"severity": "WARNING",  "message": "Blood oxygen low (88.0%). Consider consulting a doctor."},
            {"severity": "WARNING",  "message": "HRV has dropped significantly (18 ms)."},
            {"severity": "WARNING",  "message": "Sustained high stress detected (score: 85, HRV: 18ms)."},
        ],
    },
    {
        "name": "Scenario D — Active & Healthy Baseline",
        "data": {
            "heart_rate_bpm": 62.0,
            "hrv_ms": 85.0,
            "spo2_pct": 99.0,
            "skin_temp_c": 33.5,
            "steps_per_min": 9.0,
            "activity_intensity": 2,
            "energy_expenditure_proxy": 7.0,
            "step_intensity_15min": 135.0,
            "sleep_duration_min": 490.0,
            "sleep_quality_score": 91.0,
            "deep_ratio": 0.28,
            "rem_ratio": 0.24,
            "sleep_consistency": 92.0,
            "computed_stress": 18.0,
            "recovery_score": 92.0,
            "health_score": 94.0,
            "hr_trend_30min": 65.0,
            "anomaly_hr_spike": 0,
            "anomaly_hrv_drop": 0,
            "anomaly_low_spo2": 0,
            "anomaly_critical_hr": 0,
            "anomaly_score": 0,
            "anomaly_flags": "",
        },
        "alerts": [],
    },
    {
        "name": "Scenario E — Sparse Data (Only Biosignals Available)",
        "data": {
            "heart_rate_bpm": 88.0,
            "hrv_ms": 34.0,
            "spo2_pct": 95.5,
            # No sleep, activity, or stress data
        },
        "alerts": [],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def section(title: str, char: str = "=", width: int = 70):
    print(f"\n{char * width}")
    print(f"  {title}")
    print(f"{char * width}")


def print_consistency(report: dict):
    score = report["consistency_score"]
    bar = "█" * (score // 5) + "░" * (20 - score // 5)
    print(f"  Consistency Score: {score}/100  [{bar}]")

    present = [m for m, v in report["modalities_present"].items() if v]
    missing = [m for m, v in report["modalities_present"].items() if not v]
    print(f"  Modalities present : {', '.join(present) if present else 'none'}")
    if missing:
        print(f"  Modalities missing : {', '.join(missing)}")

    for issue in report.get("issues", []):
        print(f"  ⚠  Issue      : {issue}")
    for conf in report.get("confirmations", []):
        print(f"  ✓  Confirmed  : {conf}")


def print_fusion_result(name: str, result: dict, show_prompt: bool = False):
    section(name, char="─", width=68)
    print(f"  Model used    : {result['model_used']}")
    print(f"  Latency       : {result['latency_ms']:.1f} ms")
    print()
    print_consistency(result["consistency"])
    print()
    print("  ── Fused Insight ──────────────────────────────────────")
    for line in result["fused_insight"].split("\n"):
        print(f"  {line}")

    if show_prompt:
        print()
        print("  ── Serialized Multimodal Prompt ───────────────────────")
        for line in result["serialized_input"].split("\n"):
            print(f"  {line}")

    # Prompt size info
    _, est_tokens = MultimodalFusionEngine(PipelineConfig()).optimize_prompt_size(
        result.get("_data", {})
    ) if "_data" in result else (None, None)


# ─────────────────────────────────────────────────────────────────────────────
# Test suites
# ─────────────────────────────────────────────────────────────────────────────

def run_synthetic_tests(engine: MultimodalFusionEngine, show_prompts: bool = False):
    section("MULTIMODAL FUSION — SYNTHETIC SCENARIO TESTS")
    print(f"  Running {len(TEST_CASES)} test cases...")

    all_results = []
    total_latency = 0

    for tc in TEST_CASES:
        result = engine.fuse(
            data=tc["data"],
            rag_context=None,
            alerts=tc.get("alerts", []),
        )
        result["_data"] = tc["data"]
        all_results.append((tc["name"], result))
        total_latency += result["latency_ms"]
        print_fusion_result(tc["name"], result, show_prompt=show_prompts)

    section("SUMMARY", char="═")
    print(f"  Total scenarios  : {len(TEST_CASES)}")
    print(f"  Total latency    : {total_latency:.1f} ms")
    print(f"  Avg latency      : {total_latency / len(TEST_CASES):.1f} ms/scenario")

    models_used = [r["model_used"] for _, r in all_results]
    llm_count = sum(1 for m in models_used if "ollama" in m)
    fb_count = len(models_used) - llm_count
    print(f"  LLM responses    : {llm_count}/{len(TEST_CASES)}")
    print(f"  Fallback used    : {fb_count}/{len(TEST_CASES)}")

    scores = [r["consistency"]["consistency_score"] for _, r in all_results]
    print(f"  Avg consistency  : {np.mean(scores):.1f}/100")
    print(f"  Min consistency  : {min(scores)}/100  (Scenario: {all_results[scores.index(min(scores))][0]})")

    return all_results


def run_prompt_optimization_test(engine: MultimodalFusionEngine):
    section("PROMPT SIZE OPTIMIZATION TEST")
    full_data = TEST_CASES[0]["data"]  # Use Scenario A (most complete)

    prompt_full, tokens_full = engine.optimize_prompt_size(full_data)
    print(f"  Full data prompt  : {len(prompt_full)} chars ≈ {tokens_full} tokens")

    # Sparse: only 4 keys
    sparse_data = {k: v for k, v in full_data.items() if k in [
        "heart_rate_bpm", "hrv_ms", "spo2_pct", "computed_stress"
    ]}
    prompt_sparse, tokens_sparse = engine.optimize_prompt_size(sparse_data)
    print(f"  Sparse data prompt: {len(prompt_sparse)} chars ≈ {tokens_sparse} tokens")
    print(f"  Token reduction   : {tokens_full - tokens_sparse} tokens ({100*(1 - tokens_sparse/tokens_full):.1f}% smaller)")


def run_cross_signal_validation_tests(engine: MultimodalFusionEngine):
    section("CROSS-SIGNAL CONSISTENCY VALIDATION TESTS")

    edge_cases = [
        {
            "name": "HR spike + high HRV (contradictory)",
            "data": {"heart_rate_bpm": 145.0, "hrv_ms": 90.0, "anomaly_hr_spike": 1,
                     "computed_stress": 30.0, "recovery_score": 85.0},
        },
        {
            "name": "High stress + high recovery (contradictory)",
            "data": {"computed_stress": 80.0, "recovery_score": 88.0,
                     "heart_rate_bpm": 75.0, "hrv_ms": 55.0},
        },
        {
            "name": "Low SpO2 during vigorous activity (expected)",
            "data": {"spo2_pct": 93.0, "activity_intensity": 3, "anomaly_low_spo2": 1,
                     "heart_rate_bpm": 155.0, "hrv_ms": 30.0},
        },
        {
            "name": "Low HR + high HRV (confirmed parasympathetic)",
            "data": {"heart_rate_bpm": 52.0, "hrv_ms": 75.0, "computed_stress": 15.0},
        },
    ]

    for ec in edge_cases:
        report = engine.validate_cross_signal_consistency(ec["data"])
        score = report["consistency_score"]
        print(f"\n  ── {ec['name']}")
        print(f"     Score: {score}/100")
        for issue in report["issues"]:
            print(f"     ⚠  {issue}")
        for conf in report["confirmations"]:
            print(f"     ✓  {conf}")


def run_full_pipeline_fusion(engine: MultimodalFusionEngine, data_dir: str = "data"):
    """Load real CSV data, run the full pipeline, then fuse outputs."""
    section("FULL PIPELINE FUSION — REAL DATA")

    try:
        from pipeline.health_coach import HealthCoach
        from pipeline.ml_models import RuleEngine
        from pipeline.config import PipelineConfig

        config = PipelineConfig()
        config.data_dir = data_dir

        print("  Running full pipeline (preprocess → features → ML)...")
        coach = HealthCoach(config)
        results = coach.run_full_pipeline(data_dir, "output")

        if coach.feature_data is None:
            print("  ✗ No feature data — skipping fusion on real data")
            return

        # Sample one record per user for fusion
        print("\n  Fusing latest state per user:")
        for user_id, udf in coach.feature_data.groupby("user_id"):
            latest = udf.iloc[-1].to_dict()
            # Sanitize NaN
            latest = {k: (None if (isinstance(v, float) and np.isnan(v)) else v)
                      for k, v in latest.items()}

            alerts = RuleEngine.evaluate(latest)
            rag_ctx = coach.memory.retrieve(
                coach._create_state_summary(latest), user_id=user_id, top_k=3
            )

            fusion = engine.fuse(latest, rag_context=rag_ctx, alerts=alerts,
                                  use_deep_model=False)
            print(f"\n  👤 {user_id}")
            print(f"     Model     : {fusion['model_used']}")
            print(f"     Latency   : {fusion['latency_ms']:.1f} ms")
            print(f"     Consistency: {fusion['consistency']['consistency_score']}/100")
            print(f"     Insight   : {fusion['fused_insight'][:300]}{'...' if len(fusion['fused_insight']) > 300 else ''}")

    except FileNotFoundError:
        print(f"  ✗ Data directory '{data_dir}' not found. Run: python run_pipeline.py first.")
    except Exception as e:
        print(f"  ✗ Full pipeline fusion failed: {e}")
        import traceback
        traceback.print_exc()


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Multimodal Fusion Test Runner")
    parser.add_argument("--full-pipeline", action="store_true",
                        help="Load real CSV data and fuse pipeline outputs")
    parser.add_argument("--prompt-only", action="store_true",
                        help="Print serialized prompts for each test case")
    parser.add_argument("--data-dir", default="data",
                        help="Data directory for full pipeline mode")
    args = parser.parse_args()

    print("\n🧠 Samsung On-Device GenAI — Multimodal Fusion Engine")
    print("  Combining: Biosignals + Activity + Sleep + Stress + Anomaly")

    config = PipelineConfig()
    engine = MultimodalFusionEngine(config)

    ollama_status = "✓ Online" if engine.ollama_available else "✗ Offline (fallback active)"
    print(f"\n  Ollama status  : {ollama_status}")
    print(f"  Fast model     : {config.model.llm_model_name}")
    print(f"  Reasoning model: {config.model.llm_model_reasoning}")
    print(f"  Embedding model: {config.model.embedding_model}")

    # Always run synthetic tests
    run_synthetic_tests(engine, show_prompts=args.prompt_only)

    # Cross-signal validation
    run_cross_signal_validation_tests(engine)

    # Prompt optimization
    run_prompt_optimization_test(engine)

    # Optional: full pipeline
    if args.full_pipeline:
        run_full_pipeline_fusion(engine, data_dir=args.data_dir)

    print("\n✅  Multimodal fusion tests complete.\n")


if __name__ == "__main__":
    main()
