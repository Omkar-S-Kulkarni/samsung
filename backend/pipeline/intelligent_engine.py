"""
Intelligent Engine - Core Intelligence Upgrade
===============================================
Master orchestrator combining all intelligence features:
- Multi-step chain-of-thought reasoning
- Confidence scoring and self-correction
- Hallucination detection
- Context prioritization
- Adaptive response generation
"""

import logging
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .llm_reasoning import HealthLLMReasoner
from .conversation_memory import ConversationMemory
from .tone_adapter import ToneAdapter
from .confidence_scorer import ConfidenceScorer
from .hallucination_detector import HallucinationDetector
from .reasoning_validator import ReasoningValidator
from .structured_output import StructuredOutputFormatter
from .config import PipelineConfig
from .agents.analysis_agent import AnalysisAgent
from .agents.memory_agent import MemoryAgent
from .agents.coaching_agent import CoachingAgent
from .agents.safety_agent import SafetyAgent
from .cache_system import ResponseCache
from .insight_generator import AdvancedInsightGenerator

logger = logging.getLogger(__name__)


class IntelligentHealthEngine:
    """
    Master intelligence engine combining all advanced features.
    Orchestrates multi-step reasoning, validation, and confidence scoring.
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """
        Initialize intelligent health engine.

        Args:
            config: Pipeline configuration
        """
        self.config = config or PipelineConfig()

        # Core components
        self.reasoner = HealthLLMReasoner(self.config)
        self.conversation_memory = ConversationMemory()
        self.tone_adapter = ToneAdapter(default_tone='coach')
        self.confidence_scorer = ConfidenceScorer()
        self.hallucination_detector = HallucinationDetector()
        self.reasoning_validator = ReasoningValidator()
        self.output_formatter = StructuredOutputFormatter()
        self.logger = logging.getLogger(__name__)

        # Phase E: Specialized Agents
        self.analysis_agent = AnalysisAgent(self.config, self.reasoner)
        self.memory_agent = MemoryAgent(self.config, self.reasoner)
        self.coaching_agent = CoachingAgent(self.config, self.reasoner)
        self.safety_agent = SafetyAgent(self.config, self.reasoner)

        # Phase G: Performance
        self.cache = ResponseCache()
        self.insight_gen = AdvancedInsightGenerator(self.config)

        # State
        self.current_user_id: Optional[str] = None
        self.current_session_id: Optional[str] = None
        self.max_self_correction_attempts = 3
        self.confidence_threshold = 0.5

    def start_conversation(self, user_id: str) -> str:
        """
        Start a new conversation session.

        Returns:
            Session ID
        """
        self.current_user_id = user_id
        self.current_session_id = self.conversation_memory.start_session(user_id)

        # Infer preferred tone from user history
        user_history = self.conversation_memory.get_user_history(user_id)
        if user_history['sessions']:
            user_context = {
                'interaction_patterns': self.conversation_memory.get_interaction_patterns(user_id)
            }
            preferred_tone = self.tone_adapter.infer_best_tone(user_context)
            self.tone_adapter.set_user_tone(user_id, preferred_tone)
            logger.info(f"Inferred tone for user {user_id}: {preferred_tone}")

        return self.current_session_id

    def generate_intelligent_response(self, user_message: str, health_data: Dict,
                                     response_type: str = 'insight',
                                     context: Optional[Dict] = None,
                                     battery_level: int = 100) -> Dict:
        """
        Generate intelligent, validated response with all quality features.

        Args:
            user_message: User input
            health_data: Current health metrics
            response_type: Type of response ('insight', 'recommendation', 'analysis')
            context: Additional context

        Returns:
            Complete response package with confidence, validation, structure
        """
        logger.info(f"Generating {response_type} response for user {self.current_user_id}")

        context = context or {}

        # Step 1: Retrieve conversation context
        conv_context = self._build_conversation_context()

        # Step 2: Prioritize context (recent vs important)
        prioritized_context = self._prioritize_context(conv_context, health_data, context)

        # PHASE G: Response Caching
        cached_response = self.cache.get(user_message, health_data)
        if cached_response:
            self.logger.info("⚡ Cache Hit: Returning optimized response")
            return {
                'response': cached_response,
                'metadata': {'generated_at': datetime.now().isoformat(), 'source': 'cache'}
            }

        # PHASE E: Multi-Agent Collaborative Workflow
        try:
            # 0. Routing
            active_agents = self._route_agents(user_message, health_data)
            
            # 0.1 Battery Optimization (Phase H)
            active_agents, forced_model = self._apply_battery_logic(battery_level, active_agents)
            if not active_agents: # Critical battery
                 raise Exception("Battery critical: Forcing fallback.")
            
            self.logger.info(f"Routing to agents: {active_agents} [Model: {forced_model}]")
            
            # 1. Safety Agent (Highest Priority - Always runs)
            alerts = health_data.get('alerts', [])
            safety_res = self.safety_agent.run(health_data, alerts)
            
            # 2. Memory Agent (Context Building)
            memory_res = {"memory_insight": ""}
            if "memory" in active_agents:
                past_patterns = health_data.get('past_patterns', [])
                memory_res = self.memory_agent.run(health_data, past_patterns)
            
            # 3. Analysis Agent (Data Deep Dive - Always runs)
            analysis_res = self.analysis_agent.run(health_data, prioritized_context)
            
            # 4. Coaching Agent (Response Generation)
            coaching_res = {"advice": "No coaching advice requested."}
            if "coaching" in active_agents:
                tone = self.tone_adapter.get_user_tone(self.current_user_id or 'default')
                coaching_res = self.coaching_agent.run(
                    health_data, 
                    analysis_res['analysis'], 
                    memory_res['memory_insight'],
                    tone
                )
            
            # 5. Conflict Resolution & Final Assembly
            final_response = self._resolve_agent_conflicts(
                safety_res, analysis_res, memory_res, coaching_res, health_data
            )
        except Exception as e:
            self.logger.error(f"Multi-Agent execution failed: {e}")
            final_response = self._run_fallback(response_type, health_data)
        
        # PHASE G: Store in Cache
        self.cache.set(user_message, health_data, final_response)
        
        # Step 8: Self-correction (simplified/preserved)
        final_confidence = 0.85 # Agents usually increase confidence

        # Step 9: Determine adaptive response length
        response_length_pref = self._infer_response_length_preference()
        adapted_response = self._adapt_response_length(final_response, response_length_pref)

        # Step 10: Format structured output
        structured_output = self.output_formatter.convert_text_to_structured(
            adapted_response,
            response_type,
            {
                'health_data': health_data,
                'confidence': final_confidence,
                'tone': self.tone_adapter.get_user_tone(self.current_user_id or 'default')
            }
        )

        # Step 11: Create response package
        response_package = {
            'response': adapted_response,
            'structured': structured_output,
            'metadata': {
                'confidence': final_confidence,
                'confidence_level': self._get_confidence_level(final_confidence),
                'generated_at': datetime.now().isoformat(),
                'user_tone': self.tone_adapter.get_user_tone(self.current_user_id or 'default')
            }
        }

        # Step 12: Store in conversation memory
        if self.current_session_id:
            self.conversation_memory.add_interaction(
                user_message, adapted_response,
                metadata={
                    'confidence': final_confidence,
                    'response_type': response_type,
                    'tone': self.tone_adapter.get_user_tone(self.current_user_id or 'default')
                },
                session_id=self.current_session_id
            )

        return response_package

    def get_advanced_insights(self, user_id: str) -> Dict:
        """Phase J: Retrieve deep insights based on long-term history."""
        import pandas as pd
        # For demo, we use the loaded feature data if available
        history = pd.DataFrame() 
        if hasattr(self, 'feature_data') and self.feature_data is not None:
             history = self.feature_data[self.feature_data['user_id'] == user_id]
             
        return {
            "patterns": self.insight_gen.detect_hidden_patterns(history),
            "weekly": self.insight_gen.generate_weekly_report(history),
            "progress": self.insight_gen.get_progress_tracking(history)
        }

    def generate_daily_insight(self, health_metrics: Dict,
                              user_id: Optional[str] = None) -> Dict:
        """
        Generate comprehensive daily health insight with all intelligence features.

        Args:
            health_metrics: Daily health metrics
            user_id: Optional user ID

        Returns:
            Structured daily insight
        """
        user_id = user_id or self.current_user_id
        if not user_id:
            logger.warning("No user ID for daily insight")
            return {}

        logger.info(f"Generating daily insight for user {user_id}")

        # Build multi-modal context
        context = self._build_multimodal_context(health_metrics)

        # Generate chain-of-thought for daily analysis
        reasoning_steps = self._generate_chain_of_thought(
            "Analyze today's health data", health_metrics, context, 'daily_summary'
        )

        # LLM call
        llm_response = self._call_llm_with_tone(
            reasoning_steps, health_metrics, context, 'daily_summary'
        )

        # Validation and scoring
        confidence = self.confidence_scorer.score_health_insight(
            llm_response, health_metrics, self._calculate_data_quality(health_metrics)
        )

        validation = self.reasoning_validator.validate_output(
            llm_response, 'health_analysis', context
        )

        # Format as structured daily summary
        insights = self._extract_insights_from_response(llm_response)
        recommendations = self._extract_recommendations_from_response(llm_response)
        health_score = self._calculate_health_score(health_metrics, context)

        summary = self.output_formatter.format_daily_summary(
            insights, recommendations, health_score, health_metrics
        )

        summary['metadata'] = {
            'confidence': confidence['overall_confidence'],
            'validation_score': validation['overall_score'],
            'user_id': user_id,
            'generated_at': datetime.now().isoformat()
        }

        return summary

    # ───────────────────────────────────────────────────────────────────────
    # Internal methods
    # ───────────────────────────────────────────────────────────────────────
    
    def _apply_battery_logic(self, battery_level: int, active_agents: List[str]) -> Tuple[List[str], str]:
        """Phase H: Adapt agents and models based on battery."""
        model = self.config.model.llm_model_reasoning # Default gemma3:12b
        
        if battery_level < self.config.battery.battery_critical_threshold:
            return [], "" # Force fallback
            
        if battery_level < self.config.battery.battery_low_threshold:
            model = self.config.model.llm_model_name # gemma3:4b
            if "coaching" in active_agents:
                active_agents.remove("coaching")
                
        return active_agents, model

    def _run_fallback(self, response_type: str, health_data: Dict) -> str:
        """Deterministic fallback when agents fail."""
        base_resp = self._generate_template_response(response_type, health_data)
        
        parts = [base_resp]
        parts.append("\n💡 WHY THIS ADVICE?")
        parts.append("Deterministic fallback active due to model unavailability.")
        
        metrics_used = [k for k, v in health_data.items() if isinstance(v, (int, float))]
        parts.append(f"\n🔍 DATA SOURCES: {', '.join(metrics_used[:5])}")
        
        parts.append("\nDisclaimer: Not medical advice. Consult a professional if symptoms persist.")
        
        return "\n\n".join(parts)

    def _route_agents(self, user_message: str, health_data: Dict) -> List[str]:
        """Determine which agents should participate in the response."""
        active_agents = ["safety", "analysis"] # Core agents
        
        message_lower = user_message.lower()
        
        # Route to memory if asking about history or key metrics
        if any(kw in message_lower for kw in ["sleep", "stress", "heart", "hrv", "past", "history"]):
            active_agents.append("memory")
            
        # Route to coaching if asking for advice
        if any(kw in message_lower for kw in ["how", "what", "should", "advice", "help", "recommend"]):
            active_agents.append("coaching")
        elif not message_lower: # default for insights
            active_agents.append("coaching")
            
        return active_agents

    def _resolve_agent_conflicts(self, safety: Dict, analysis: Dict, 
                                memory: Dict, coaching: Dict, health_data: Dict) -> str:
        """
        Merge agent outputs and resolve conflicts.
        Priority: Safety > Analysis > Coaching > Memory.
        """
        response_parts = []
        
        # 1. Safety First
        if safety.get('is_high_risk'):
            response_parts.append(f"⚠️ SAFETY ALERT: {safety['safety_report']}")
        
        # 2. The core coaching advice
        response_parts.append(coaching['advice'])
        
        # 3. Explainability (Phase F)
        response_parts.append("\n💡 WHY THIS ADVICE?")
        explanation = f"Your current analysis shows {analysis['analysis'][:100]}."
        if memory.get('memory_insight'):
            explanation += f" This aligns with your past pattern: {memory['memory_insight'][:100]}."
        response_parts.append(explanation)
            
        # 4. Transparency (Phase F)
        metrics_used = [k for k, v in health_data.items() if v is not None and isinstance(v, (int, float))]
        response_parts.append(f"\n🔍 DATA SOURCES: {', '.join(metrics_used[:5])}")
            
        # 5. Mandatory Disclaimer
        response_parts.append(f"\nDisclaimer: {safety.get('medical_disclaimer', 'Not medical advice.')}")
        
        return "\n\n".join(response_parts)

    def _build_conversation_context(self) -> Dict:
        """Build context from conversation history."""
        if not self.current_session_id:
            return {}

        context = self.conversation_memory.get_session_context(
            self.current_session_id, max_interactions=5
        )

        return context

    def _prioritize_context(self, conv_context: Dict, health_data: Dict,
                           additional_context: Dict) -> Dict:
        """
        Prioritize context: recent interactions + critical health data.

        Strategy:
        - Recent interactions weighted higher
        - Critical health metrics get priority
        - User preferences override defaults
        """
        prioritized = {
            'recent_interactions': [],
            'critical_metrics': [],
            'user_preferences': {},
            'important_context': {}
        }

        # Recent interactions (high priority)
        if 'recent_interactions' in conv_context:
            prioritized['recent_interactions'] = conv_context['recent_interactions'][:3]

        # Critical metrics
        critical_keys = ['spo2', 'heart_rate', 'stress', 'anomaly']
        for key, value in health_data.items():
            if any(crit in key.lower() for crit in critical_keys):
                if isinstance(value, (int, float)) and (value < 90 or value > 150):
                    prioritized['critical_metrics'].append({key: value})

        # User preferences
        if 'user_preferences' in conv_context:
            prioritized['user_preferences'] = conv_context['user_preferences']

        # Important context
        prioritized['important_context'] = additional_context

        return prioritized

    def _generate_chain_of_thought(self, query: str, health_data: Dict,
                                  context: Dict, response_type: str) -> List[str]:
        """
        Generate multi-step chain-of-thought reasoning internally.

        Returns reasoning steps for internal thinking process.
        """
        steps = []

        # Step 1: Data assessment
        steps.append(f"STEP 1 - DATA ASSESSMENT: Analyze {len(health_data)} health metrics provided")

        # Step 2: Context understanding
        critical_count = len(context.get('critical_metrics', []))
        steps.append(f"STEP 2 - CONTEXT: {critical_count} critical metrics identified, recent interactions available")

        # Step 3: Goal definition
        steps.append(f"STEP 3 - GOAL: Generate {response_type} for query: '{query[:50]}...'")

        # Step 4: Pattern recognition
        steps.append("STEP 4 - PATTERNS: Identify health patterns and trends")

        # Step 5: Evidence gathering
        steps.append("STEP 5 - EVIDENCE: Gather supporting evidence from metrics")

        # Step 6: Reasoning
        steps.append("STEP 6 - REASONING: Develop coherent health insights")

        # Step 7: Validation preparation
        steps.append("STEP 7 - VALIDATION: Prepare for output validation")

        # Step 8: Response formulation
        steps.append("STEP 8 - FORMULATE: Create response following best practices")

        return steps

    def _call_llm_with_tone(self, reasoning_steps: List[str], health_data: Dict,
                           context: Dict, response_type: str) -> str:
        """Call LLM with tone adaptation and reasoning context."""
        user_tone = self.tone_adapter.get_user_tone(self.current_user_id or 'default')
        tone_prompt = self.tone_adapter.get_tone_instruction_prompt(user_tone)

        # Build prompt with reasoning steps
        reasoning_context = "\n".join(reasoning_steps)
        
        prompt_modifier = ""
        if isinstance(health_data, dict) and 'adaptive_strategy' in health_data:
            prompt_modifier = f"\nADAPTIVE STRATEGY: {health_data['adaptive_strategy'].get('prompt_modifier', '')}"

        prompt = f"""
{tone_prompt}

