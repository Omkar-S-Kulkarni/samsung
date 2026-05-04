"""
Personalized Recommendation Engine
=====================================
Generates deeply personalized health recommendations using:
  - On-device LLM (gemma3:4b / gemma3:12b via Ollama)
  - RAG memory for pattern-based personalization
  - ML model outputs (stress prediction, anomaly scores)
  - Rule-based fallback when LLM is offline

Recommendation categories:
  1. Sleep      – target hours, bedtime window, quality improvements
  2. Exercise   – gym frequency, duration, type based on recovery/stress
  3. Cardio     – walking/jogging distance, pace, heart-rate zones
  4. Stress     – breathing, mindfulness, recovery days
  5. Recovery   – rest advice, HRV-based readiness
  6. Hydration  – hydration reminders based on activity
  7. Alerts     – urgent clinical flags
"""

import logging
import time
from typing import Dict, List, Optional, Tuple

import numpy as np

from .config import PipelineConfig

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Reference ranges used for personalization logic
# ─────────────────────────────────────────────────────────────────────────────

SLEEP_TARGETS = {
    "athlete":   {"min": 8.0, "ideal": 9.0},
    "active":    {"min": 7.5, "ideal": 8.5},
    "moderate":  {"min": 7.0, "ideal": 8.0},
    "sedentary": {"min": 7.0, "ideal": 7.5},
}

HR_ZONES = {
    "rest":       (0,    60),
    "light":      (60,   100),
    "moderate":   (100,  140),
    "vigorous":   (140,  170),
    "max":        (170,  220),
}

RECOVERY_THRESHOLDS = {
    "fully_recovered":  80,
    "partially":        60,
    "needs_rest":       40,
}


# ─────────────────────────────────────────────────────────────────────────────
# Profile classifier
# ─────────────────────────────────────────────────────────────────────────────

def classify_fitness_profile(data: Dict, history: Optional[Dict] = None) -> str:
    """Classify user into fitness tier from their biosignal + activity patterns."""
    steps = data.get("steps_per_min", 0) or 0
    intensity = data.get("activity_intensity", 0) or 0
    resting_hr = data.get("resting_hr") or data.get("heart_rate_bpm", 75)
    hrv = data.get("hrv_ms", 40) or 40

    score = 0
    # Low resting HR = fit
    if resting_hr < 55:    score += 3
    elif resting_hr < 65:  score += 2
    elif resting_hr < 75:  score += 1
    # High HRV = fit
    if hrv > 70:   score += 3
    elif hrv > 50: score += 2
    elif hrv > 30: score += 1
    # Activity
    if intensity >= 3:    score += 3
    elif intensity >= 2:  score += 2
    elif intensity >= 1:  score += 1

    if score >= 8:   return "athlete"
    if score >= 5:   return "active"
    if score >= 2:   return "moderate"
    return "sedentary"


# ─────────────────────────────────────────────────────────────────────────────
# Rule-based recommendation builders (always available, no LLM needed)
# ─────────────────────────────────────────────────────────────────────────────

