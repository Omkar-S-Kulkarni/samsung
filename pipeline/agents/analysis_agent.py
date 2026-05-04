from .base_agent import BaseHealthAgent
from typing import Dict
import json

class AnalysisAgent(BaseHealthAgent):
    def __init__(self, config, reasoner):
        super().__init__("Analysis", config, reasoner)

    def run(self, health_data: Dict, context: Dict) -> Dict:
        self.logger.info("Analyzing health data patterns")
        
        system_prompt = (
            "You are a Health Data Analysis Agent. Your role is to interpret raw numeric sensor data. "
            "Identify trends, correlations, and anomalies. Do NOT give advice. Just report the facts and findings."
        )
        
        prompt = f"""
        Analyze the following health metrics:
        {json.dumps(health_data, indent=2)}
        
        Identify:
        1. Primary trends (improving/declining)
        2. Cross-signal correlations
        3. Statistical significance of any deviations
        """
        
        analysis = self._call_llm(prompt, system=system_prompt)
        return {"analysis": analysis}
