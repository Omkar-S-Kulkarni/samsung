from .base_agent import BaseHealthAgent
from typing import Dict, List
import json

class MemoryAgent(BaseHealthAgent):
    def __init__(self, config, reasoner):
        super().__init__("Memory", config, reasoner)

    def run(self, input_data: Dict, past_patterns: List[Dict]) -> Dict:
        self.logger.info("Prioritizing memory and past patterns")
        
        system_prompt = (
            "You are a Memory Agent. Your role is to connect current observations with past history. "
            "Identify recurring patterns and long-term trends from the user's history."
        )
        
        prompt = f"""
        Current state summary: {input_data.get('summary', 'N/A')}
        Past patterns retrieved from memory:
        {json.dumps(past_patterns, indent=2)}
        
        Compare the current state with past patterns. 
        Has this happened before? What was the outcome then?
        """
        
        memory_insight = self._call_llm(prompt, system=system_prompt)
        return {"memory_insight": memory_insight}