def _sleep_rec(data: Dict, profile: str) -> Dict:
    target = SLEEP_TARGETS.get(profile, SLEEP_TARGETS["moderate"])
    sleep_min = data.get("sleep_duration_min") or 0
    actual_hrs = sleep_min / 60
    quality = data.get("sleep_quality_score", 50) or 50
    consistency = data.get("sleep_consistency", 70) or 70

    deficit_hrs = max(target["ideal"] - actual_hrs, 0)

    lines = []
    if actual_hrs < target["min"]:
        lines.append(
            f"You slept {actual_hrs:.1f} hrs — below your {profile}-tier target of "
            f"{target['min']:.1f}–{target['ideal']:.1f} hrs."
        )
        lines.append(
            f"Aim to add {deficit_hrs*60:.0f} minutes tonight. "
            f"Set a consistent bedtime and dim screens 45 min before sleep."
        )
    else:
        lines.append(
            f"Sleep duration ({actual_hrs:.1f} hrs) meets your {profile} target. "
            f"Maintain this schedule."
        )

    if quality < 60:
        lines.append(
            f"Sleep quality is low ({quality:.0f}/100). "
            "Try: avoid caffeine after 2 PM, keep bedroom below 19°C, "
            "and do 5 min of box breathing before bed."
        )
    if consistency < 65:
        lines.append(
            f"Sleep schedule consistency is {consistency:.0f}/100. "
            "Waking and sleeping at the same time (even weekends) adds 15–20% quality."
        )
    deep = data.get("deep_ratio", 0) or 0
    if deep < 0.15:
        lines.append(
            f"Deep sleep is only {deep*100:.0f}% (target ≥15%). "
            "Reduce alcohol, exercise earlier in the day, and keep the room dark."
        )

    priority = "HIGH" if actual_hrs < target["min"] - 1 else \
               "MEDIUM" if actual_hrs < target["min"] else "LOW"
    return {
        "category": "Sleep",
        "priority": priority,
        "target": f"{target['ideal']:.1f} hrs/night",
        "details": " ".join(lines),
    }


def _exercise_rec(data: Dict, profile: str) -> Dict:
    recovery = data.get("recovery_score", 50) or 50
    stress = data.get("computed_stress") or data.get("stress_score", 40) or 40
    hrv = data.get("hrv_ms", 40) or 40
    intensity = int(data.get("activity_intensity", 0) or 0)

    # Readiness-adjusted gym sessions per week
    if recovery >= RECOVERY_THRESHOLDS["fully_recovered"]:
        sessions = {"athlete": 6, "active": 5, "moderate": 4, "sedentary": 3}[profile]
        intensity_label = "High-intensity (HIIT, weights, intervals)"
        duration_min = {"athlete": 75, "active": 60, "moderate": 45, "sedentary": 30}[profile]
        readiness = "READY"
    elif recovery >= RECOVERY_THRESHOLDS["partially"]:
        sessions = {"athlete": 4, "active": 3, "moderate": 3, "sedentary": 2}[profile]
        intensity_label = "Moderate (strength training, cycling, swimming)"
        duration_min = {"athlete": 50, "active": 45, "moderate": 35, "sedentary": 25}[profile]
        readiness = "PARTIAL"
    else:
        sessions = 1
        intensity_label = "Light (yoga, stretching, gentle walk)"
        duration_min = 20
        readiness = "REST"

    lines = [
        f"Recovery score: {recovery:.0f}/100 — readiness: {readiness}.",
        f"Recommended: {sessions} gym sessions/week, "
        f"{duration_min} min each, {intensity_label}.",
    ]

    if stress > 70:
        lines.append(
            "High stress detected — avoid max-effort training today. "
            "Prioritize low-intensity movement to lower cortisol."
        )
    if hrv < 25 and readiness != "REST":
        lines.append(
            f"HRV is low ({hrv:.0f} ms) — reduce workout intensity by 20% "
            "and shorten session to avoid overtraining."
        )

    priority = "HIGH" if readiness == "REST" else "MEDIUM"
    return {
        "category": "Exercise / Gym",
        "priority": priority,
        "target": f"{sessions} sessions/week × {duration_min} min",
        "details": " ".join(lines),
    }


