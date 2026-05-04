"""
Multimodal Fusion Engine
=========================
LLM-based fusion strategy that combines multiple sensor modalities:
  - Modality 1: Biosignals  (HR, HRV, SpO2, skin temperature)
  - Modality 2: Activity    (steps, intensity, energy expenditure)
  - Modality 3: Sleep       (duration, quality, stages)
  - Modality 4: Stress/Recovery (computed stress, recovery score)
  - Modality 5: Anomalies   (spike/drop/low-spo2 flags)

Fusion Strategy:
  1. Serialize each modality's numeric outputs into rich natural-language text.
  2. Build a structured cross-modal prompt that presents all modalities together.
  3. Send the fused prompt to the LLM (Ollama) for holistic reasoning.
  4. Validate cross-signal consistency and score fusion accuracy.
  5. Fall back to rule-based fusion when LLM is unavailable.
"""

import json
import logging
import time
from typing import Dict, List, Optional, Tuple

import numpy as np

from .config import PipelineConfig

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Signal metadata: human labels, units, normal ranges per modality
# ─────────────────────────────────────────────────────────────────────────────
SIGNAL_META = {
    # Biosignals modality
    "heart_rate_bpm":   {"label": "Heart Rate",        "unit": "bpm",  "low": 50,  "high": 100,  "modality": "biosignals"},
    "hrv_ms":           {"label": "HRV (RMSSD)",        "unit": "ms",   "low": 20,  "high": 100,  "modality": "biosignals"},
    "spo2_pct":         {"label": "Blood Oxygen (SpO2)","unit": "%",    "low": 95,  "high": 100,  "modality": "biosignals"},
    "skin_temp_c":      {"label": "Skin Temperature",   "unit": "°C",   "low": 31,  "high": 37,   "modality": "biosignals"},
    # Activity modality
    "steps_per_min":    {"label": "Steps/min",          "unit": "spm",  "low": 0,   "high": 100,  "modality": "activity"},
    "activity_intensity":{"label":"Activity Intensity", "unit": "0-3",  "low": 0,   "high": 3,    "modality": "activity"},
    "energy_expenditure_proxy": {"label": "Energy (kcal/min)", "unit": "kcal/min", "low": 0.5, "high": 10, "modality": "activity"},
    # Sleep modality
    "sleep_duration_min":{"label": "Sleep Duration",   "unit": "min",  "low": 360, "high": 540,  "modality": "sleep"},
    "sleep_quality_score":{"label":"Sleep Quality",    "unit": "/100", "low": 60,  "high": 100,  "modality": "sleep"},
    "deep_ratio":       {"label": "Deep Sleep Ratio",   "unit": "%",    "low": 0.15,"high": 0.30, "modality": "sleep"},
    "rem_ratio":        {"label": "REM Ratio",          "unit": "%",    "low": 0.20,"high": 0.25, "modality": "sleep"},
    # Stress/Recovery modality
    "computed_stress":  {"label": "Computed Stress",    "unit": "/100", "low": 0,   "high": 40,   "modality": "stress"},
    "stress_score":     {"label": "Device Stress",      "unit": "/100", "low": 0,   "high": 40,   "modality": "stress"},
    "recovery_score":   {"label": "Recovery Score",     "unit": "/100", "low": 60,  "high": 100,  "modality": "stress"},
    "health_score":     {"label": "Health Score",       "unit": "/100", "low": 70,  "high": 100,  "modality": "stress"},
    # Anomaly modality
    "anomaly_hr_spike": {"label": "HR Spike Flag",      "unit": "bool", "low": 0,   "high": 0,    "modality": "anomaly"},
    "anomaly_hrv_drop": {"label": "HRV Drop Flag",      "unit": "bool", "low": 0,   "high": 0,    "modality": "anomaly"},
    "anomaly_low_spo2": {"label": "Low SpO2 Flag",      "unit": "bool", "low": 0,   "high": 0,    "modality": "anomaly"},
    "anomaly_score":    {"label": "Anomaly Score",      "unit": "count","low": 0,   "high": 0,    "modality": "anomaly"},
}

MODALITY_ORDER = ["biosignals", "activity", "sleep", "stress", "anomaly"]

