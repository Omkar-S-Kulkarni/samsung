import os
import sys
import time
import numpy as np
from datetime import datetime

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.config import PipelineConfig
from pipeline.rag_system import HealthMemory

def test_memory_phase():
    print("=" * 60)
    print("Testing Phase D: Memory (Hierarchical RAG)")
    print("=" * 60)
    
    config = PipelineConfig()
    config.memory.short_term_limit = 3
    memory = HealthMemory(config)
    user_id = "memory_user"
    
    # 1. Test Importance Scoring
    print("\n[1] Testing Importance Scoring...")
    state_critical = {"anomaly_score": 2.5, "alerts": "CRITICAL: High HR"}
    state_normal = {"anomaly_score": 0.0, "alerts": ""}
    
    imp_high = memory._calculate_importance(state_critical)
    imp_low = memory._calculate_importance(state_normal)
    
    print(f"Critical state importance: {imp_high:.2f}")
    print(f"Normal state importance: {imp_low:.2f}")
    assert imp_high > imp_low
    
    # 2. Test Hierarchical Tiers & Eviction
    print("\n[2] Testing Hierarchical Tiers...")
    # Store 5 short-term memories (limit is 3)
    # One is very important
    memory.store({}, "Normal event 1", user_id, importance=0.1)
    memory.store({}, "Important event", user_id, importance=0.9) # Should move to LTM
    memory.store({}, "Normal event 2", user_id, importance=0.1)
    memory.store({}, "Normal event 3", user_id, importance=0.1)
    memory.store({}, "Normal event 4", user_id, importance=0.1)
    
    tiers = [e["tier"] for e in memory.entries]
    print(f"Memory Tiers: {tiers}")
    print(f"Total entries: {len(memory.entries)}")
    
    # "Important event" should be in LTM, and only 3 latest normals should remain
    ltm_entries = [e for e in memory.entries if e["tier"] == "long-term"]
    print(f"LTM entries: {[e['summary'] for e in ltm_entries]}")
    
    # 3. Test Hybrid Retrieval
    print("\n[3] Testing Hybrid Retrieval...")
    # Add a recent but slightly less similar memory
    # and an old very similar memory
    memory.store({}, "Heart rate is slightly high", user_id, importance=0.5, tier="short-term")
    
    results = memory.retrieve("heart rate", user_id=user_id, top_k=2)
    print("Top 2 Hybrid Results:")
    for r in results:
        print(f" - {r['summary']} (Hybrid Score: {r['hybrid_score']:.2f}, Tier: {r['tier']})")
        
    # 4. Test Decay
    print("\n[4] Testing Memory Decay...")
    initial_imp = memory.entries[0]["importance_score"]
    memory.apply_decay()
    decayed_imp = memory.entries[0]["importance_score"]
    print(f"Importance: {initial_imp:.4f} -> {decayed_imp:.4f}")
    assert decayed_imp < initial_imp
    
    # 5. Test Summarization
    print("\n[5] Testing Summarization...")
    # Manually make 5 entries old LTM
    for i in range(5):
        memory.entries.append({
            "user_id": user_id,
            "timestamp": time.time() - (5 * 86400), # 5 days ago
            "summary": f"Old log {i}",
            "tier": "long-term",
            "importance_score": 0.5
        })
    
    count_before = len(memory.entries)
    memory.summarize_memories(user_id)
    count_after = len(memory.entries)
    print(f"Entries: {count_before} -> {count_after}")
    
    event_memories = [e for e in memory.entries if e["tier"] == "event"]
    if event_memories:
        print(f"New Event Memory: {event_memories[0]['summary']}")
    
    print("\n[6] Verification complete.")

if __name__ == "__main__":
    test_memory_phase()