def _cardio_rec(data: Dict, profile: str) -> Dict:
    resting_hr = data.get("resting_hr") or data.get("heart_rate_bpm", 70) or 70
    hrv = data.get("hrv_ms", 40) or 40
    recovery = data.get("recovery_score", 50) or 50
    steps_pm = data.get("steps_per_min", 0) or 0

    # Estimate daily steps
    daily_steps = steps_pm * 60 * 24  # rough proxy from per-min rate

    # Cardio zone targets based on resting HR (Karvonen approximation)
    max_hr_est = 220 - 30  # assume age 30 default
    mod_zone_low  = int(resting_hr + 0.5 * (max_hr_est - resting_hr))
    mod_zone_high = int(resting_hr + 0.7 * (max_hr_est - resting_hr))
    vig_zone_low  = int(resting_hr + 0.7 * (max_hr_est - resting_hr))

    walk_targets = {
        "athlete":   {"walk_km": 5,  "jog_km": 8,  "pace": "5:00–6:00 min/km"},
        "active":    {"walk_km": 4,  "jog_km": 6,  "pace": "6:00–7:00 min/km"},
        "moderate":  {"walk_km": 3,  "jog_km": 4,  "pace": "7:00–8:30 min/km"},
        "sedentary": {"walk_km": 2,  "jog_km": 0,  "pace": "brisk walk only"},
    }
    t = walk_targets[profile]

    lines = []
    if recovery >= 70:
        if t["jog_km"] > 0:
            lines.append(
                f"Today: jog {t['jog_km']} km at {t['pace']} "
                f"(target HR {mod_zone_low}–{vig_zone_low} bpm)."
            )
        else:
            lines.append(
                f"Today: brisk walk {t['walk_km']} km "
                f"(target HR {mod_zone_low}–{mod_zone_high} bpm)."
            )
    else:
        lines.append(
            f"Recovery is low — walk {t['walk_km']} km at easy pace "
            f"(HR below {mod_zone_low} bpm)."
        )

    # Step goal
    step_goal = {"athlete": 12000, "active": 10000, "moderate": 8000, "sedentary": 6000}[profile]
    lines.append(f"Daily step goal: {step_goal:,} steps.")

    if hrv > 60:
        lines.append(
            "Excellent HRV — good day for a longer endurance run or cycling session."
        )

    priority = "MEDIUM"
    return {
        "category": "Cardio (Walk / Jog / Run)",
        "priority": priority,
        "target": f"{t['jog_km'] or t['walk_km']} km/session · {step_goal:,} steps/day",
        "details": " ".join(lines),
    }


def _stress_rec(data: Dict, profile: str) -> Dict:
    stress = data.get("computed_stress") or data.get("stress_score", 30) or 30
    hrv = data.get("hrv_ms", 40) or 40
    hr = data.get("heart_rate_bpm", 70) or 70

    lines = []
    if stress >= 75:
        lines.append(
            f"Stress is critical ({stress:.0f}/100). "
            "Do 4-7-8 breathing (inhale 4s, hold 7s, exhale 8s) for 5 min now."
        )
        lines.append(
            "Reschedule non-urgent work. Take a 10-min outdoor walk — "
            "natural light lowers cortisol measurably."
        )
        priority = "HIGH"
    elif stress >= 50:
        lines.append(
            f"Stress is moderate ({stress:.0f}/100). "
            "Try box breathing (4s in, 4s hold, 4s out, 4s hold) twice today."
        )
        lines.append(
            "A 20-min mindfulness session or light yoga will help restore HRV."
        )
        priority = "MEDIUM"
    else:
        lines.append(
            f"Stress is well-managed ({stress:.0f}/100). "
            "Maintain current routine. Continue any meditation habit."
        )
        priority = "LOW"

    if hrv < 25:
        lines.append(
            f"HRV of {hrv:.0f} ms indicates autonomic fatigue. "
            "Add a cold shower (30s cold finish) and aim for 30 min more sleep."
        )
    if hr > 85 and stress > 50:
        lines.append(
            f"Elevated resting HR ({hr:.0f} bpm) + stress = physiological load. "
            "Hydrate well and avoid stimulants today."
        )

    return {
        "category": "Stress Management",
        "priority": priority,
        "target": "Stress ≤40/100 · HRV ≥40ms",
        "details": " ".join(lines),
    }


