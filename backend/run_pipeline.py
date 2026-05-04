#!/usr/bin/env python3
"""
Samsung On-Device GenAI Health Assistant — Main Runner
=======================================================
Execute the full pipeline: preprocessing → features → ML + RAG + LLM insights.

Usage:
    python run_pipeline.py                          # Full batch pipeline
    python run_pipeline.py --realtime               # Real-time simulation
    python run_pipeline.py --data-dir ./data         # Custom data directory
    python run_pipeline.py --output-dir ./output     # Custom output directory
"""

import argparse
import json
import logging
import os
import sys
import time

import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.health_coach import HealthCoach
from pipeline.ml_models import RuleEngine


def setup_logging(level: str = "INFO"):
    """Configure logging with a clean format."""
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def run_batch_pipeline(config: PipelineConfig):
    """Run the complete batch processing pipeline."""
    coach = HealthCoach(config)
    results = coach.run_full_pipeline(config.data_dir, config.output_dir)

    print("\n" + "=" * 70)
    print("PIPELINE RESULTS SUMMARY")
    print("=" * 70)
    print(f"Duration: {results['duration_seconds']}s")
    print(f"Rows processed: {results['preprocessing']['rows']}")
    print(f"Total features: {results['features']['total_features']}")
    print(f"ML stress model: {results['ml_models']['stress']}")
    print(f"ML anomaly model: {results['ml_models']['anomaly']}")
    print(f"RAG memory entries: {results['rag']['total_entries']}")

    class NpEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (np.integer,)): return int(obj)
            if isinstance(obj, (np.floating,)): return float(obj)
            if isinstance(obj, np.ndarray): return obj.tolist()
            return super().default(obj)

    if results.get("sample_insights"):
        print("\n" + "-" * 70)
        print("SAMPLE HEALTH INSIGHTS")
        print("-" * 70)
        for insight in results["sample_insights"]:
            print(f"\n👤 {insight['user_id']}")
            print(f"   Stats: {json.dumps(insight['daily_stats'], indent=6, cls=NpEncoder)}")
            if insight["alerts"]:
                for a in insight["alerts"]:
                    print(f"   🚨 [{a['severity']}] {a['message']}")
            print(f"\n   💡 Insight:\n   {insight['insight']}")
            print(f"\n   📊 Daily Summary:\n   {insight['daily_summary']}")

    # Show user dashboards
    print("\n" + "-" * 70)
    print("USER DASHBOARDS")
    print("-" * 70)
    for user_id in sorted(coach.user_baselines.keys()):
        dashboard = coach.get_user_dashboard(user_id)
        print(f"\n👤 {user_id}")
        for key, val in dashboard["current"].items():
            if val is not None:
                print(f"   {key}: {val:.1f}" if isinstance(val, float) else f"   {key}: {val}")
        print(f"   Steps today: {dashboard['total_steps_today']:,}")
        print(f"   Anomalies today: {dashboard['anomalies_today']}")

    return coach


def run_realtime_simulation(config: PipelineConfig):
    """
    Simulate real-time streaming processing.
    Reads data row-by-row and processes each as a streaming sample.
    """
    print("\n" + "=" * 70)
    print("REAL-TIME PIPELINE SIMULATION")
    print("=" * 70)

    # First run batch pipeline to train models
    print("\n[Step 1] Running batch pipeline to train models...")
    coach = HealthCoach(config)
    coach.run_full_pipeline(config.data_dir, config.output_dir)

    # Now simulate streaming
    print("\n[Step 2] Simulating real-time streaming...")
    bio_df = pd.read_csv(os.path.join(config.data_dir, config.biosignals_file))
    act_df = pd.read_csv(os.path.join(config.data_dir, config.activity_file))
    sleep_df = pd.read_csv(os.path.join(config.data_dir, config.sleep_stress_file))

    # Merge for simulation
    merged = pd.merge(bio_df, act_df, on=["user_id", "timestamp"], how="outer")
    merged = pd.merge(merged, sleep_df, on=["user_id", "timestamp"], how="outer")

    # Process first 100 samples for demo
    sample_size = min(100, len(merged))
    print(f"\nProcessing {sample_size} samples in real-time mode...\n")

    alert_count = 0
    anomaly_count = 0

    for i, (_, row) in enumerate(merged.head(sample_size).iterrows()):
        sample = row.dropna().to_dict()
        user_id = sample.pop("user_id", "unknown")
        sample.pop("timestamp", None)

        # Convert to proper types
        for key in sample:
            if isinstance(sample[key], (np.integer,)):
                sample[key] = int(sample[key])
            elif isinstance(sample[key], (np.floating,)):
                sample[key] = float(sample[key])

        result = coach.process_realtime(user_id, sample)

        if result["alerts"]:
            alert_count += len(result["alerts"])
            for alert in result["alerts"]:
                print(f"  [{i}] 🚨 {alert['severity']}: {alert['message']}")

        if result["is_anomaly"]:
            anomaly_count += 1

        if result["insight"]:
            print(f"  [{i}] 💡 {result['insight'][:120]}...")

        # Progress
        if (i + 1) % 25 == 0:
            print(f"  ... processed {i + 1}/{sample_size} samples "
                  f"(alerts: {alert_count}, anomalies: {anomaly_count})")

    print(f"\n✅ Real-time simulation complete:")
    print(f"   Samples processed: {sample_size}")
    print(f"   Alerts triggered: {alert_count}")
    print(f"   Anomalies detected: {anomaly_count}")


def main():
    parser = argparse.ArgumentParser(
        description="Samsung On-Device GenAI Health Assistant Pipeline"
    )
    parser.add_argument("--data-dir", default="data", help="Path to data directory")
    parser.add_argument("--output-dir", default="output", help="Path to output directory")
    parser.add_argument("--realtime", action="store_true", help="Run real-time simulation")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING"])
    args = parser.parse_args()

    setup_logging(args.log_level)

    config = PipelineConfig()
    config.data_dir = args.data_dir
    config.output_dir = args.output_dir

    print("🏥 Samsung On-Device GenAI Health Assistant")
    print(f"   Data: {args.data_dir}")
    print(f"   Output: {args.output_dir}")
    print(f"   Mode: {'Real-time simulation' if args.realtime else 'Batch processing'}")

    if args.realtime:
        run_realtime_simulation(config)
    else:
        run_batch_pipeline(config)

    print("\n✅ Done! Check the output directory for results.")


if __name__ == "__main__":
    main()
