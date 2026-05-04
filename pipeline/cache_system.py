import hashlib
import json
from typing import Dict, Optional

class ResponseCache:
    """Lightweight caching for LLM responses to optimize performance."""
    
    def __init__(self, max_size: int = 100):
        self.cache: Dict[str, str] = {}
        self.max_size = max_size

    def get(self, query: str, health_state: Dict) -> Optional[str]:
        """Retrieve cached response if it exists."""
        cache_key = self._generate_key(query, health_state)
        return self.cache.get(cache_key)

    def set(self, query: str, health_state: Dict, response: str):
        """Store response in cache."""
        if len(self.cache) >= self.max_size:
            # Simple FIFO eviction
            try:
                first_key = next(iter(self.cache))
                del self.cache[first_key]
            except StopIteration:
                pass
            
        cache_key = self._generate_key(query, health_state)
        self.cache[cache_key] = response

    def _generate_key(self, query: str, health_state: Dict) -> str:
        """Generate a stable hash for query + health state."""
        # Round numeric values to reduce cache misses on slight sensor variations
        rounded_state = {}
        # Only cache based on high-level features to increase hit rate
        features = ["heart_rate_bpm", "hrv_ms", "spo2_pct", "computed_stress", "activity_intensity"]
        
        for k in features:
            if k in health_state:
                v = health_state[k]
                if isinstance(v, (int, float)):
                    # Use buckets of 5 for HR/Stress, 10 for HRV
                    if k == "heart_rate_bpm" or k == "computed_stress":
                        rounded_state[k] = int(v // 5) * 5
                    elif k == "hrv_ms":
                        rounded_state[k] = int(v // 10) * 10
                    else:
                        rounded_state[k] = v
                else:
                    rounded_state[k] = v
                
        state_str = json.dumps(rounded_state, sort_keys=True)
        combined = f"{query.lower().strip()}:{state_str}"
        return hashlib.md5(combined.encode()).hexdigest()