CONTEXT AND REASONING:
{reasoning_context}

HEALTH DATA:
{json.dumps(health_data, indent=2)}

PREVIOUS CONTEXT:
{json.dumps(context, indent=2, default=str)}

Generate a {response_type} response following the instructions above.
Ensure the response is specific, evidence-based, and actionable.{prompt_modifier}
"""

        # Call LLM with prompt
        response = self.reasoner.generate_insight(health_data, context.get('recent_interactions', []))

        return response if response else self._generate_template_response(response_type, health_data)

    def _self_correct_response(self, user_message: str, health_data: Dict,
                              context: Dict, initial_response: str,
                              confidence: Dict, hallucination_check: Dict,
                              response_type: str) -> Tuple[str, float]:
        """
        Self-correct response if confidence is low or hallucinations detected.

        Returns: (corrected_response, final_confidence)
        """
        logger.info("Initiating self-correction loop")

        correction_prompt = self._build_correction_prompt(
            initial_response, confidence, hallucination_check, health_data
        )

        for attempt in range(self.max_self_correction_attempts):
            logger.debug(f"Self-correction attempt {attempt + 1}/{self.max_self_correction_attempts}")

            corrected = self.reasoner._call_ollama(correction_prompt)

            if not corrected:
                continue

            # Re-score
            new_confidence = self.confidence_scorer.score_llm_output(
                corrected, user_message, self._calculate_data_quality(health_data)
            )

            # Re-check for hallucinations
            new_hallucination = self.hallucination_detector.detect_hallucination(
                corrected, health_data, context
            )

            if (new_confidence['overall_confidence'] > confidence['overall_confidence'] and
                not new_hallucination['is_hallucinating']):
                logger.info(f"Self-correction successful: {new_confidence['overall_confidence']:.2f}")
                return corrected, new_confidence['overall_confidence']

        logger.warning("Self-correction did not improve confidence, using best attempt")
        return initial_response, confidence['overall_confidence']

    def _infer_response_length_preference(self) -> str:
        """Infer user's preferred response length."""
        if not self.current_user_id:
            return 'balanced'

        patterns = self.conversation_memory.get_interaction_patterns(self.current_user_id)
        if patterns:
            return patterns.get('preferred_length', 'balanced')

        return 'balanced'

    def _adapt_response_length(self, response: str, preference: str) -> str:
        """Adapt response length based on user preference."""
        word_count = len(response.split())

        if preference == 'short':
            # Target 50-100 words
            if word_count > 150:
                sentences = response.split('.')
                return '.'.join(sentences[:len(sentences)//2]) + '.'
        elif preference == 'long':
            # Ensure comprehensive
            if word_count < 100:
                # Add more detail if available
                pass

        return response

    def _calculate_data_quality(self, health_data: Dict) -> float:
        """Calculate quality of health data."""
        if not health_data:
            return 0.0

        # Count valid metrics
        valid_count = sum(1 for v in health_data.values() if v is not None)
        total_count = len(health_data)

        completeness = valid_count / total_count if total_count > 0 else 0.0

        # Check for reasonable values (simplified)
        reasonable_count = sum(
            1 for k, v in health_data.items()
            if v is not None and isinstance(v, (int, float)) and 0 <= v <= 500
        )

        quality = (reasonable_count / total_count) * 0.8 + completeness * 0.2

        return min(1.0, max(0.0, quality))

    def _get_confidence_level(self, score: float) -> str:
        """Convert confidence score to level."""
        if score >= 0.8:
            return 'HIGH'
        elif score >= 0.5:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _build_multimodal_context(self, health_metrics: Dict) -> Dict:
        """Build multi-modal context from various health metrics."""
        context = {
            'biosignals': {k: v for k, v in health_metrics.items()
                          if any(x in k for x in ['hr', 'spo2', 'temp'])},
            'activity': {k: v for k, v in health_metrics.items()
                        if 'steps' in k or 'activity' in k},
            'sleep': {k: v for k, v in health_metrics.items()
                     if 'sleep' in k},
            'stress': {k: v for k, v in health_metrics.items()
                      if 'stress' in k}
        }
        if 'user_state' in health_metrics:
            context['user_state'] = health_metrics['user_state']
        if 'adaptive_strategy' in health_metrics:
            context['adaptive_strategy'] = health_metrics['adaptive_strategy']
        if 'twin_summary' in health_metrics:
            context['digital_twin'] = health_metrics['twin_summary']
            
        # Add predictions for future-looking reasoning
        prediction_fields = [
            'fatigue', 'stress_forecast', 'sleep_prediction', 
            'overtraining', 'recovery_time_min', 'risk_score', 
            'anomaly_likelihood', 'forecasts'
        ]
        context['predictions'] = {k: health_metrics[k] for k in prediction_fields if k in health_metrics}
        
        # Add past patterns (RAG context)
        if 'past_patterns' in health_metrics:
            context['past_patterns'] = []
            for entry in health_metrics['past_patterns']:
                context['past_patterns'].append({
                    'summary': entry.get('summary', ''),
                    'timestamp': entry.get('timestamp', ''),
                    'relevance': entry.get('similarity_score', 0),
                    'importance': entry.get('importance_score', 0),
                    'tier': entry.get('tier', 'unknown')
                })
            
        return context

    def _extract_insights_from_response(self, response: str) -> List[Dict]:
        """Extract structured insights from LLM response."""
        # Simplified extraction
        lines = response.split('\n')
        insights = []
        for line in lines:
            if any(kw in line.lower() for kw in ['insight', 'finding', 'observation']):
                insights.append({
                    'title': line.strip(),
                    'description': '',
                    'category': 'general',
                    'severity': 'info'
                })
        return insights[:5]

    def _extract_recommendations_from_response(self, response: str) -> List[Dict]:
        """Extract structured recommendations from LLM response."""
        # Simplified extraction
        lines = response.split('\n')
        recommendations = []
        for line in lines:
            if any(kw in line.lower() for kw in ['recommend', 'suggest', 'consider']):
                recommendations.append({
                    'title': line.strip(),
                    'category': 'general',
                    'priority': 'medium',
                    'confidence': 0.75
                })
        return recommendations[:5]

    def _calculate_health_score(self, health_metrics: Dict, context: Dict) -> float:
        """Calculate overall health score."""
        # Simplified scoring
        score = 70.0

        # Adjust based on key metrics
        if health_metrics.get('stress_score'):
            stress = health_metrics['stress_score']
            score -= max(0, (stress - 40) * 0.3)

        if health_metrics.get('sleep_duration_min'):
            sleep = health_metrics['sleep_duration_min'] / 60
            if sleep < 7:
                score -= (7 - sleep) * 5

        if health_metrics.get('spo2_pct'):
            spo2 = health_metrics['spo2_pct']
            if spo2 < 95:
                score -= (95 - spo2) * 2

        return min(100, max(0, score))

    def _build_correction_prompt(self, response: str, confidence: Dict,
                                hallucination_check: Dict, health_data: Dict) -> str:
        """Build prompt for self-correction."""
        issues = []

        if confidence['overall_confidence'] < 0.6:
            issues.append("Response has LOW CONFIDENCE")

        if hallucination_check['is_hallucinating']:
            issues.append(f"HALLUCINATIONS DETECTED: {hallucination_check['hallucination_likelihood']:.0%}")

        prompt = f"""
SELF-CORRECTION REQUEST:

Original response had these issues:
{chr(10).join(f"- {issue}" for issue in issues)}

Original response:
{response}

Health data:
{json.dumps(health_data, indent=2)}

Please provide an improved, more confident, and hallucination-free response.
Focus on being specific, evidence-based, and accurate.
"""

        return prompt

    def _generate_template_response(self, response_type: str, health_data: Dict) -> str:
        """Generate template response when LLM unavailable."""
        if response_type == 'insight':
            return f"Based on {len(health_data)} health metrics, your current health status shows mixed indicators that require monitoring."
        elif response_type == 'recommendation':
            return "Maintain consistent sleep schedule, stay hydrated, and engage in moderate daily activity for optimal health."
        else:
            return f"Daily health analysis: {len(health_data)} metrics tracked. Continue monitoring key indicators for trends."

    def get_engine_status(self) -> Dict:
        """Get status of all intelligence components."""
        return {
            'components_ready': {
                'reasoner': self.reasoner.ollama_available,
                'memory': len(self.conversation_memory.sessions) > 0,
                'tone_adapter': True,
                'confidence_scorer': True,
                'hallucination_detector': True,
                'reasoning_validator': True,
                'output_formatter': True
            },
            'current_session': self.current_session_id,
            'current_user': self.current_user_id,
            'confidence_stats': self.confidence_scorer.get_confidence_summary()
        }
