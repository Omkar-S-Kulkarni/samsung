"""
Samsung On-Device GenAI Health Assistant Pipeline
=================================================
A production-quality pipeline for processing wearable biosignal data
and generating intelligent health insights using on-device AI.

Modules:
    - config: Central configuration and domain thresholds
    - preprocessing: Advanced signal cleaning and alignment
    - feature_engineering: Health metric computation
    - ml_models: Time-series ML models for anomaly/stress detection
    - rag_system: FAISS-based retrieval-augmented generation memory
    - llm_reasoning: On-device LLM reasoning engine
    - health_coach: Main orchestrator combining all components
"""

__version__ = "1.0.0"
__author__ = "Samsung Health AI Team"