def _recovery_rec(data: Dict, profile: str) -> Dict:
    recovery = data.get("recovery_score", 50) or 50
    hrv = data.get("hrv_ms", 40) or 40
    sleep_quality = data.get("sleep_quality_score", 50) or 50
    anomaly_score = data.get("anomaly_score", 0) or 0

    lines = []
    if recovery >= 80:
        lines.append(
            f"Full recovery ({recovery:.0f}/100) — body is primed. "
            "Green light for peak performance or a new personal best attempt."
        )
        priority = "LOW"
    elif recovery >= 60:
        lines.append(
            f"Partial recovery ({recovery:.0f}/100). "
            "Suitable for moderate training. Include a 10-min cool-down and stretch."
        )
        lines.append(
            "HRV-guided recovery tip: if HRV drops another 10 ms, take a full rest day."
        )
        priority = "MEDIUM"
    else:
        lines.append(
            f"Recovery is poor ({recovery:.0f}/100). "
            "Take a full rest day or do only restorative yoga / light walking."
        )
        lines.append(
            "Focus on: 8+ hrs sleep, protein-rich meals, and reducing screen time after 9 PM."
        )
        priority = "HIGH"

    if anomaly_score >= 2:
        lines.append(
            f"Multiple anomaly flags ({anomaly_score:.0f}) detected today — "
            "rest is strongly recommended over any training."
        )

    return {
        "category": "Recovery & Readiness",
        "priority": priority,
        "target": "Recovery ≥80/100 before high-intensity sessions",
        "details": " ".join(lines),
    }


def _hydration_rec(data: Dict, profile: str) -> Dict:
    intensity = int(data.get("activity_intensity", 0) or 0)
    skin_temp = data.get("skin_temp_c", 33) or 33
    steps_pm = data.get("steps_per_min", 0) or 0

    base_litres = {"athlete": 3.5, "active": 3.0, "moderate": 2.5, "sedentary": 2.0}[profile]

    # Adjust for activity and temp
    if intensity >= 3:
        base_litres += 0.8
    elif intensity >= 2:
        base_litres += 0.4
    if skin_temp > 36:
        base_litres += 0.3

    cups = int(base_litres / 0.25)
    reminder_freq_hrs = 1 if intensity >= 2 else 2

    lines = [
        f"Daily water target: {base_litres:.1f} L ({cups} cups).",
        f"Set a reminder every {reminder_freq_hrs} hour(s) to drink 250 ml.",
    ]
    if intensity >= 2:
        lines.append(
            "During exercise: 150–200 ml every 15 min to prevent dehydration."
        )
    if skin_temp > 36.5:
        lines.append(
            f"Skin temp elevated ({skin_temp:.1f}°C) — increase fluids by 0.5 L today."
        )

    return {
        "category": "Hydration",
        "priority": "LOW",
        "target": f"{base_litres:.1f} L/day",
        "details": " ".join(lines),
    }


def build_rule_recommendations(data: Dict, profile: str, alerts: List[Dict]) -> List[Dict]:
    """Generate all rule-based recommendations across all categories."""
    recs = [
        _sleep_rec(data, profile),
        _exercise_rec(data, profile),
        _cardio_rec(data, profile),
        _stress_rec(data, profile),
        _recovery_rec(data, profile),
        _hydration_rec(data, profile),
    ]

    # Add urgent alert recommendations
    for alert in alerts:
        if alert["severity"] in ("CRITICAL", "WARNING"):
            recs.insert(0, {
                "category": f"⚠ Health Alert [{alert['severity']}]",
                "priority": "CRITICAL" if alert["severity"] == "CRITICAL" else "HIGH",
                "target": "Immediate action",
                "details": alert["message"],
            })

    return recs


# ─────────────────────────────────────────────────────────────────────────────
# Main Recommendation Engine
# ─────────────────────────────────────────────────────────────────────────────

