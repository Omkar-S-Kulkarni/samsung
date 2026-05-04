"""
LLM Reasoning Engine
=====================
On-device LLM reasoning for health insights using Ollama.
Generates natural language explanations from structured health data.
Falls back to template-based generation if LLM is unavailable.
"""

import json
import logging
import time
from typing import Dict, List, Optional

from .config import PipelineConfig

logger = logging.getLogger(__name__)


class HealthLLMReasoner:
    """
    On-device LLM reasoning engine for health insight generation.
    Uses Ollama for local inference — no cloud APIs.
    Includes template fallback for environments without LLM.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.model_name = config.model.llm_model_name
        self.model_reasoning = config.model.llm_model_reasoning
        self.temperature = config.model.llm_temperature
        self.max_tokens = config.model.llm_max_tokens
        self.ollama_available = False

        self._check_ollama()

    def _check_ollama(self):
        """Check if Ollama is running and models are available."""
        try:
            import requests
            resp = requests.get("http://localhost:11434/api/tags", timeout=3)
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                self.ollama_available = True
                logger.info(f"Ollama available. Models: {models}")

                # Check for our preferred models
                for model in [self.model_name, self.model_reasoning]:
                    base_name = model.split(":")[0]
                    if not any(base_name in m for m in models):
                        logger.warning(f"Model {model} not found. Run: ollama pull {model}")
            else:
                logger.info("Ollama not responding — using template fallback")
        except Exception:
            logger.info("Ollama not available — using template fallback")

    def _call_ollama(self, prompt: str, model: Optional[str] = None,
                     system: Optional[str] = None) -> Optional[str]:
        """Make a request to Ollama API."""
        if not self.ollama_available:
            return None

        try:
            import requests
            payload = {
                "model": model or self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                },
            }
            if system:
                payload["system"] = system

            start = time.time()
            resp = requests.post(
                "http://localhost:11434/api/generate",
                json=payload,
                timeout=30
            )
            latency = time.time() - start

            if resp.status_code == 200:
                result = resp.json().get("response", "")
                logger.info(f"LLM inference: {latency:.2f}s, {len(result)} chars")
                return result
            else:
                logger.warning(f"Ollama error: {resp.status_code}")
                return None
        except Exception as e:
            logger.warning(f"Ollama call failed: {e}")
            return None

    # =========================================================================
    # Health Insight Generation
    # =========================================================================

    def generate_insight(self, health_data: Dict, rag_context: List[Dict] = None,
                         anomalies: List[Dict] = None) -> str:
        """
        Generate a natural language health insight from structured data.

        Args:
            health_data: Current health metrics dict
            rag_context: Similar past states from RAG memory
            anomalies: Detected anomaly alerts

        Returns:
            Natural language insight string
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_health_prompt(health_data, rag_context, anomalies)

        # Try LLM first
        llm_response = self._call_ollama(user_prompt, system=system_prompt)
        if llm_response:
            return llm_response

        # Fallback to template-based generation
        return self._template_insight(health_data, anomalies)

    def generate_daily_summary(self, daily_stats: Dict, user_id: str) -> str:
        """Generate a comprehensive daily health summary."""
        system_prompt = (
            "You are a certified health coach AI running on a Samsung Galaxy device. "
            "Generate a friendly, actionable daily health summary. "
            "Be specific with numbers. Give 2-3 actionable recommendations. "
            "Keep it under 200 words. Use emoji sparingly for readability."
        )

        prompt = f"""Daily Health Summary for {user_id}:

Heart Rate: avg {daily_stats.get('hr_avg', 'N/A')} bpm, resting {daily_stats.get('resting_hr', 'N/A')} bpm
HRV: avg {daily_stats.get('hrv_avg', 'N/A')} ms
SpO2: avg {daily_stats.get('spo2_avg', 'N/A')}%
Steps: {daily_stats.get('total_steps', 'N/A')}
Sleep: {daily_stats.get('sleep_hours', 'N/A')} hours (quality: {daily_stats.get('sleep_quality', 'N/A')}/100)
Stress: avg {daily_stats.get('stress_avg', 'N/A')}/100
Health Score: {daily_stats.get('health_score', 'N/A')}/100
Anomalies: {daily_stats.get('anomaly_count', 0)} detected

Generate a personalized daily summary with actionable advice."""

        llm_response = self._call_ollama(prompt, model=self.model_reasoning,
                                          system=system_prompt)
        if llm_response:
            return llm_response

        return self._template_daily_summary(daily_stats)

    def generate_realtime_alert(self, health_data: Dict, alert_type: str) -> str:
        """Generate a real-time alert message (low latency required)."""
        prompt = f"""Generate a brief, clear health alert (2-3 sentences max):
Type: {alert_type}
HR: {health_data.get('heart_rate_bpm', 'N/A')} bpm
HRV: {health_data.get('hrv_ms', 'N/A')} ms
SpO2: {health_data.get('spo2_pct', 'N/A')}%
Stress: {health_data.get('stress_score', 'N/A')}"""

        # Use small model for speed
        llm_response = self._call_ollama(prompt, model=self.model_name)
        if llm_response:
            return llm_response

        return self._template_alert(health_data, alert_type)

    # =========================================================================
    # Prompt Building
    # =========================================================================

    def _build_system_prompt(self) -> str:
        return (
            "You are an on-device AI health assistant running on a Samsung Galaxy wearable. "
            "Your role is to analyze biosignal data and provide clear, evidence-based health insights. "
            "Rules:\n"
            "1. Be specific — reference actual numbers from the data\n"
            "2. Explain the 'why' behind observations\n"
            "3. Provide 1-2 actionable recommendations\n"
            "4. Flag concerning patterns but don't diagnose medical conditions\n"
            "5. Be encouraging and supportive\n"
            "6. Keep responses concise (under 150 words)\n"
            "7. Use simple language anyone can understand"
        )

    def _build_health_prompt(self, data: Dict, rag_context: List[Dict] = None,
                              anomalies: List[Dict] = None) -> str:
        lines = ["Current Health Status:"]
        metric_labels = {
            "heart_rate_bpm": "Heart Rate", "hrv_ms": "HRV",
            "spo2_pct": "SpO2", "skin_temp_c": "Skin Temp",
            "stress_score": "Stress Score", "computed_stress": "Computed Stress",
            "sleep_quality_score": "Sleep Quality", "health_score": "Health Score",
            "activity_intensity": "Activity Level", "recovery_score": "Recovery",
            "steps_per_min": "Steps/min",
        }

        for key, label in metric_labels.items():
            if key in data and data[key] is not None:
                val = data[key]
                if isinstance(val, float):
                    lines.append(f"  {label}: {val:.1f}")
                else:
                    lines.append(f"  {label}: {val}")

        if anomalies:
            lines.append("\nDetected Anomalies:")
            for a in anomalies[:3]:
                lines.append(f"  - [{a['severity']}] {a['message']}")

        if rag_context:
            lines.append("\nSimilar Past Patterns:")
            for ctx in rag_context[:2]:
                state = ctx.get("health_state", {})
                lines.append(f"  - {ctx.get('summary', 'N/A')} (similarity: {ctx.get('similarity_score', 0):.2f})")

        lines.append("\nProvide a brief health insight with 1-2 recommendations.")
        return "\n".join(lines)

    # =========================================================================
    # Template Fallbacks (when LLM is unavailable)
    # =========================================================================

    def _template_insight(self, data: Dict, anomalies: List[Dict] = None) -> str:
        """Template-based insight generation — works without any LLM."""
        parts = []

        # Heart rate analysis
        hr = data.get("heart_rate_bpm")
        hrv = data.get("hrv_ms")
        if hr is not None:
            if hr > 100:
                parts.append(f"Your heart rate is elevated at {hr:.0f} bpm.")
                if hrv and hrv < 30:
                    parts.append(
                        "Combined with low HRV, this may indicate stress or poor recovery. "
                        "Consider taking a few minutes to practice deep breathing."
                    )
            elif hr < 50:
                parts.append(f"Your resting heart rate is quite low at {hr:.0f} bpm, "
                             "which is typical for well-conditioned individuals.")
            else:
                parts.append(f"Your heart rate is in a healthy range at {hr:.0f} bpm.")

        # Sleep analysis
        sleep_quality = data.get("sleep_quality_score")
        if sleep_quality is not None:
            if sleep_quality < 50:
                parts.append(f"Sleep quality scored {sleep_quality:.0f}/100 — below optimal. "
                             "Try maintaining a consistent bedtime and reducing screen time before sleep.")
            elif sleep_quality >= 80:
                parts.append(f"Excellent sleep quality at {sleep_quality:.0f}/100! Keep up the good routine.")

        # Stress
        stress = data.get("computed_stress") or data.get("stress_score")
        if stress is not None and stress > 70:
            parts.append(f"Stress levels are elevated ({stress:.0f}/100). "
                         "A short walk or mindfulness exercise could help.")

        # Health score
        health = data.get("health_score")
        if health is not None:
            parts.append(f"Overall health score: {health:.0f}/100.")

        # Anomalies
        if anomalies:
            for a in anomalies:
                parts.append(a["message"])

        if not parts:
            parts.append("All vital signs are within normal ranges. Keep up the healthy lifestyle!")

        return " ".join(parts)

    def _template_daily_summary(self, stats: Dict) -> str:
        """Template daily summary fallback."""
        lines = ["📊 Daily Health Summary", ""]

        hr = stats.get("hr_avg")
        if hr:
            lines.append(f"❤️ Heart Rate: {hr:.0f} bpm avg (resting: {stats.get('resting_hr', 'N/A')} bpm)")

        hrv = stats.get("hrv_avg")
        if hrv:
            quality = "excellent" if hrv > 60 else "good" if hrv > 40 else "below average"
            lines.append(f"💓 HRV: {hrv:.0f} ms ({quality})")

        steps = stats.get("total_steps")
        if steps:
            pct = min(steps / 10000 * 100, 100)
            lines.append(f"🚶 Steps: {steps:,.0f} ({pct:.0f}% of 10K goal)")

        sleep = stats.get("sleep_hours")
        if sleep:
            lines.append(f"😴 Sleep: {sleep:.1f} hours (quality: {stats.get('sleep_quality', 'N/A')}/100)")

        health = stats.get("health_score")
        if health:
            lines.append(f"\n🏆 Health Score: {health:.0f}/100")

        # Recommendations
        lines.append("\n💡 Recommendations:")
        if stats.get("total_steps", 10000) < 8000:
            lines.append("  • Try to add a 15-minute walk to reach your step goal")
        if stats.get("sleep_hours", 8) < 7:
            lines.append("  • Aim for 7-8 hours of sleep for optimal recovery")
        if stats.get("stress_avg", 0) > 60:
            lines.append("  • Consider a mindfulness session to manage stress")
        if stats.get("hrv_avg", 50) < 35:
            lines.append("  • Focus on recovery — try light stretching or yoga")

        return "\n".join(lines)

    def _template_alert(self, data: Dict, alert_type: str) -> str:
        """Template alert fallback."""
        templates = {
            "HR_SPIKE": f"Heart rate spike detected ({data.get('heart_rate_bpm', 'N/A')} bpm). "
                        "If not exercising, consider resting and monitoring.",
            "HRV_DROP": f"HRV has dropped significantly ({data.get('hrv_ms', 'N/A')} ms). "
                        "This may indicate increased stress or fatigue.",
            "LOW_SPO2": f"Blood oxygen is low ({data.get('spo2_pct', 'N/A')}%). "
                        "If persistent, please consult a healthcare provider.",
            "HIGH_STRESS": f"Sustained high stress detected (score: {data.get('stress_score', 'N/A')}). "
                          "Take a moment to breathe deeply.",
        }
        return templates.get(alert_type, f"Health alert: {alert_type}. Please check your vitals.")
