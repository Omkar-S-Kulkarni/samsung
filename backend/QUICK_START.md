# 🎯 Quick Start Guide - Intelligence Upgrades

## What Was Done

All 10 intelligence features from PHASE A have been fully implemented and integrated into your Samsung Health Coach pipeline.

---

## 🚀 Quick Usage Examples

### Example 1: Start a Conversation with Full Intelligence

```python
from pipeline.health_coach import HealthCoach

# Initialize coach with intelligence upgrades
coach = HealthCoach()

# Start intelligent conversation
session = coach.start_intelligent_conversation('john_doe')
print(f"Session started: {session['session_id']}")
```

### Example 2: Generate Intelligent Insight

```python
# Current health metrics
health_data = {
    'heart_rate_bpm': 95,
    'hrv_ms': 45,
    'spo2_pct': 97,
    'sleep_duration_min': 420,  # 7 hours
    'stress_score': 65,
    'steps_per_min': 5,
    'activity_intensity': 2
}

# Generate intelligent response with all quality features
response = coach.respond_intelligently(
    user_message="How's my health today?",
    health_data=health_data,
    response_type='insight'
)

# Access results
print("Response:", response['response'])
print("Confidence:", response['metadata']['confidence'])
print("Tone:", response['metadata']['user_tone'])
print("Validated:", response['quality_metrics']['validation_report']['is_valid'])
```

### Example 3: Generate Daily Summary

```python
# Generate comprehensive daily insight
daily = coach.generate_intelligent_daily_insight(
    health_metrics=health_data,
    user_id='john_doe'
)

# Access structured data
print(f"Health Score: {daily['overall_health_score']}/100")
print(f"Insights: {len(daily['key_insights'])}")
print(f"Recommendations: {len(daily['recommendations'])}")

# Use in UI
for insight in daily['key_insights']:
    print(f"- {insight['title']}: {insight['description']}")
```

### Example 4: Check Quality Metrics

```python
# Every response includes detailed quality metrics
quality = response['quality_metrics']

print("=== QUALITY METRICS ===")
print(f"Confidence: {quality['confidence_score']['overall_confidence']:.2f}")
print(f"Hallucinating: {quality['hallucination_check']['is_hallucinating']}")
print(f"Validation Score: {quality['validation_report']['overall_score']:.2f}")
print(f"Issues Found: {len(quality['validation_report']['issues'])}")
```

### Example 5: Access Conversation Memory

```python
from pipeline.conversation_memory import ConversationMemory

memory = ConversationMemory()
session_id = memory.start_session('john_doe')

# Record interaction
memory.add_interaction(
    "How's my sleep?",
    "Your sleep shows good quality...",
    metadata={'confidence': 0.88}
)

# Later: retrieve context
context = memory.get_session_context(session_id, max_interactions=5)
print(f"Recent interactions: {len(context['recent_interactions'])}")

# Get user patterns
patterns = memory.get_interaction_patterns('john_doe')
print(f"Preferred tone: {patterns['preferred_tone']}")
print(f"Preferred length: {patterns['preferred_length']}")
```

### Example 6: Set User Tone Preference

```python
from pipeline.tone_adapter import ToneAdapter

adapter = ToneAdapter()

# Available tones: 'strict', 'friendly', 'coach'
adapter.set_user_tone('john_doe', 'friendly')

# Get tone info
tone_info = adapter.get_tone_info('friendly')
print(f"Tone: {tone_info['description']}")
print(f"Keywords: {', '.join(tone_info['keywords'])}")
```

---

## 📊 Feature Matrix

| Feature | Enabled | Config Key | Impact |
|---------|---------|-----------|--------|
| Conversation Memory | ✅ | `enable_conversation_memory` | Tracks user history |
| Tone Adaptation | ✅ | `enable_tone_adaptation` | Personalizes communication |
| Confidence Scoring | ✅ | `enable_confidence_scoring` | Quality assurance |
| Hallucination Detection | ✅ | `enable_hallucination_detection` | Safety verification |
| Self-Correction | ✅ | `enable_self_correction` | Improves low confidence outputs |
| Reasoning Validation | ✅ | `enable_reasoning_validation` | Post-check outputs |
| Structured Output | ✅ | `enable_structured_output` | UI-ready JSON |
| Chain-of-Thought | ✅ | `enable_chain_of_thought` | Better reasoning |
| Context Prioritization | ✅ | `enable_context_prioritization` | Relevant inputs |
| Adaptive Length | ✅ | `enable_adaptive_length` | Personalized verbosity |

---

## 🎛️ Configuration

### Enable/Disable Features

```python
from pipeline.config import PipelineConfig

config = PipelineConfig()

# Disable specific features if needed
config.intelligence.enable_tone_adaptation = False
config.intelligence.enable_confidence_scoring = True
config.intelligence.max_correction_attempts = 5

coach = HealthCoach(config)
```

---

## 📈 Quality Metrics Explained

Every response includes detailed quality metrics:

```python
response['metadata'] = {
    'confidence': 0.87,                    # 0-1 score
    'confidence_level': 'HIGH',            # HIGH, MEDIUM, LOW
    'validation_score': 0.92,              # 0-1 score
    'hallucination_likelihood': 0.03,      # 0-1 score
    'is_hallucinating': False,             # Boolean
    'reasoning_steps': 8,                  # Number of steps
    'self_corrected': False,               # Was corrected?
    'user_tone': 'coach'                   # Applied tone
}
```