ACTIVITY_LABELS = {0: "Sedentary", 1: "Light", 2: "Moderate", 3: "Vigorous"}


# ─────────────────────────────────────────────────────────────────────────────
# Serialization helpers
# ─────────────────────────────────────────────────────────────────────────────

def _status(value: float, low: float, high: float) -> str:
    """Return a human-readable status tag for a signal value."""
    if value < low:
        return "LOW"
    elif value > high:
        return "HIGH"
    return "NORMAL"


def serialize_biosignals(data: Dict) -> str:
    """Serialize biosignal modality into a structured text block."""
    lines = ["[MODALITY: BIOSIGNALS]"]
    keys = ["heart_rate_bpm", "hrv_ms", "spo2_pct", "skin_temp_c"]
    for key in keys:
        if key not in data or data[key] is None:
            continue
        meta = SIGNAL_META[key]
        val = data[key]
        status = _status(val, meta["low"], meta["high"])
        lines.append(f"  {meta['label']}: {val:.1f} {meta['unit']} [{status}]")

    # Cross-signal note
    hr = data.get("heart_rate_bpm")
    hrv = data.get("hrv_ms")
    if hr and hrv:
        if hr > 90 and hrv < 30:
            lines.append("  >> Cross-signal: Elevated HR + Depressed HRV → Likely physiological stress")
        elif hr < 65 and hrv > 60:
            lines.append("  >> Cross-signal: Low HR + High HRV → Excellent cardiac recovery state")

    return "\n".join(lines)


def serialize_activity(data: Dict) -> str:
    """Serialize activity modality into a structured text block."""
    lines = ["[MODALITY: ACTIVITY]"]
    intensity = data.get("activity_intensity")
    if intensity is not None:
        label = ACTIVITY_LABELS.get(int(intensity), "Unknown")
        lines.append(f"  Activity Level: {label} (code={int(intensity)})")

    spm = data.get("steps_per_min")
    if spm is not None:
        lines.append(f"  Steps/min: {spm:.1f}")

    energy = data.get("energy_expenditure_proxy")
    if energy is not None:
        lines.append(f"  Energy Expenditure: {energy:.2f} kcal/min")

    step_15 = data.get("step_intensity_15min")
    if step_15 is not None:
        lines.append(f"  15-min Step Count: {step_15:.0f} steps")

    return "\n".join(lines)


def serialize_sleep(data: Dict) -> str:
    """Serialize sleep modality into a structured text block."""
    lines = ["[MODALITY: SLEEP]"]
    duration = data.get("sleep_duration_min")
    if duration is not None:
        hours = duration / 60
        status = _status(duration, 360, 540)
        lines.append(f"  Sleep Duration: {hours:.1f} hrs ({duration:.0f} min) [{status}]")

    quality = data.get("sleep_quality_score")
    if quality is not None:
        status = _status(quality, 60, 100)
        lines.append(f"  Sleep Quality: {quality:.1f}/100 [{status}]")

    deep = data.get("deep_ratio")
    rem = data.get("rem_ratio")
    if deep is not None:
        lines.append(f"  Deep Sleep: {deep*100:.1f}%  REM: {rem*100:.1f}%" if rem else f"  Deep Sleep: {deep*100:.1f}%")

    consistency = data.get("sleep_consistency")
    if consistency is not None:
        lines.append(f"  Sleep Consistency: {consistency:.1f}/100")

    # Cross-modal sleep-recovery note
    hrv = data.get("hrv_ms")
    if quality and hrv:
        if quality < 50 and hrv < 30:
            lines.append("  >> Cross-signal: Poor sleep + Low HRV → Significant recovery deficit")

    return "\n".join(lines)


