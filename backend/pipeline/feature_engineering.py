"""
Feature Engineering Module
===========================
Computes health intelligence features from preprocessed biosignal data.
Covers: HR analysis, sleep metrics, activity classification, stress/recovery,
anomaly detection, temporal aggregation, and feature vector compression.
"""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from .config import PipelineConfig

logger = logging.getLogger(__name__)


class HealthFeatureEngine:
    """Compute health-intelligence features from cleaned biosignal data."""

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.feat_cfg = config.features
        self.thresholds = config.thresholds
        self.feature_descriptions: Dict[str, str] = {}

    # =========================================================================
    # Heart Rate Features
    # =========================================================================
    def compute_hr_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """HR trends, resting HR, and HRV metrics per user."""
        if "heart_rate_bpm" not in df.columns:
            logger.warning("No heart_rate_bpm column — skipping HR features")
            return df

        for uid, udf in df.groupby("user_id"):
            idx = udf.index

            # Short-term trend (5-min rolling)
            df.loc[idx, "hr_trend_5min"] = udf["heart_rate_bpm"].rolling(5, min_periods=1).mean()
            # Long-term trend (30-min rolling)
            df.loc[idx, "hr_trend_30min"] = udf["heart_rate_bpm"].rolling(30, min_periods=1).mean()
            # Rate of change
            df.loc[idx, "hr_roc"] = udf["heart_rate_bpm"].diff().fillna(0)

            # Resting HR: 10th percentile of non-active periods
            if "activity_level" in df.columns:
                rest_mask = udf["activity_level"].isin(["sedentary", "light"])
                rest_hr = udf.loc[rest_mask, "heart_rate_bpm"]
                resting_hr = rest_hr.quantile(0.10) if len(rest_hr) > 0 else udf["heart_rate_bpm"].quantile(0.10)
            else:
                resting_hr = udf["heart_rate_bpm"].quantile(0.10)
            df.loc[idx, "resting_hr"] = resting_hr

        # HRV metrics (if hrv_ms available)
        if "hrv_ms" in df.columns:
            for uid, udf in df.groupby("user_id"):
                idx = udf.index
                # RMSSD proxy from HRV readings
                hrv_diffs = udf["hrv_ms"].diff().fillna(0)
                df.loc[idx, "hrv_rmssd_proxy"] = (hrv_diffs ** 2).rolling(5, min_periods=1).mean().apply(np.sqrt)
                # SDNN proxy (rolling std of HRV)
                df.loc[idx, "hrv_sdnn_proxy"] = udf["hrv_ms"].rolling(5, min_periods=1).std().fillna(0)
                df.loc[idx, "hrv_trend_30min"] = udf["hrv_ms"].rolling(30, min_periods=1).mean()

        self.feature_descriptions.update({
            "hr_trend_5min": "5-minute rolling average of heart rate",
            "hr_trend_30min": "30-minute rolling average of heart rate",
            "hr_roc": "Heart rate rate-of-change (bpm/min)",
            "resting_hr": "Estimated resting heart rate (10th percentile at rest)",
            "hrv_rmssd_proxy": "RMSSD proxy from consecutive HRV differences",
            "hrv_sdnn_proxy": "SDNN proxy from rolling std of HRV",
            "hrv_trend_30min": "30-minute rolling average of HRV",
        })
        logger.info("HR features computed")
        return df

    # =========================================================================
    # Sleep Features
    # =========================================================================
    def compute_sleep_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Sleep duration, consistency, and quality score."""
        if "is_sleep_period" not in df.columns:
            logger.warning("No sleep data — skipping sleep features")
            return df

        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            udf = udf.copy()
            udf["date"] = udf["timestamp"].dt.date

            # Per-day sleep stats
            daily_sleep = []
            for date, day_df in udf.groupby("date"):
                sleep_minutes = day_df["is_sleep_period"].sum()
                total_minutes = len(day_df)
                sleep_efficiency = sleep_minutes / max(total_minutes, 1)

                # Sleep stage distribution
                stage_counts = {"deep": 0, "light": 0, "REM": 0, "awake": 0}
                if "sleep_stage" in day_df.columns:
                    sleep_data = day_df[day_df["is_sleep_period"] == 1]
                    if len(sleep_data) > 0:
                        counts = sleep_data["sleep_stage"].value_counts()
                        for stage in stage_counts:
                            stage_counts[stage] = counts.get(stage, 0)

                sleep_total = sum(stage_counts.values()) or 1
                deep_ratio = stage_counts["deep"] / sleep_total
                rem_ratio = stage_counts["REM"] / sleep_total

                # Sleep quality score (0-100)
                w = self.feat_cfg.sleep_quality_weights
                hrv_sleep = day_df.loc[day_df["is_sleep_period"] == 1, "hrv_ms"].mean() if "hrv_ms" in day_df.columns else 50
                hrv_norm = min(max((hrv_sleep - 20) / 80, 0), 1) if not np.isnan(hrv_sleep) else 0.5

                quality = (
                    w["deep_ratio"] * min(deep_ratio / 0.25, 1.0) +
                    w["rem_ratio"] * min(rem_ratio / 0.25, 1.0) +
                    w["hrv_during_sleep"] * hrv_norm +
                    w["sleep_efficiency"] * sleep_efficiency
                ) * 100

                daily_sleep.append({
                    "date": date, "sleep_duration_min": sleep_minutes,
                    "sleep_efficiency": sleep_efficiency,
                    "deep_ratio": deep_ratio, "rem_ratio": rem_ratio,
                    "sleep_quality_score": round(quality, 1),
                })

            # Map daily stats back to minute-level data
            if daily_sleep:
                sleep_df = pd.DataFrame(daily_sleep)
                udf_dates = udf["date"]
                for col_name in ["sleep_duration_min", "sleep_efficiency", "deep_ratio", "rem_ratio", "sleep_quality_score"]:
                    date_map = dict(zip(sleep_df["date"], sleep_df[col_name]))
                    df.loc[idx, col_name] = udf_dates.map(date_map).values

                # Sleep consistency: std of daily sleep durations (lower = more consistent)
                consistency = 100 - min(sleep_df["sleep_duration_min"].std() / 4, 100)
                df.loc[idx, "sleep_consistency"] = round(max(consistency, 0), 1)

        self.feature_descriptions.update({
            "sleep_duration_min": "Total sleep minutes per day",
            "sleep_efficiency": "Ratio of sleep time to total time",
            "deep_ratio": "Proportion of deep sleep",
            "rem_ratio": "Proportion of REM sleep",
            "sleep_quality_score": "Composite sleep quality (0-100)",
            "sleep_consistency": "Sleep schedule consistency (0-100, higher=better)",
        })
        logger.info("Sleep features computed")
        return df

    # =========================================================================
    # Activity Features
    # =========================================================================
    def compute_activity_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step intensity, activity classification, energy expenditure proxy."""
        if "steps_per_min" not in df.columns:
            logger.warning("No step data — skipping activity features")
            return df

        t = self.feat_cfg
        # Activity intensity classification
        conditions = [
            df["steps_per_min"] <= t.activity_low_threshold,
            df["steps_per_min"] <= t.activity_moderate_threshold,
            df["steps_per_min"] <= t.activity_high_threshold,
            df["steps_per_min"] > t.activity_high_threshold,
        ]
        choices = [0, 1, 2, 3]  # sedentary, low, moderate, high
        df["activity_intensity"] = np.select(conditions, choices, default=0)

        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            # Step intensity (rolling sum of steps in 15min)
            df.loc[idx, "step_intensity_15min"] = udf["steps_per_min"].rolling(15, min_periods=1).sum()
            # Energy expenditure proxy (METs approximation)
            # Sedentary=1 MET, Light=2, Moderate=4, High=7
            met_map = {0: 1.0, 1: 2.0, 2: 4.0, 3: 7.0}
            mets = df.loc[idx, "activity_intensity"].map(met_map).fillna(1.0)
            df.loc[idx, "energy_expenditure_proxy"] = mets * 3.5 * 70 / 200  # kcal/min for 70kg

        self.feature_descriptions.update({
            "activity_intensity": "Activity level (0=sedentary, 1=low, 2=moderate, 3=high)",
            "step_intensity_15min": "Rolling 15-min step count",
            "energy_expenditure_proxy": "Estimated kcal/min based on MET values",
        })
        logger.info("Activity features computed")
        return df

    # =========================================================================
    # Stress & Recovery Features
    # =========================================================================
    def compute_stress_recovery(self, df: pd.DataFrame) -> pd.DataFrame:
        """Stress score from HR+HRV, recovery score from HRV+sleep+rest."""
        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            udf = udf.copy()

            # Computed stress indicator (HR↑ + HRV↓ = stress)
            if "heart_rate_bpm" in udf.columns and "hrv_ms" in udf.columns:
                hr_norm = (udf["heart_rate_bpm"] - udf["heart_rate_bpm"].min()) / max(udf["heart_rate_bpm"].max() - udf["heart_rate_bpm"].min(), 1)
                hrv_norm = 1.0 - (udf["hrv_ms"] - udf["hrv_ms"].min()) / max(udf["hrv_ms"].max() - udf["hrv_ms"].min(), 1)
                computed_stress = (hr_norm * 0.5 + hrv_norm * 0.5) * 100
                df.loc[idx, "computed_stress"] = computed_stress.rolling(5, min_periods=1).mean()

            # Recovery score (high HRV + good sleep + low HR = recovery)
            recovery_components = []
            if "hrv_ms" in udf.columns:
                hrv_recovery = (udf["hrv_ms"] - udf["hrv_ms"].min()) / max(udf["hrv_ms"].max() - udf["hrv_ms"].min(), 1)
                recovery_components.append(hrv_recovery * 0.4)
            if "sleep_quality_score" in df.columns:
                sleep_rec = df.loc[idx, "sleep_quality_score"].fillna(50) / 100
                recovery_components.append(sleep_rec * 0.3)
            if "heart_rate_bpm" in udf.columns:
                hr_rec = 1.0 - hr_norm
                recovery_components.append(hr_rec * 0.3)

            if recovery_components:
                recovery = sum(recovery_components) * 100
                df.loc[idx, "recovery_score"] = recovery.rolling(15, min_periods=1).mean()

        self.feature_descriptions.update({
            "computed_stress": "Derived stress indicator from HR↑ + HRV↓ (0-100)",
            "recovery_score": "Recovery score from HRV + sleep + resting HR (0-100)",
        })
        logger.info("Stress & recovery features computed")
        return df

    # =========================================================================
    # Anomaly Detection
    # =========================================================================
    def detect_anomalies(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect anomalies using statistical + rule-based methods."""
        df["anomaly_flags"] = ""

        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            flags = [""] * len(udf)

            # 1. HR spike detection (z-score based)
            if "heart_rate_bpm" in udf.columns:
                hr_mean = udf["heart_rate_bpm"].rolling(30, min_periods=1).mean()
                hr_std = udf["heart_rate_bpm"].rolling(30, min_periods=1).std().fillna(1)
                hr_z = (udf["heart_rate_bpm"] - hr_mean) / hr_std.clip(lower=1)
                hr_spike = hr_z.abs() > self.feat_cfg.anomaly_hr_spike_threshold
                df.loc[idx, "anomaly_hr_spike"] = hr_spike.astype(int)

                for i, (is_spike, pos) in enumerate(zip(hr_spike.values, range(len(flags)))):
                    if is_spike:
                        flags[pos] += "HR_SPIKE;"

            # 2. HRV drop detection
            if "hrv_ms" in udf.columns:
                hrv_mean = udf["hrv_ms"].rolling(30, min_periods=1).mean()
                hrv_std = udf["hrv_ms"].rolling(30, min_periods=1).std().fillna(1)
                hrv_z = (hrv_mean - udf["hrv_ms"]) / hrv_std.clip(lower=1)
                hrv_drop = hrv_z > self.feat_cfg.anomaly_hrv_drop_threshold
                df.loc[idx, "anomaly_hrv_drop"] = hrv_drop.astype(int)

                for i, (is_drop, pos) in enumerate(zip(hrv_drop.values, range(len(flags)))):
                    if is_drop:
                        flags[pos] += "HRV_DROP;"

            # 3. Low SpO2 events (rule-based)
            if "spo2_pct" in udf.columns:
                low_spo2 = udf["spo2_pct"] < self.feat_cfg.anomaly_spo2_threshold
                df.loc[idx, "anomaly_low_spo2"] = low_spo2.astype(int)

                for i, (is_low, pos) in enumerate(zip(low_spo2.values, range(len(flags)))):
                    if is_low:
                        flags[pos] += "LOW_SPO2;"

            # 4. Critical HR (rule-based)
            if "heart_rate_bpm" in udf.columns:
                critical = (udf["heart_rate_bpm"] > self.thresholds.hr_critical_high) | \
                           (udf["heart_rate_bpm"] < self.thresholds.hr_critical_low)
                df.loc[idx, "anomaly_critical_hr"] = critical.astype(int)

            df.loc[idx, "anomaly_flags"] = flags

        # Composite anomaly score
        anomaly_cols = [c for c in df.columns if c.startswith("anomaly_") and c != "anomaly_flags"]
        if anomaly_cols:
            df["anomaly_score"] = df[anomaly_cols].sum(axis=1)

        self.feature_descriptions.update({
            "anomaly_hr_spike": "HR spike detected (z-score > threshold)",
            "anomaly_hrv_drop": "Abnormal HRV drop detected",
            "anomaly_low_spo2": "SpO2 below 94% detected",
            "anomaly_critical_hr": "HR outside critical range (35-180 bpm)",
            "anomaly_score": "Composite anomaly score (sum of flags)",
            "anomaly_flags": "Semicolon-separated anomaly flag labels",
        })
        logger.info("Anomaly detection complete")
        return df

    # =========================================================================
    # Temporal Aggregation
    # =========================================================================
    def compute_temporal_aggregations(self, df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """Aggregate features at 5min, 15min, 1hour, and daily windows."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        agg_funcs = {"mean": "mean", "std": "std", "min": "min", "max": "max"}

        aggregations = {}
        windows = {
            "5min": "5min", "15min": "15min",
            "1hour": "1h", "daily": "1D",
        }

        for name, freq in windows.items():
            agg_dfs = []
            for uid, udf in df.groupby("user_id"):
                udf = udf.set_index("timestamp")
                resampled = udf[numeric_cols].resample(freq).agg(["mean", "std", "min", "max"])
                resampled.columns = [f"{col}_{agg}" for col, agg in resampled.columns]
                resampled["user_id"] = uid
                # Add count for data completeness
                resampled["sample_count"] = udf[numeric_cols[0]].resample(freq).count()
                agg_dfs.append(resampled.reset_index())

            aggregations[name] = pd.concat(agg_dfs, ignore_index=True)
            logger.info(f"Temporal aggregation [{name}]: {len(aggregations[name])} rows")

        return aggregations

    # =========================================================================
    # Feature Vector Compression
    # =========================================================================
    def compress_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Compress features into compact vectors for ML/LLM/RAG compatibility.
        Uses PCA-like dimensionality reduction via truncated SVD.
        """
        from sklearn.preprocessing import StandardScaler

        feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                        if not c.startswith("anomaly_") and c != "is_sleep_period"]

        data = df[feature_cols].fillna(0).values
        scaler = StandardScaler()
        data_scaled = scaler.fit_transform(data)

        # Truncated SVD for dimensionality reduction
        target_dim = min(self.feat_cfg.feature_vector_dim, data_scaled.shape[1])
        from sklearn.decomposition import TruncatedSVD
        svd = TruncatedSVD(n_components=target_dim, random_state=42)
        compressed = svd.fit_transform(data_scaled)

        explained_var = svd.explained_variance_ratio_.sum()
        logger.info(f"Feature compression: {data_scaled.shape[1]}→{target_dim} dims, "
                     f"explained variance: {explained_var:.2%}")

        return compressed

    # =========================================================================
    # Health Score (0-100)
    # =========================================================================
    def compute_health_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute an overall health score (0-100) per user per day."""
        weights = self.config.model.health_score_weights

        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            scores = {}

            # HR score: closer to resting normal = better
            if "heart_rate_bpm" in udf.columns:
                resting = udf.get("resting_hr", udf["heart_rate_bpm"].quantile(0.1))
                hr_deviation = abs(udf["heart_rate_bpm"] - 65) / 35  # 65 bpm ideal
                scores["hr"] = (1 - hr_deviation.clip(0, 1)) * 100

            # HRV score: higher = better
            if "hrv_ms" in udf.columns:
                scores["hrv"] = ((udf["hrv_ms"] - 10) / 90).clip(0, 1) * 100

            # Sleep score
            if "sleep_quality_score" in df.columns:
                scores["sleep"] = df.loc[idx, "sleep_quality_score"].fillna(50)

            # Activity score
            if "steps_per_min" in udf.columns:
                daily_steps = udf["steps_per_min"].rolling(1440, min_periods=1).sum()
                scores["activity"] = (daily_steps / 10000).clip(0, 1) * 100

            # Stress score (inverted — lower stress = higher health)
            if "computed_stress" in df.columns:
                scores["stress"] = 100 - df.loc[idx, "computed_stress"].fillna(50)

            # SpO2 score
            if "spo2_pct" in udf.columns:
                scores["spo2"] = ((udf["spo2_pct"] - 90) / 10).clip(0, 1) * 100

            # Weighted composite
            weight_keys = {"hr": "hr_score", "hrv": "hrv_score", "sleep": "sleep_score",
                          "activity": "activity_score", "stress": "stress_score", "spo2": "spo2_score"}
            total_weight = 0
            health = pd.Series(0.0, index=idx)
            for key, weight_name in weight_keys.items():
                if key in scores:
                    w = weights.get(weight_name, 0.1)
                    health += scores[key] * w
                    total_weight += w

            if total_weight > 0:
                health = health / total_weight
            df.loc[idx, "health_score"] = health.clip(0, 100).round(1)

        self.feature_descriptions["health_score"] = "Overall health score (0-100)"
        logger.info("Health scores computed")
        return df

    # =========================================================================
    # Predictive Features
    # =========================================================================
    def compute_predictive_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute features specifically for predictive modeling."""
        for uid, udf in df.groupby("user_id"):
            idx = udf.index
            
            # 1. Fatigue Index (Cumulative activity vs recovery)
            if "energy_expenditure_proxy" in udf.columns:
                activity_load = udf["energy_expenditure_proxy"].rolling(window=1440, min_periods=1).sum()
                recovery_potential = df.loc[idx, "recovery_score"].fillna(50).rolling(window=1440, min_periods=1).mean()
                df.loc[idx, "fatigue_index"] = (activity_load / (recovery_potential + 1)).clip(0, 100)

            # 2. Acute:Chronic Workload Ratio (ACWR)
            # Acute (7 days) vs Chronic (28 days) - here scaled for available data
            if "steps_per_min" in udf.columns:
                steps = udf["steps_per_min"]
                acute_load = steps.rolling(window=60*24*7, min_periods=1).mean()
                chronic_load = steps.rolling(window=60*24*28, min_periods=1).mean()
                df.loc[idx, "acwr"] = (acute_load / (chronic_load + 0.1)).fillna(1.0)

            # 3. HRV Stability
            if "hrv_ms" in udf.columns:
                df.loc[idx, "hrv_stability"] = udf["hrv_ms"].rolling(window=60, min_periods=1).std().fillna(0)

        self.feature_descriptions.update({
            "fatigue_index": "Cumulative fatigue based on activity vs. recovery",
            "acwr": "Acute:Chronic Workload Ratio for overtraining detection",
            "hrv_stability": "Rolling stability of HRV (lower std = more stable)",
        })
        logger.info("Predictive features computed")
        return df

    # =========================================================================
    # Full Pipeline
    # =========================================================================
    def engineer_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame], Dict[str, str]]:
        """Run the complete feature engineering pipeline."""
        logger.info("=" * 60)
        logger.info("STARTING FEATURE ENGINEERING PIPELINE")
        logger.info("=" * 60)

        df = self.compute_hr_features(df)
        df = self.compute_sleep_features(df)
        df = self.compute_activity_features(df)
        df = self.compute_stress_recovery(df)
        df = self.detect_anomalies(df)
        df = self.compute_health_score(df)
        df = self.compute_predictive_features(df)

        # Temporal aggregations
        aggregations = self.compute_temporal_aggregations(df)

        # Feature compression
        compressed_vectors = self.compress_features(df)
        df["feature_vector_idx"] = range(len(df))

        logger.info(f"Feature engineering complete: {len(df.columns)} total columns")
        logger.info(f"Feature descriptions: {len(self.feature_descriptions)} documented")

        return df, aggregations, self.feature_descriptions