### Interpreting Scores:
- **Confidence >= 0.8**: HIGH confidence, use directly
- **Confidence 0.5-0.8**: MEDIUM, acceptable with review
- **Confidence < 0.5**: LOW, likely triggered self-correction

---

## 🔍 Checking Engine Status

```python
report = coach.get_intelligent_engine_report()

print("=== ENGINE STATUS ===")
for component, ready in report['status']['components_ready'].items():
    status = "✅" if ready else "❌"
    print(f"{status} {component}")

print("\n=== QUALITY ASSURANCE ===")
for feature, enabled in report['quality_assurance'].items():
    status = "✅" if enabled else "❌"
    print(f"{status} {feature}")
```

---

## 📝 Sample Response Structure

```json
{
  "response": "Your health shows positive trends...",
  "structured": {
    "title": "Health Status Update",
    "description": "...",
    "category": "general",
    "severity": "info",
    "metrics": {...},
    "trend": "improving"
  },
  "metadata": {
    "confidence": 0.87,
    "confidence_level": "HIGH",
    "validation_score": 0.92,
    "hallucination_likelihood": 0.03,
    "is_hallucinating": false,
    "reasoning_steps": 8,
    "self_corrected": false,
    "user_tone": "coach"
  },
  "quality_metrics": {
    "confidence_score": {
      "overall_confidence": 0.87,
      "component_scores": {...}
    },
    "hallucination_check": {
      "is_hallucinating": false,
      "hallucination_likelihood": 0.03,
      "indicators": {...}
    },
    "validation_report": {
      "is_valid": true,
      "validation_scores": {...},
      "issues": [],
      "warnings": []
    }
  }
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Real-time Chat Response
```python
response = coach.respond_intelligently(
    "Tell me about my stress levels",
    current_health_data,
    response_type='insight'
)
print(response['response'])
```

### Use Case 2: Recommendation Generation
```python
response = coach.respond_intelligently(
    "What should I do to improve my sleep?",
    current_health_data,
    response_type='recommendation'
)
```

### Use Case 3: Health Analysis
```python
response = coach.respond_intelligently(
    "Analyze my health patterns",
    current_health_data,
    response_type='analysis'
)
```

### Use Case 4: Daily Dashboard
```python
daily = coach.generate_intelligent_daily_insight(
    health_metrics=daily_stats
)

# Render in UI
render_health_card(daily['overall_health_score'])
render_insights(daily['key_insights'])
render_recommendations(daily['recommendations'])
render_alerts(daily['alerts'])
```

---

## ⚠️ Important Notes

### 1. LLM Requirement
- Most features work with Ollama running locally
- Falls back to template responses if LLM unavailable
- Conversation memory always works

### 2. Data Quality
- Better input data → better confidence scores
- Incomplete metrics → lower confidence
- Valid metrics within normal ranges → higher validation scores

### 3. Tone Adaptation
- Inferred from user history if not set
- Can override per-request or per-session
- Affects response style but not medical content

### 4. Self-Correction
- Only triggers if confidence < threshold
- Has max attempts limit (default: 3)
- May take slightly longer

### 5. Validation
- Only blocks outputs with critical errors
- Warnings are recorded but don't block output
- Always review high-risk recommendations

---

## 🔄 Processing Flow

```
User Input
    ↓
[Conversation Memory] ← Retrieve history
    ↓
[Tone Adapter] ← Get user's preferred tone
    ↓
[Chain-of-Thought] ← 8-step reasoning
    ↓
[LLM Generation] ← Generate response
    ↓
[Confidence Scorer] ← Score quality
    ↓
[Hallucination Detector] ← Check reliability
    ↓
[Validation] ← Post-check output
    ↓
[Self-Correction] ← If confidence < threshold
    ↓
[Adaptive Length] ← Adjust verbosity
    ↓
[Structured Output] ← Format for UI
    ↓
User Response + Quality Metrics
```

---

## 📚 File Reference

### Core Intelligence Files:
- `conversation_memory.py` - Conversation history & patterns
- `tone_adapter.py` - Tone selection & adaptation
- `confidence_scorer.py` - Confidence scoring
- `hallucination_detector.py` - Hallucination detection
- `reasoning_validator.py` - Output validation
- `structured_output.py` - JSON formatting
- `intelligent_engine.py` - Master orchestrator

### Integration Points:
- `health_coach.py` - Main API (3 new methods)
- `config.py` - IntelligenceConfig settings

---

## 🎓 Next Steps

1. ✅ Initialize coach: `coach = HealthCoach()`
2. ✅ Start conversation: `coach.start_intelligent_conversation('user_id')`
3. ✅ Generate responses: `coach.respond_intelligently(...)`
4. ✅ Check quality: Review metadata and quality_metrics
5. ✅ Use structured output: Pass to UI renderer

---

## 💬 Support

For issues or questions:
1. Check `INTELLIGENCE_UPGRADE.md` for detailed documentation
2. Review configuration in `config.py` - `IntelligenceConfig`
3. Check engine status: `coach.get_intelligent_engine_report()`
4. Enable verbose logging for debugging

---

**All 10 intelligence features are fully implemented and ready to use! 🚀**
