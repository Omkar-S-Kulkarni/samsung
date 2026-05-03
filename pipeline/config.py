"""
Configuration Module
====================
Central configuration for the health assistant pipeline.
Contains domain-specific thresholds, model parameters, and pipeline settings.
All thresholds are based on clinical/physiological standards.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class PhysiologicalThresholds:
    """
    Clinically-informed thresholds for biosignal validation.
    These represent hard physiological limits beyond which data is invalid.
    """
    # Heart rate (bpm) - resting adult range with exercise margin
    hr_min: float = 30.0
    hr_max: float = 220.0
    hr_resting_low: float = 40.0
    hr_resting_high: float = 100.0
    hr_critical_high: float = 180.0
    hr_critical_low: float = 35.0

    # Heart rate variability (ms) - RMSSD/SDNN typical ranges
    hrv_min: float = 5.0
    hrv_max: float = 300.0
    hrv_low_threshold: float = 20.0  # Below this indicates high stress
    hrv_high_threshold: float = 100.0  # Above this is excellent recovery

    # SpO2 (%) - oxygen saturation
    spo2_min: float = 70.0  # Below this is life-threatening
    spo2_max: float = 100.0
    spo2_normal_low: float = 95.0  # Normal lower bound
    spo2_warning: float = 90.0  # Medical attention needed
    spo2_critical: float = 85.0  # Emergency

    # Skin temperature (°C)
    skin_temp_min: float = 25.0
    skin_temp_max: float = 42.0
    skin_temp_normal_low: float = 31.0
    skin_temp_normal_high: float = 37.0

    # Steps per minute
    steps_min: float = 0.0
    steps_max: float = 250.0  # Elite sprinters

    # Stress score (0-100)
    stress_low: float = 30.0
    stress_moderate: float = 60.0
    stress_high: float = 80.0

    # Calories per minute
    calories_min: float = 0.5
    calories_max: float = 30.0


@dataclass
class PreprocessingConfig:
    """Settings for the preprocessing pipeline."""
    # Smoothing
    rolling_window: int = 5  # minutes
    ema_alpha: float = 0.3  # Exponential moving average decay
    ema_span: int = 5

    # Outlier detection
    iqr_multiplier: float = 1.5
    z_score_threshold: float = 3.0

    # Resampling
    target_frequency: str = "1min"  # Target uniform sampling

    # Missing data
    max_gap_interpolate: int = 10  # Max gap (in samples) to interpolate
    forward_fill_limit: int = 5

    # Signal quality
    min_data_completeness: float = 0.7  # Minimum 70% data present


@dataclass
class FeatureConfig:
    """Settings for feature engineering."""
    # Temporal windows (in minutes)
    window_5min: int = 5
    window_15min: int = 15
    window_1hour: int = 60
    window_daily: int = 1440  # 24 * 60

    # HR analysis
    resting_hr_percentile: float = 10.0  # Use 10th percentile as resting HR
    hr_trend_window: int = 30  # 30-minute trend window

    # Sleep analysis
    min_sleep_duration: int = 30  # Minimum 30 min to count as sleep
    sleep_quality_weights: Dict[str, float] = field(default_factory=lambda: {
        "deep_ratio": 0.35,
        "rem_ratio": 0.25,
        "hrv_during_sleep": 0.20,
        "sleep_efficiency": 0.20,
    })

    # Activity classification thresholds (steps per minute)
    activity_low_threshold: int = 3
    activity_moderate_threshold: int = 7
    activity_high_threshold: int = 12

    # Anomaly detection
    anomaly_hr_spike_threshold: float = 2.5  # std deviations
    anomaly_hrv_drop_threshold: float = 2.0
    anomaly_spo2_threshold: float = 94.0

    # Feature vector dimensions
    feature_vector_dim: int = 64


@dataclass
class ModelConfig:
    """Settings for ML models and LLM."""
    # ML model
    lstm_hidden_size: int = 64
    lstm_num_layers: int = 2
    cnn_filters: int = 32
    sequence_length: int = 60  # 1-hour input window
    batch_size: int = 32
    learning_rate: float = 0.001
    epochs: int = 50

    # LLM settings
    llm_model_name: str = "gemma3:4b"  # Small model for real-time
    llm_model_reasoning: str = "gemma3:12b"  # Medium model for deeper analysis
    embedding_model: str = "nomic-embed-text"  # For RAG embeddings
    llm_temperature: float = 0.3
    llm_max_tokens: int = 512

    # RAG settings
    faiss_index_type: str = "FlatIP"  # Inner product for cosine similarity
    rag_top_k: int = 5
    embedding_dim: int = 768  # nomic-embed-text dimension
    max_memory_entries: int = 10000

    # Health score
    health_score_weights: Dict[str, float] = field(default_factory=lambda: {
        "hr_score": 0.20,
        "hrv_score": 0.20,
        "sleep_score": 0.20,
        "activity_score": 0.15,
        "stress_score": 0.15,
        "spo2_score": 0.10,
    })


@dataclass
class PipelineConfig:
    """Master configuration combining all sub-configs."""
    thresholds: PhysiologicalThresholds = field(default_factory=PhysiologicalThresholds)
    preprocessing: PreprocessingConfig = field(default_factory=PreprocessingConfig)
    features: FeatureConfig = field(default_factory=FeatureConfig)
    model: ModelConfig = field(default_factory=ModelConfig)

    # Paths
    data_dir: str = "data"
    output_dir: str = "output"

    # Dataset files
    activity_file: str = "activity.csv"
    biosignals_file: str = "biosignals.csv"
    sleep_stress_file: str = "sleep_stress.csv"

    # Logging
    log_level: str = "INFO"
    verbose: bool = True