def serialize_stress_recovery(data: Dict) -> str:
    """Serialize stress & recovery modality into a structured text block."""
    lines = ["[MODALITY: STRESS & RECOVERY]"]

    stress = data.get("computed_stress") or data.get("stress_score")
    if stress is not None:
        status = "HIGH" if stress > 60 else "MODERATE" if stress > 30 else "LOW"
        lines.append(f"  Stress Level: {stress:.1f}/100 [{status}]")

    recovery = data.get("recovery_score")
    if recovery is not None:
        status = _status(recovery, 60, 100)
        lines.append(f"  Recovery Score: {recovery:.1f}/100 [{status}]")

    health = data.get("health_score")
    if health is not None:
        status = _status(health, 70, 100)
        lines.append(f"  Overall Health Score: {health:.1f}/100 [{status}]")

    hr_trend = data.get("hr_trend_30min")
    if hr_trend is not None:
        lines.append(f"  30-min HR Trend: {hr_trend:.1f} bpm")

    # Cross-modal stress-activity note
    intensity = data.get("activity_intensity")
    if stress and intensity is not None:
        if stress > 70 and int(intensity) == 0:
            lines.append("  >> Cross-signal: High stress while sedentary → Likely psychological/physiological load")
        elif stress > 70 and int(intensity) >= 2:
            lines.append("  >> Cross-signal: High stress during intense activity → Exercise-induced, likely transient")

    return "\n".join(lines)


def serialize_anomalies(data: Dict) -> str:
    """Serialize anomaly modality into a structured text block."""
    lines = ["[MODALITY: ANOMALY FLAGS]"]
    flag_map = {
        "anomaly_hr_spike":  "⚠ HR Spike Detected",
        "anomaly_hrv_drop":  "⚠ HRV Drop Detected",
        "anomaly_low_spo2":  "⚠ Low SpO2 Detected",
        "anomaly_critical_hr": "🚨 Critical HR Range",
    }
    active = []
    for key, label in flag_map.items():
        if data.get(key, 0):
            active.append(label)
            lines.append(f"  {label}")

    score = data.get("anomaly_score", 0)
    lines.append(f"  Composite Anomaly Score: {score:.0f}")

    flags_text = data.get("anomaly_flags", "")
    if flags_text and flags_text.strip():
        lines.append(f"  Active Flags: {flags_text.strip(';')}")

    if not active:
        lines.append("  No anomalies detected — all signals nominal")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Main Fusion Engine
# ─────────────────────────────────────────────────────────────────────────────

