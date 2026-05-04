import logging
from typing import Dict, List, Optional
from ..config import PipelineConfig
from ..llm_reasoning import HealthLLMReasoner

class BaseHealthAgent:
    """Base class for all specialized health agents."""
    
    def __init__(self, name: str, config: PipelineConfig, reasoner: HealthLLMReasoner):
        self.name = name
        self.config = config
        self.reasoner = reasoner
        self.logger = logging.getLogger(f"agent.{name}")

    def run(self, input_data: Dict, context: Dict) -> Dict:
        """Execute agent logic."""
        raise NotImplementedError("Subclasses must implement run()")

    def _call_llm(self, prompt: str, system: Optional[str] = None) -> str:
        """Call the underlying reasoner's LLM."""
        return self.reasoner._call_ollama(prompt, system=system) or ""
