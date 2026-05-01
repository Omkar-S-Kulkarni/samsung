"""
Advanced Preprocessing Module
==============================
Production-quality biosignal preprocessing pipeline with:
- Multi-dataset loading and merging
- Domain-aware outlier handling (physiological thresholds)
- Adaptive noise reduction (rolling, EMA, Butterworth filtering)
- Time alignment and resampling
- Missing sensor graceful degradation
- Real-time streaming compatibility

Improvements over original pre_processing.py:
1. Uses domain thresholds instead of blind IQR (e.g., HR must be 30-220 bpm)
2. Time-aware interpolation instead of simple mean imputation
3. EMA + rolling + optional Butterworth filtering for better noise reduction
4. Per-user processing to avoid cross-user contamination
5. Preserves categorical columns (activity_level, sleep_stage)
6. Logs every transformation for auditability
"""

import os
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import signal as scipy_signal

from .config import PipelineConfig, PhysiologicalThresholds

logger = logging.getLogger(__name__)


class AdvancedPreprocessor:
    """
    Production-quality biosignal preprocessor designed for edge deployment.
    Processes wearable data per-user with domain-aware cleaning.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.thresholds = config.thresholds
        self.preprocess_cfg = config.preprocessing
        self.logs: List[str] = []

    def _log(self, message: str, level: str = "info"):
        """Internal logging with both logger and audit trail."""
        self.logs.append(f"[{level.upper()}] {message}")
        getattr(logger, level)(message)

    # =========================================================================
    # PHASE 1: Data Loading & Merging
    # =========================================================================

    def load_all_datasets(self, data_dir: str) -> pd.DataFrame:
        """
        Load and merge all datasets on (user_id, timestamp).
        Handles missing files gracefully — if a sensor dataset is absent,
        its columns will be filled with NaN (e.g., missing SpO2 sensor).
        """
        datasets = {}
        file_map = {
            "activity": self.config.activity_file,
            "biosignals": self.config.biosignals_file,
            "sleep_stress": self.config.sleep_stress_file,
        }

        for name, filename in file_map.items():
            path = os.path.join(data_dir, filename)
            if os.path.exists(path):
                df = pd.read_csv(path)
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                df = df.drop_duplicates(subset=["user_id", "timestamp"])
                df = df.sort_values(["user_id", "timestamp"]).reset_index(drop=True)
                datasets[name] = df
                self._log(f"Loaded {name}: {len(df)} rows, columns={list(df.columns)}")
            else:
                self._log(f"Dataset {name} not found at {path} — skipping", "warning")

        if not datasets:
            raise FileNotFoundError(f"No datasets found in {data_dir}")

        # Merge on (user_id, timestamp) using outer join to preserve all data
        merged = None
        for name, df in datasets.items():
            if merged is None:
                merged = df
            else:
                merged = pd.merge(merged, df, on=["user_id", "timestamp"], how="outer")

        merged = merged.sort_values(["user_id", "timestamp"]).reset_index(drop=True)
        self._log(f"Merged dataset: {len(merged)} rows, {len(merged.columns)} columns")
        self._log(f"Users: {sorted(merged['user_id'].unique())}")
        self._log(f"Time range: {merged['timestamp'].min()} to {merged['timestamp'].max()}")

        return merged

    # =========================================================================
    # PHASE 2: Domain-Aware Validation & Clipping
    # =========================================================================

    def validate_physiological_ranges(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply domain-specific physiological thresholds.
        Instead of blind IQR removal, we clip values to physiologically valid ranges.
        Values outside absolute limits are set to NaN for later interpolation.

        This is critical for health applications — a HR of 300 is impossible,
        but a HR of 150 during exercise is perfectly valid (IQR would flag it).
        """
        t = self.thresholds
        range_map = {
            "heart_rate_bpm": (t.hr_min, t.hr_max),
            "hrv_ms": (t.hrv_min, t.hrv_max),
            "spo2_pct": (t.spo2_min, t.spo2_max),
            "skin_temp_c": (t.skin_temp_min, t.skin_temp_max),
            "steps_per_min": (t.steps_min, t.steps_max),
            "calories_burned": (t.calories_min, t.calories_max),
            "stress_score": (0, 100),
        }

        total_clipped = 0
        for col, (low, high) in range_map.items():
            if col not in df.columns:
                continue

            # Count values outside physiological range
            invalid_mask = (df[col] < low) | (df[col] > high)
            n_invalid = invalid_mask.sum()

            if n_invalid > 0:
                # Set truly impossible values to NaN (will be interpolated)
                df.loc[invalid_mask, col] = np.nan
                total_clipped += n_invalid
                self._log(
                    f"  {col}: {n_invalid} values outside [{low}, {high}] → set to NaN"
                )

        self._log(f"Physiological validation: {total_clipped} total values corrected")
        return df

    def soft_outlier_clipping(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply IQR-based soft clipping WITHIN physiological ranges.
        This handles statistical outliers that are physiologically possible
        but unlikely given the user's baseline.
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        # Exclude binary/categorical-like columns
        skip_cols = {"is_sleep_period", "cumulative_steps"}
        target_cols = [c for c in numeric_cols if c not in skip_cols]

        for col in target_cols:
            q1 = df[col].quantile(0.05)  # Use 5th/95th percentile (less aggressive)
            q3 = df[col].quantile(0.95)
            iqr = q3 - q1

            lower = q1 - self.preprocess_cfg.iqr_multiplier * iqr
            upper = q3 + self.preprocess_cfg.iqr_multiplier * iqr

            before_count = ((df[col] < lower) | (df[col] > upper)).sum()
            df[col] = df[col].clip(lower=lower, upper=upper)

            if before_count > 0:
                self._log(f"  {col}: {before_count} statistical outliers clipped")

        return df

    # =========================================================================
    # PHASE 3: Missing Data Handling
    # =========================================================================

    def handle_missing_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Time-aware missing data handling with multiple strategies:
        1. Small gaps (≤max_gap): linear interpolation (respects temporal continuity)
        2. Medium gaps: forward fill then backward fill (preserve last known state)
        3. Large gaps: leave as NaN (don't hallucinate data)

        This is far superior to simple mean imputation which:
        - Ignores temporal ordering
        - Creates artificial discontinuities
        - Biases toward the mean
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        categorical_cols = [c for c in categorical_cols if c not in ["user_id"]]

        initial_missing = df[numeric_cols].isnull().sum().sum()

        # Process per-user to avoid interpolating across user boundaries
        processed_dfs = []
        for user_id, user_df in df.groupby("user_id"):
            user_df = user_df.copy()

            # Step 1: Linear interpolation for small gaps
            for col in numeric_cols:
                user_df[col] = user_df[col].interpolate(
                    method="linear",
                    limit=self.preprocess_cfg.max_gap_interpolate,
                    limit_direction="both"
                )

            # Step 2: Forward/backward fill for remaining gaps
            for col in numeric_cols:
                user_df[col] = user_df[col].ffill(
                    limit=self.preprocess_cfg.forward_fill_limit
                )
                user_df[col] = user_df[col].bfill(
                    limit=self.preprocess_cfg.forward_fill_limit
                )

            # Step 3: Handle categorical missing values
            for col in categorical_cols:
                if col in user_df.columns:
                    user_df[col] = user_df[col].ffill().bfill()

            processed_dfs.append(user_df)

        df = pd.concat(processed_dfs, ignore_index=True)

        final_missing = df[numeric_cols].isnull().sum().sum()
        self._log(
            f"Missing data: {initial_missing} → {final_missing} "
            f"({initial_missing - final_missing} resolved via interpolation/fill)"
        )

        # Final fallback: fill any remaining NaN with column median
        remaining = df[numeric_cols].isnull().sum()
        remaining_cols = remaining[remaining > 0]
        if len(remaining_cols) > 0:
            for col in remaining_cols.index:
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                self._log(f"  {col}: {remaining_cols[col]} remaining NaN → median={median_val:.2f}")

        return df

    # =========================================================================
    # PHASE 4: Noise Reduction
    # =========================================================================

    def apply_noise_reduction(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Multi-strategy noise reduction:
        1. EMA (Exponential Moving Average) — responsive to recent changes
        2. Rolling mean — smooth short-term noise
        3. Optional Butterworth low-pass filter for high-frequency noise

        We apply different strategies to different signals:
        - HR, HRV: EMA (fast-changing, need responsiveness)
        - SpO2, skin_temp: Rolling mean (slow-changing, need stability)
        - Steps: No smoothing (discrete events)
        """
        # Define smoothing strategy per signal type
        ema_cols = ["heart_rate_bpm", "hrv_ms", "stress_score"]
        rolling_cols = ["spo2_pct", "skin_temp_c", "calories_burned"]
        no_smooth_cols = ["steps_per_min", "cumulative_steps", "is_sleep_period"]

        processed_dfs = []
        for user_id, user_df in df.groupby("user_id"):
            user_df = user_df.copy()

            # EMA for fast-changing signals
            for col in ema_cols:
                if col in user_df.columns:
                    user_df[f"{col}_raw"] = user_df[col].copy()
                    user_df[col] = user_df[col].ewm(
                        span=self.preprocess_cfg.ema_span, min_periods=1
                    ).mean()

            # Rolling mean for slow-changing signals
            for col in rolling_cols:
                if col in user_df.columns:
                    user_df[f"{col}_raw"] = user_df[col].copy()
                    user_df[col] = user_df[col].rolling(
                        window=self.preprocess_cfg.rolling_window,
                        min_periods=1,
                        center=True
                    ).mean()

            processed_dfs.append(user_df)

        df = pd.concat(processed_dfs, ignore_index=True)
        self._log(f"Noise reduction applied: EMA on {ema_cols}, rolling on {rolling_cols}")
        return df

    def apply_butterworth_filter(
        self, series: pd.Series, cutoff_freq: float = 0.1, order: int = 3
    ) -> pd.Series:
        """
        Optional Butterworth low-pass filter for aggressive noise removal.
        Useful for removing high-frequency artifacts in biosignals.

        Parameters:
            cutoff_freq: Normalized cutoff frequency (0 to 1, where 1 = Nyquist)
            order: Filter order (higher = sharper cutoff)
        """
        if series.isnull().any():
            series = series.interpolate(method="linear")

        b, a = scipy_signal.butter(order, cutoff_freq, btype="low")
        filtered = scipy_signal.filtfilt(b, a, series.values)
        return pd.Series(filtered, index=series.index)

    # =========================================================================
    # PHASE 5: Time Alignment & Resampling
    # =========================================================================

    def ensure_time_alignment(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensure uniform sampling at the target frequency.
        Handles irregular sampling by resampling to a consistent grid.

        Steps:
        1. Set timestamp as index
        2. Resample to target frequency per user
        3. Interpolate any gaps created by resampling
        """
        target_freq = self.preprocess_cfg.target_frequency
        processed_dfs = []

        for user_id, user_df in df.groupby("user_id"):
            user_df = user_df.copy()
            user_df = user_df.set_index("timestamp")

            # Check if already uniform
            time_diffs = user_df.index.to_series().diff().dropna()
            expected_delta = pd.Timedelta(target_freq)
            irregular = (time_diffs != expected_delta).sum()

            if irregular > 0:
                self._log(
                    f"  {user_id}: {irregular} irregular intervals detected, resampling..."
                )

                # Separate numeric and categorical columns
                numeric_cols = user_df.select_dtypes(include=[np.number]).columns.tolist()
                cat_cols = user_df.select_dtypes(
                    include=["object", "category"]
                ).columns.tolist()

                # Resample numeric with mean
                numeric_resampled = user_df[numeric_cols].resample(target_freq).mean()
                numeric_resampled = numeric_resampled.interpolate(
                    method="linear", limit=5
                )

                # Resample categorical with forward fill
                if cat_cols:
                    cat_resampled = user_df[cat_cols].resample(target_freq).ffill()
                    resampled = pd.concat([numeric_resampled, cat_resampled], axis=1)
                else:
                    resampled = numeric_resampled

                resampled["user_id"] = user_id
                user_df = resampled
            else:
                user_df["user_id"] = user_id

            user_df = user_df.reset_index()
            processed_dfs.append(user_df)

        df = pd.concat(processed_dfs, ignore_index=True)
        self._log(f"Time alignment complete at {target_freq} frequency")
        return df

    # =========================================================================
    # PHASE 6: Data Quality Assessment
    # =========================================================================

    def assess_data_quality(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Compute data quality metrics for monitoring and reporting.
        Returns a quality scorecard per signal.
        """
        quality = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            completeness = 1.0 - (df[col].isnull().sum() / len(df))
            variance = df[col].std()

            # Check for stuck/constant values (sensor malfunction indicator)
            diffs = df[col].diff()
            stuck_ratio = (diffs == 0).sum() / max(len(diffs) - 1, 1)

            quality[col] = {
                "completeness": round(completeness, 4),
                "std": round(variance, 4) if not np.isnan(variance) else 0,
                "stuck_ratio": round(stuck_ratio, 4),
                "min": round(df[col].min(), 2) if not df[col].isnull().all() else None,
                "max": round(df[col].max(), 2) if not df[col].isnull().all() else None,
            }

        self._log(f"Data quality assessment complete for {len(quality)} signals")
        return quality

    # =========================================================================
    # FULL PIPELINE
    # =========================================================================

    def preprocess(self, data_dir: str) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """
        Execute the full preprocessing pipeline.

        Returns:
            - Cleaned DataFrame
            - Data quality report
            - Processing logs
        """
        self.logs = []
        self._log("=" * 60)
        self._log("STARTING ADVANCED PREPROCESSING PIPELINE")
        self._log("=" * 60)

        # Step 1: Load and merge
        self._log("\n[STEP 1] Loading and merging datasets...")
        df = self.load_all_datasets(data_dir)

        # Step 2: Domain validation
        self._log("\n[STEP 2] Validating physiological ranges...")
        df = self.validate_physiological_ranges(df)

        # Step 3: Handle missing data
        self._log("\n[STEP 3] Handling missing data...")
        df = self.handle_missing_data(df)

        # Step 4: Soft outlier clipping
        self._log("\n[STEP 4] Applying soft outlier clipping...")
        df = self.soft_outlier_clipping(df)

        # Step 5: Noise reduction
        self._log("\n[STEP 5] Applying noise reduction...")
        df = self.apply_noise_reduction(df)

        # Step 6: Time alignment
        self._log("\n[STEP 6] Ensuring time alignment...")
        df = self.ensure_time_alignment(df)

        # Step 7: Quality assessment
        self._log("\n[STEP 7] Assessing data quality...")
        quality = self.assess_data_quality(df)

        self._log("\n" + "=" * 60)
        self._log(f"PREPROCESSING COMPLETE: {len(df)} rows, {len(df.columns)} columns")
        self._log("=" * 60)

        return df, quality, self.logs


class StreamingPreprocessor:
    """
    Lightweight preprocessor for real-time streaming data.
    Maintains a sliding window buffer and applies incremental processing.
    Designed for edge deployment with minimal memory footprint.
    """

    def __init__(self, config: PipelineConfig, buffer_size: int = 60):
        self.config = config
        self.thresholds = config.thresholds
        self.buffer_size = buffer_size
        self.buffers: Dict[str, pd.DataFrame] = {}  # per-user buffers

    def process_sample(self, user_id: str, sample: dict) -> dict:
        """
        Process a single incoming sample in real-time.

        Args:
            user_id: User identifier
            sample: Dict with sensor readings (e.g., {"heart_rate_bpm": 72, ...})

        Returns:
            Cleaned and validated sample dict
        """
        # Initialize buffer for new users
        if user_id not in self.buffers:
            self.buffers[user_id] = pd.DataFrame()

        # Domain validation
        cleaned = self._validate_sample(sample)

        # Add to buffer
        buffer = self.buffers[user_id]
        new_row = pd.DataFrame([cleaned])
        self.buffers[user_id] = pd.concat(
            [buffer, new_row], ignore_index=True
        ).tail(self.buffer_size)

        # Apply EMA using buffer context
        if len(self.buffers[user_id]) >= 3:
            cleaned = self._apply_ema(user_id, cleaned)

        return cleaned

    def _validate_sample(self, sample: dict) -> dict:
        """Validate a single sample against physiological thresholds."""
        t = self.thresholds
        ranges = {
            "heart_rate_bpm": (t.hr_min, t.hr_max),
            "hrv_ms": (t.hrv_min, t.hrv_max),
            "spo2_pct": (t.spo2_min, t.spo2_max),
            "skin_temp_c": (t.skin_temp_min, t.skin_temp_max),
        }

        cleaned = sample.copy()
        for key, (low, high) in ranges.items():
            if key in cleaned and cleaned[key] is not None:
                cleaned[key] = np.clip(cleaned[key], low, high)

        return cleaned

    def _apply_ema(self, user_id: str, current: dict) -> dict:
        """Apply EMA smoothing using buffer history."""
        alpha = self.config.preprocessing.ema_alpha
        buffer = self.buffers[user_id]

        for col in ["heart_rate_bpm", "hrv_ms", "stress_score"]:
            if col in current and col in buffer.columns:
                prev_ema = buffer[col].iloc[-2] if len(buffer) >= 2 else current[col]
                current[col] = alpha * current[col] + (1 - alpha) * prev_ema

        return current

    def get_buffer(self, user_id: str) -> pd.DataFrame:
        """Get the current buffer for a user (for feature computation)."""
        return self.buffers.get(user_id, pd.DataFrame())