class MultimodalFusionEngine:
    """
    LLM-based multimodal fusion engine.

    Combines five sensor modalities into a single structured prompt and
    uses the on-device Ollama LLM to reason across all signals holistically.
    Includes fallback rule-based fusion for offline operation.
    """

    SYSTEM_PROMPT = (
        "You are an expert on-device health AI running on a Samsung Galaxy wearable. "
        "You receive structured multi-modal sensor data serialized from five sources: "
        "biosignals, activity, sleep, stress/recovery, and anomaly flags. "
        "Your task is cross-modal reasoning — identify patterns that span multiple "
        "modalities and generate a unified, actionable health insight. "
        "Rules:\n"
        "1. Reference specific numbers from each modality\n"
        "2. Identify cross-modal correlations (e.g., poor sleep → elevated stress → HR spike)\n"
        "3. Distinguish exercise-induced vs pathological signals\n"
        "4. Give 2-3 concrete, prioritized recommendations\n"
        "5. Flag urgent findings clearly with severity (INFO/WARNING/CRITICAL)\n"
        "6. Keep response under 200 words\n"
        "7. Do NOT diagnose medical conditions"
    )

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.model_name = config.model.llm_model_name        # gemma3:4b  (fast)
        self.model_reasoning = config.model.llm_model_reasoning  # gemma3:12b (deep)
        self.temperature = config.model.llm_temperature
        self.max_tokens = config.model.llm_max_tokens
        self.ollama_available = False
        self._check_ollama()

    # ──────────────────────────────────────────────────────────────────────────
    # Ollama interface
    # ──────────────────────────────────────────────────────────────────────────

    def _check_ollama(self):
        """Check Ollama availability and model presence."""
        try:
            import requests
            resp = requests.get("http://localhost:11434/api/tags", timeout=3)
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                self.ollama_available = True
                logger.info(f"[Fusion] Ollama online. Models: {models}")
                for m in [self.model_name, self.model_reasoning]:
                    base = m.split(":")[0]
                    if not any(base in n for n in models):
                        logger.warning(f"[Fusion] Model '{m}' not pulled. Run: ollama pull {m}")
            else:
                logger.info("[Fusion] Ollama not responding — rule-based fallback active")
        except Exception:
            logger.info("[Fusion] Ollama unavailable — rule-based fallback active")

    def _call_ollama(self, prompt: str, model: Optional[str] = None,
                     system: Optional[str] = None) -> Optional[str]:
        """Send fused prompt to local Ollama LLM."""
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

            t0 = time.time()
            resp = requests.post(
                "http://localhost:11434/api/generate",
                json=payload,
                timeout=45
            )
            latency = time.time() - t0

            if resp.status_code == 200:
                result = resp.json().get("response", "").strip()
                logger.info(f"[Fusion] LLM response: {latency:.2f}s, {len(result)} chars")
                return result
            else:
                logger.warning(f"[Fusion] Ollama HTTP {resp.status_code}")
                return None
        except Exception as e:
            logger.warning(f"[Fusion] Ollama call failed: {e}")
            return None

    # ──────────────────────────────────────────────────────────────────────────
    # Serialization
    # ──────────────────────────────────────────────────────────────────────────

    def serialize_all_modalities(self, data: Dict) -> str:
        """
        Serialize all five modalities into a single structured text.
        This is the 'multimodal input' that replaces per-signal prompts.
        """
        blocks = [
            serialize_biosignals(data),
            serialize_activity(data),
            serialize_sleep(data),
            serialize_stress_recovery(data),
            serialize_anomalies(data),
        ]
        header = "=== MULTIMODAL HEALTH STATE SNAPSHOT ==="
        footer = "=== END SNAPSHOT ==="
        return f"{header}\n\n" + "\n\n".join(blocks) + f"\n\n{footer}"

    def build_fusion_prompt(self, data: Dict,
                             rag_context: Optional[List[Dict]] = None,
                             alerts: Optional[List[Dict]] = None) -> str:
        """
        Build the complete structured fusion prompt.

        Structure:
            [MULTIMODAL SNAPSHOT]
            [SAFETY ALERTS]  (if any)
            [PAST PATTERNS]  (RAG context, if any)
            [TASK]
        """
        parts = [self.serialize_all_modalities(data)]

        # Safety alerts section
        if alerts:
            parts.append("[SAFETY ALERTS — REQUIRE IMMEDIATE ATTENTION]")
            for a in alerts[:5]:
                parts.append(f"  [{a['severity']}] {a['message']}")

        # RAG context section
        if rag_context:
            parts.append("[SIMILAR PAST HEALTH PATTERNS]")
            for ctx in rag_context[:3]:
                sim = ctx.get("similarity_score", 0)
                summary = ctx.get("summary", "N/A")
                parts.append(f"  - {summary}  (similarity: {sim:.2f})")

        # Task instruction
        parts.append(
            "[TASK] Perform cross-modal fusion reasoning across all five modalities above. "
            "Identify multi-signal patterns, prioritize findings by severity, "
            "and provide a concise unified health insight with actionable recommendations."
        )

        return "\n\n".join(parts)

    # ──────────────────────────────────────────────────────────────────────────
    # Fusion Accuracy Validation
    # ──────────────────────────────────────────────────────────────────────────

    def validate_cross_signal_consistency(self, data: Dict) -> Dict:
        """
        Rule-based cross-signal consistency checker.
        Detects contradictions or corroborations between modalities.
        Returns a consistency report with a 0-100 score.
        """
        issues = []
        confirmations = []
        score = 100

        hr = data.get("heart_rate_bpm")
        hrv = data.get("hrv_ms")
        stress = data.get("computed_stress") or data.get("stress_score")
        spo2 = data.get("spo2_pct")
        intensity = data.get("activity_intensity")
        sleep_q = data.get("sleep_quality_score")
        recovery = data.get("recovery_score")
        anomaly_hr = data.get("anomaly_hr_spike", 0)
        anomaly_hrv = data.get("anomaly_hrv_drop", 0)
        anomaly_spo2 = data.get("anomaly_low_spo2", 0)

        # Rule 1: HR spike + HRV drop should co-occur under stress
        if anomaly_hr and hrv and hrv > 80:
            issues.append("HR spike flagged but HRV is high — possible sensor noise")
            score -= 15

        # Rule 2: High stress + high recovery is contradictory
        if stress and recovery:
            if stress > 70 and recovery > 80:
                issues.append("High stress + high recovery score — conflicting modalities")
                score -= 10

        # Rule 3: Low SpO2 + vigorous activity is expected (transient)
        if anomaly_spo2 and intensity is not None and int(intensity) >= 3:
            confirmations.append("Low SpO2 during vigorous activity — physiologically expected")
            score += 5  # bonus for consistent multi-modal context

        # Rule 4: Elevated HR should correlate with activity
        if hr and hr > 110 and intensity is not None and int(intensity) == 0:
            issues.append("HR >110 bpm while sedentary — stress/illness signal, not exercise")
            score -= 10

        # Rule 5: Poor sleep + high stress corroboration
        if sleep_q and stress:
            if sleep_q < 50 and stress > 60:
                confirmations.append("Poor sleep corroborates elevated stress — consistent pattern")

        # Rule 6: HR-HRV inverse relationship check
        if hr and hrv:
            # Normally hr and hrv are inversely correlated
            if hr > 90 and hrv > 80:
                issues.append("High HR + High HRV simultaneously — unusual, verify sensor data")
                score -= 8
            elif hr < 65 and hrv > 50:
                confirmations.append("Low HR + High HRV → confirmed parasympathetic dominance (good recovery)")

        score = max(0, min(100, score))
        return {
            "consistency_score": score,
            "issues": issues,
            "confirmations": confirmations,
            "modalities_present": self._count_modalities(data),
        }

    def _count_modalities(self, data: Dict) -> Dict[str, bool]:
        """Check which modalities have data present."""
        checks = {
            "biosignals": any(k in data for k in ["heart_rate_bpm", "hrv_ms", "spo2_pct"]),
            "activity":   any(k in data for k in ["steps_per_min", "activity_intensity"]),
            "sleep":      any(k in data for k in ["sleep_duration_min", "sleep_quality_score"]),
            "stress":     any(k in data for k in ["computed_stress", "stress_score", "recovery_score"]),
            "anomaly":    any(k in data for k in ["anomaly_score", "anomaly_hr_spike"]),
        }
        return checks

    # ──────────────────────────────────────────────────────────────────────────
    # Rule-based fallback fusion
    # ──────────────────────────────────────────────────────────────────────────

    def _fallback_fusion(self, data: Dict, consistency: Dict,
                          alerts: Optional[List[Dict]] = None) -> str:
        """
        Rule-based multimodal fusion insight (no LLM required).
        Generates a structured summary from deterministic rules across all modalities.
        """
        parts = []

        # Biosignals summary
        hr = data.get("heart_rate_bpm")
        hrv = data.get("hrv_ms")
        spo2 = data.get("spo2_pct")
        if hr:
            tag = "elevated" if hr > 100 else "low" if hr < 50 else "normal"
            parts.append(f"Heart rate is {tag} at {hr:.0f} bpm.")
        if hrv:
            tag = "excellent" if hrv > 60 else "good" if hrv > 40 else "low"
            parts.append(f"HRV is {tag} ({hrv:.0f} ms).")
        if spo2 and spo2 < 95:
            parts.append(f"SpO2 is below normal at {spo2:.1f}% — monitor closely.")

        # Sleep cross-modal
        sleep_q = data.get("sleep_quality_score")
        if sleep_q:
            tag = "poor" if sleep_q < 50 else "fair" if sleep_q < 70 else "good"
            parts.append(f"Last night's sleep quality was {tag} ({sleep_q:.0f}/100).")

        # Stress cross-modal
        stress = data.get("computed_stress") or data.get("stress_score")
        recovery = data.get("recovery_score")
        if stress and stress > 60:
            parts.append(f"Stress is elevated ({stress:.0f}/100).")
        if recovery:
            tag = "good" if recovery > 60 else "poor"
            parts.append(f"Recovery is {tag} ({recovery:.0f}/100).")

        # Health score
        health = data.get("health_score")
        if health:
            parts.append(f"Overall health score: {health:.0f}/100.")

        # Consistency warnings
        for issue in consistency.get("issues", []):
            parts.append(f"Note: {issue}.")

        # Alerts
        if alerts:
            for a in alerts[:2]:
                parts.append(f"[{a['severity']}] {a['message']}")

        # Recommendations
        recs = []
        intensity = data.get("activity_intensity", 0)
        if sleep_q and sleep_q < 60:
            recs.append("prioritize 7-8 hours of sleep tonight")
        if stress and stress > 60 and int(intensity) == 0:
            recs.append("take a 10-min walk to reduce stress")
        if hrv and hrv < 30:
            recs.append("try deep breathing or light stretching for recovery")
        if recs:
            parts.append("Recommendations: " + "; ".join(recs) + ".")

        if not parts:
            parts.append("All signals are within normal ranges across all modalities. Keep up the great work!")

        return " ".join(parts)

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def fuse(self, data: Dict,
             rag_context: Optional[List[Dict]] = None,
             alerts: Optional[List[Dict]] = None,
             use_deep_model: bool = False) -> Dict:
        """
        Main fusion entry point.

        Args:
            data:          Dict of health metrics from all modalities.
            rag_context:   Similar past states from RAG memory.
            alerts:        Safety alerts from RuleEngine.
            use_deep_model: Use gemma3:12b instead of gemma3:4b.

        Returns:
            Dict with:
              - fused_insight: str   — natural language cross-modal insight
              - serialized_input: str — the full prompt sent to LLM
              - consistency: dict    — cross-signal validation report
              - modalities_present: dict — which modalities had data
              - model_used: str      — "ollama:gemma3:4b" | "ollama:gemma3:12b" | "fallback"
              - latency_ms: float
        """
        t0 = time.time()

        # Step 1: Validate cross-signal consistency
        consistency = self.validate_cross_signal_consistency(data)

        # Step 2: Build structured fusion prompt
        prompt = self.build_fusion_prompt(data, rag_context, alerts)

        # Step 3: Choose model
        model = self.model_reasoning if use_deep_model else self.model_name

        # Step 4: Call LLM
        llm_response = self._call_ollama(prompt, model=model, system=self.SYSTEM_PROMPT)

        if llm_response:
            model_used = f"ollama:{model}"
            insight = llm_response
        else:
            # Step 5: Rule-based fallback
            model_used = "fallback:rules"
            insight = self._fallback_fusion(data, consistency, alerts)

        latency_ms = (time.time() - t0) * 1000

        return {
            "fused_insight": insight,
            "serialized_input": prompt,
            "consistency": consistency,
            "modalities_present": consistency["modalities_present"],
            "model_used": model_used,
            "latency_ms": round(latency_ms, 1),
        }

    def fuse_batch(self, records: List[Dict]) -> List[Dict]:
        """Fuse a batch of health state records. Returns list of fusion results."""
        results = []
        for i, record in enumerate(records):
            try:
                result = self.fuse(record)
                results.append(result)
                if (i + 1) % 10 == 0:
                    logger.info(f"[Fusion] Batch progress: {i+1}/{len(records)}")
            except Exception as e:
                logger.warning(f"[Fusion] Batch record {i} failed: {e}")
                results.append({"fused_insight": "Fusion error", "error": str(e)})
        return results

    def optimize_prompt_size(self, data: Dict) -> Tuple[str, int]:
        """
        Build a token-optimized prompt by dropping low-priority fields
        when data is sparse or redundant.
        Returns (optimized_prompt, estimated_token_count).
        """
        # Score each field by presence and anomaly relevance
        priority_keys = [
            "heart_rate_bpm", "hrv_ms", "spo2_pct",
            "computed_stress", "health_score", "sleep_quality_score",
            "activity_intensity", "anomaly_score",
        ]
        # Keep only fields with non-None values and priority keys first
        slim_data = {k: v for k, v in data.items()
                     if v is not None and not (isinstance(v, float) and np.isnan(v))}

        prompt = self.build_fusion_prompt(slim_data)
        # Rough token estimate: ~4 chars per token
        est_tokens = len(prompt) // 4
        logger.info(f"[Fusion] Optimized prompt: {len(prompt)} chars ≈ {est_tokens} tokens")
        return prompt, est_tokens