class PersonalizedRecommendationEngine:
    """
    Generates deeply personalized health recommendations.

    Pipeline:
        1. Classify user fitness profile from biosignals + activity
        2. Build rule-based recommendations across 6 categories
        3. Retrieve similar past states from RAG memory for context
        4. Enrich with LLM (gemma3:12b) for narrative personalization
        5. Rank by priority and return structured output
    """

    SYSTEM_PROMPT = (
        "You are a world-class health coach AI running on a Samsung Galaxy wearable device. "
        "You receive structured multi-sensor health data and rule-based recommendations. "
        "Your job is to enhance these recommendations with highly personalized, evidence-based "
        "narrative coaching — making them specific, motivating, and actionable. "
        "Rules:\n"
        "1. Address the user directly ('you', 'your')\n"
        "2. Reference specific numbers from the data (HRV, HR, sleep hours, etc.)\n"
        "3. Explain the biological WHY behind each recommendation\n"
        "4. Prioritize urgent items first\n"
        "5. Be encouraging but honest\n"
        "6. Keep total response under 300 words\n"
        "7. Format as numbered recommendations with category labels\n"
        "8. Do NOT diagnose medical conditions"
    )

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.model_fast = config.model.llm_model_name        # gemma3:4b
        self.model_deep = config.model.llm_model_reasoning   # gemma3:12b
        self.temperature = config.model.llm_temperature
        self.max_tokens = 600  # slightly larger for recommendations
        self.ollama_available = False
        self._check_ollama()

    def _check_ollama(self):
        try:
            import requests
            r = requests.get("http://localhost:11434/api/tags", timeout=3)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                self.ollama_available = True
                logger.info(f"[Reco] Ollama online. Models: {models}")
                for m in [self.model_fast, self.model_deep]:
                    base = m.split(":")[0]
                    if not any(base in n for n in models):
                        logger.warning(f"[Reco] '{m}' not pulled. Run: ollama pull {m}")
        except Exception:
            logger.info("[Reco] Ollama offline — rule-based fallback active")

    def _call_llm(self, prompt: str, model: str) -> Optional[str]:
        if not self.ollama_available:
            return None
        try:
            import requests
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": self.temperature, "num_predict": self.max_tokens},
                "system": self.SYSTEM_PROMPT,
            }
            t0 = time.time()
            r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
            latency = time.time() - t0
            if r.status_code == 200:
                text = r.json().get("response", "").strip()
                logger.info(f"[Reco] LLM in {latency:.1f}s, {len(text)} chars")
                return text
            logger.warning(f"[Reco] Ollama HTTP {r.status_code}")
            return None
        except Exception as e:
            logger.warning(f"[Reco] LLM call failed: {e}")
            return None

    def _build_llm_prompt(self, data: Dict, profile: str,
                           rule_recs: List[Dict],
                           rag_context: Optional[List[Dict]]) -> str:
        """Build the enrichment prompt sent to the LLM."""
        lines = [
            f"USER FITNESS PROFILE: {profile.upper()}",
            "",
            "CURRENT HEALTH METRICS:",
        ]

        metric_map = {
            "heart_rate_bpm":      "Heart Rate",
            "hrv_ms":              "HRV",
            "spo2_pct":            "SpO2",
            "skin_temp_c":         "Skin Temp",
            "steps_per_min":       "Steps/min",
            "activity_intensity":  "Activity Level (0-3)",
            "sleep_duration_min":  "Sleep Duration (min)",
            "sleep_quality_score": "Sleep Quality",
            "deep_ratio":          "Deep Sleep Ratio",
            "computed_stress":     "Stress Score",
            "recovery_score":      "Recovery Score",
            "health_score":        "Health Score",
            "hrv_ms":              "HRV",
            "resting_hr":          "Resting HR",
            "anomaly_score":       "Anomaly Score",
        }
        for key, label in metric_map.items():
            val = data.get(key)
            if val is not None and not (isinstance(val, float) and np.isnan(val)):
                if key == "deep_ratio":
                    lines.append(f"  {label}: {val*100:.1f}%")
                elif isinstance(val, float):
                    lines.append(f"  {label}: {val:.1f}")
                else:
                    lines.append(f"  {label}: {val}")

        lines.append("")
        lines.append("RULE-BASED RECOMMENDATIONS (enhance these):")
        for i, rec in enumerate(rule_recs[:6], 1):
            lines.append(
                f"  {i}. [{rec['priority']}] {rec['category']}: {rec['details'][:150]}"
            )

        if rag_context:
            lines.append("")
            lines.append("SIMILAR PAST PATTERNS FROM USER HISTORY:")
            for ctx in rag_context[:2]:
                lines.append(f"  - {ctx.get('summary', 'N/A')} "
                             f"(similarity: {ctx.get('similarity_score', 0):.2f})")

        lines.append("")
        lines.append(
            "Generate enhanced personalized recommendations for this specific user. "
            "Make them highly specific with exact numbers (km, hours, bpm targets, etc.)."
        )
        return "\n".join(lines)

    def recommend(self, data: Dict,
                  rag_context: Optional[List[Dict]] = None,
                  alerts: Optional[List[Dict]] = None,
                  use_deep_model: bool = True) -> Dict:
        """
        Main recommendation entry point.

        Args:
            data:           Current health metrics dict.
            rag_context:    Similar past states from RAG memory.
            alerts:         Safety alerts from RuleEngine.
            use_deep_model: Use gemma3:12b for richer output.

        Returns:
            {
              profile, rule_recommendations, llm_narrative,
              model_used, latency_ms, priority_summary
            }
        """
        t0 = time.time()
        alerts = alerts or []

        # Step 1: classify user
        profile = classify_fitness_profile(data)

        # Step 2: rule-based recommendations
        rule_recs = build_rule_recommendations(data, profile, alerts)

        # Step 3: LLM enrichment
        model = self.model_deep if use_deep_model else self.model_fast
        prompt = self._build_llm_prompt(data, profile, rule_recs, rag_context)
        llm_text = self._call_llm(prompt, model)

        if llm_text:
            model_used = f"ollama:{model}"
            narrative = llm_text
        else:
            model_used = "fallback:rules"
            narrative = self._format_rule_narrative(rule_recs, profile, data)

        latency_ms = (time.time() - t0) * 1000

        # Step 4: priority summary
        high = [r for r in rule_recs if r["priority"] in ("HIGH", "CRITICAL")]
        priority_summary = {
            "critical_count": sum(1 for r in rule_recs if r["priority"] == "CRITICAL"),
            "high_count":     len(high),
            "top_actions":    [r["category"] for r in high[:3]],
        }

        return {
            "profile":              profile,
            "rule_recommendations": rule_recs,
            "llm_narrative":        narrative,
            "model_used":           model_used,
            "latency_ms":           round(latency_ms, 1),
            "priority_summary":     priority_summary,
        }

    def _format_rule_narrative(self, recs: List[Dict], profile: str, data: Dict) -> str:
        """Format rule recommendations into readable text when LLM unavailable."""
        health = data.get("health_score", 50) or 50
        recovery = data.get("recovery_score", 50) or 50
        lines = [
            f"=== Personalized Health Plan ({profile.title()} Profile) ===",
            f"Overall Health Score: {health:.0f}/100 | Recovery: {recovery:.0f}/100",
            "",
        ]
        priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        sorted_recs = sorted(recs, key=lambda r: priority_order.index(r.get("priority", "LOW")))
        for i, rec in enumerate(sorted_recs, 1):
            lines.append(f"{i}. [{rec['priority']}] {rec['category']}")
            lines.append(f"   Target : {rec['target']}")
            lines.append(f"   Details: {rec['details']}")
            lines.append("")
        return "\n".join(lines)
