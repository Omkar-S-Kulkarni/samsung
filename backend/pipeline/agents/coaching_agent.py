from .base_agent import BaseHealthAgent
from typing import Dict
import json

class CoachingAgent(BaseHealthAgent):
    def __init__(self, config, reasoner):
        super().__init__("Coaching", config, reasoner)

    def run(self, input_data: Dict, analysis: str, memory_insight: str, tone: str) -> Dict:
        self.logger.info(f"Generating coaching advice with tone: {tone}")
        
        system_prompt = (
            f"You are a Wellness Coach Agent. Your tone is {tone}. "
            "Use the provided analysis and memory history to give 2-3 actionable, motivational recommendations. "
            "Keep it concise and conversational."
        )
        
        prompt = f"""
        Analysis: {analysis}
        Memory Context: {memory_insight}
        
        Provide coaching advice based on these findings.
        """
        
        advice = self._call_llm(prompt, system=system_prompt)
        return {"advice": advice}
