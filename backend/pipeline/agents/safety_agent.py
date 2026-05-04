from .base_agent import BaseHealthAgent
from typing import Dict, List
import json

class SafetyAgent(BaseHealthAgent):
    def __init__(self, config, reasoner):
        super().__init__("Safety", config, reasoner)

    def run(self, health_data: Dict, alerts: List[Dict]) -> Dict:
        self.logger.info("Performing high-fidelity safety check")
        
        system_prompt = (
            "You are a Health Safety Agent. Your ONLY job is to identify risks and provide medical disclaimers. "
            "Rules:\n"
            "1. If HR > 150 and sedentary, recommend immediate rest.\n"
            "2. If SpO2 < 90, recommend clinical consultation.\n"
            "3. If any critical anomaly, add a firm medical disclaimer.\n"
            "4. NEVER suggest medication. Filter out any such advice."
        )
        
        prompt = f"""
        Current metrics: {json.dumps(health_data, indent=2)}
        Active alerts: {json.dumps(alerts, indent=2)}
        
        Analyze for:
        - Exercise contraindications
        - Extreme physiological deviations
        - Risk of injury or clinical event
        """
        
        safety_report = self._call_llm(prompt, system=system_prompt)
        
        # Safe-response filtering (Heuristic)
        dangerous_keywords = ["take", "pill", "medicine", "drug", "dose", "diagnose"]
        for kw in dangerous_keywords:
            if kw in safety_report.lower():
                safety_report = safety_report.replace(kw, "[REDACTED]")

        is_high_risk = any(a.get('severity') == 'CRITICAL' for a in alerts) or \
                      health_data.get('heart_rate_bpm', 0) > 160 or \
                      "urgent" in safety_report.lower()
        
        return {
            "safety_report": safety_report,
            "is_high_risk": is_high_risk,
            "medical_disclaimer": "This is an AI-generated wellness insight. It is not medical advice. If you feel unwell, stop activity and consult a doctor immediately."
        }
