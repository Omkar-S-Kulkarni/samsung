import os
import sys
import json
from typing import Dict

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.intelligent_engine import IntelligentHealthEngine
from pipeline.config import PipelineConfig

def test_multi_agent_system():
    print("=" * 60)
    print("Testing Phase E: Multi-Agent System (LangGraph Level)")
    print("=" * 60)
    
    config = PipelineConfig()
    engine = IntelligentHealthEngine(config)
    user_id = "agent_user"
    engine.start_conversation(user_id)
    
    # 1. Test Routing Logic
    print("\n[1] Testing Agent Routing...")
    health_data = {"heart_rate": 75, "hrv": 45}
    
    # Query that should trigger all agents
    agents_all = engine._route_agents("What should I do about my high heart rate?", health_data)
    print(f"Query: 'What should I do about my high heart rate?' -> Agents: {agents_all}")
    assert "safety" in agents_all
    assert "analysis" in agents_all
    assert "memory" in agents_all
    assert "coaching" in agents_all
    
    # Query that should trigger fewer agents
    agents_few = engine._route_agents("Just analyzing the data.", health_data)
    print(f"Query: 'Just analyzing the data.' -> Agents: {agents_few}")
    assert "coaching" not in agents_few
    
    # 2. Test Multi-Agent Execution Flow
    print("\n[2] Testing Multi-Agent Execution Flow (Mocked Results)...")
    # We will simulate the flow by calling the engine's response generator
    # Since Ollama might be slow, we'll focus on checking if the structure is correct
    
    sample_data = {
        "heart_rate": 110,
        "hrv": 20,
        "alerts": [{"severity": "CRITICAL", "message": "Heart rate too high while sedentary"}]
    }
    
    # Mocking agent runs if needed, but let's try a real run first (it will use Ollama if available)
    try:
        response = engine.generate_intelligent_response(
            "I feel stressed and my heart is racing. Help me.", 
            sample_data
        )
        print("\nMulti-Agent Response Package:")
        print(f"Response: {response['response'][:200]}...")
        
        # Check if safety alert is present in the response
        if "⚠️ SAFETY ALERT" in response['response']:
            print("SUCCESS: Safety Agent override detected.")
        else:
            print("NOTE: Safety Agent did not flag high risk in text (expected if Ollama mocked/failed).")
            
    except Exception as e:
        print(f"Execution failed: {e}")
        # Test fallback
        fallback = engine._run_fallback("insight", sample_data)
        print(f"Fallback Response: {fallback}")
        assert "mixed indicators" in fallback or "Daily health analysis" in fallback

    # 3. Test Conflict Resolution
    print("\n[3] Testing Conflict Resolution...")
    safety_res = {"is_high_risk": True, "safety_report": "Immediate rest required."}
    analysis_res = {"analysis": "HR is 110 bpm."}
    memory_res = {"memory_insight": "User had similar spike last week."}
    coaching_res = {"advice": "Try to do some light yoga."}
    
    resolved = engine._resolve_agent_conflicts(safety_res, analysis_res, memory_res, coaching_res)
    print("Resolved Response (Safety overrides Coaching yoga advice):")
    print(resolved)
    
    assert "⚠️ SAFETY ALERT" in resolved
    assert "Immediate rest required" in resolved
    
    print("\n[4] Verification complete.")

if __name__ == "__main__":
    test_multi_agent_system()
