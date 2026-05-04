"""
User-Specific Tone Adaptation System
=====================================
Adapts communication style based on user preferences and context.
Supports three main tones: strict (clinical), friendly (casual), coach-like (motivational).
"""

import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


# Tone-specific prompts and style guides
TONE_TEMPLATES = {
    'strict': {
        'description': 'Clinical, data-driven, precise, professional',
        'system_prompt': """You are a clinical health advisor running on Samsung health devices.
        Communicate with precision and clinical accuracy.
        Use medical/scientific terminology where appropriate.
        Provide evidence-based recommendations only.
        Structure responses with clear metrics and data.
        Avoid casual language or excessive warmth.
        Format: Present facts → Provide clinical interpretation → Suggest evidence-based actions.""",
        'response_structure': ['METRICS', 'CLINICAL_ASSESSMENT', 'RECOMMENDATIONS', 'EVIDENCE'],
        'tone_words': ['indicate', 'demonstrate', 'assess', 'recommend', 'clinical'],
        'exclamation_usage': 0,  # No exclamations
        'emoji_usage': False,
        'formality': 'formal'
    },

    'friendly': {
        'description': 'Casual, conversational, approachable, encouraging',
        'system_prompt': """You are a friendly health coach on Samsung devices.
        Communicate in a warm, casual tone.
        Use everyday language and conversational phrases.
        Share encouragement and celebrate wins.
        Be understanding about struggles.
        Make health feel accessible and fun.
        Format: Greeting → Positive observation → Supportive advice → Encouragement.""",
        'response_structure': ['GREETING', 'POSITIVE_OBSERVATION', 'ADVICE', 'ENCOURAGEMENT'],
        'tone_words': ['great', 'awesome', 'nice', 'cool', 'keep it up'],
        'exclamation_usage': 2,  # Moderate exclamations
        'emoji_usage': True,
        'formality': 'casual'
    },

    'coach': {
        'description': 'Motivational, goal-focused, action-oriented, inspiring',
        'system_prompt': """You are a motivational health coach on Samsung devices.
        Inspire action and goal achievement.
        Use motivational language and positive framing.
        Focus on progress and improvement over perfection.
        Challenge users to reach their potential.
        Frame setbacks as learning opportunities.
        Format: Acknowledge effort → Identify opportunity → Challenge and support → Action plan.""",
        'response_structure': ['ACKNOWLEDGE', 'OPPORTUNITY', 'CHALLENGE', 'ACTION_PLAN'],
        'tone_words': ['achieve', 'improve', 'progress', 'potential', 'challenge', 'goal'],
        'exclamation_usage': 1,  # Moderate-high exclamations
        'emoji_usage': True,
        'formality': 'semi-formal'
    }
}


class ToneAdapter:
    """
    Adapts response tone based on user preferences and context.
    Dynamically adjusts communication style for personalization.
    """

    def __init__(self, default_tone: str = 'coach'):
        """
        Initialize tone adapter.

        Args:
            default_tone: Default tone if not specified ('strict', 'friendly', 'coach')
        """
        self.default_tone = default_tone
        self.tone_preference = default_tone
        self.user_tone_history = {}

    def set_user_tone(self, user_id: str, tone: str):
        """Set tone preference for a user."""
        if tone not in TONE_TEMPLATES:
            logger.warning(f"Unknown tone: {tone}, using default")
            tone = self.default_tone

        self.user_tone_history[user_id] = tone
        logger.info(f"Set tone for user {user_id}: {tone}")

    def get_user_tone(self, user_id: str) -> str:
        """Get user's preferred tone."""
        return self.user_tone_history.get(user_id, self.default_tone)

    def get_system_prompt(self, tone: Optional[str] = None,
                         context: Optional[str] = None) -> str:
        """
        Get system prompt for specified tone.

        Args:
            tone: Tone type ('strict', 'friendly', 'coach')
            context: Additional context to append to system prompt

        Returns:
            System prompt string
        """
        tone = tone or self.default_tone
        if tone not in TONE_TEMPLATES:
            tone = self.default_tone

        base_prompt = TONE_TEMPLATES[tone]['system_prompt']

        if context:
            base_prompt += f"\n\nADDITIONAL CONTEXT:\n{context}"

        return base_prompt

    def adapt_response(self, response: str, tone: Optional[str] = None) -> str:
        """
        Adapt existing response to match tone style.

        Args:
            response: The response text to adapt
            tone: Target tone

        Returns:
            Tone-adapted response
        """
        tone = tone or self.default_tone
        if tone not in TONE_TEMPLATES:
            return response

        template = TONE_TEMPLATES[tone]

        # Apply tone-specific adjustments
        adapted = response

        # Adjust exclamations
        exclamation_count = adapted.count('!')
        target_exclamations = template['exclamation_usage']

        if exclamation_count > target_exclamations:
            # Remove excess exclamation marks
            adapted = adapted.replace('!', '.')
            for _ in range(target_exclamations):
                idx = adapted.rfind('.')
                if idx >= 0:
                    adapted = adapted[:idx] + '!' + adapted[idx+1:]
        elif exclamation_count < target_exclamations:
            # Add motivation exclamations for coach tone
            if tone == 'coach' and '.' in adapted:
                sentences = adapted.split('.')
                if len(sentences) > 1:
                    sentences[-2] = sentences[-2] + '!'
                    adapted = '.'.join(sentences)

        # Adjust emojis
        if not template['emoji_usage']:
            # Remove emojis
            adapted = self._remove_emojis(adapted)

        # Formality adjustments
        formality = template['formality']
        if formality == 'formal':
            adapted = self._make_formal(adapted)
        elif formality == 'casual':
            adapted = self._make_casual(adapted)

        return adapted

    def get_tone_info(self, tone: Optional[str] = None) -> Dict:
        """Get detailed information about a tone."""
        tone = tone or self.default_tone
        if tone not in TONE_TEMPLATES:
            return {}

        template = TONE_TEMPLATES[tone]
        return {
            'tone': tone,
            'description': template['description'],
            'structure': template['response_structure'],
            'keywords': template['tone_words'],
            'formality': template['formality'],
            'emoji_friendly': template['emoji_usage']
        }

    def infer_best_tone(self, user_context: Dict) -> str:
        """
        Infer best tone based on user context and patterns.

        Args:
            user_context: User's conversation context and preferences

        Returns:
            Recommended tone
        """
        # Check explicit preference
        if 'tone_preference' in user_context:
            return user_context['tone_preference']

        # Check user behavior patterns
        if 'interaction_patterns' in user_context:
            patterns = user_context['interaction_patterns']

            # Clinical focus → strict tone
            if 'health' in patterns.get('topic_distribution', {}):
                health_count = patterns['topic_distribution'].get('health', 0)
                if health_count > patterns.get('avg_interactions_per_session', 5):
                    return 'strict'

            # Goal-oriented → coach tone
            if patterns.get('preferred_length') == 'long':
                return 'coach'

            # Short interactions → friendly
            if patterns.get('preferred_length') == 'short':
                return 'friendly'

        # Check health status
        if 'health_status' in user_context:
            status = user_context['health_status']
            # Critical issues → strict tone
            if status in ['critical', 'warning']:
                return 'strict'
            # Good health → friendly tone
            elif status in ['excellent', 'good']:
                return 'friendly'

        return self.default_tone

    def get_tone_instruction_prompt(self, tone: Optional[str] = None) -> str:
        """
        Get instruction prompt for LLM to follow tone guidelines.

        Args:
            tone: Target tone

        Returns:
            Instruction prompt for tone
        """
        tone = tone or self.default_tone
        if tone not in TONE_TEMPLATES:
            return ""

        template = TONE_TEMPLATES[tone]
        formality_notes = {
            'formal': 'Use formal language, avoid contractions, be precise.',
            'casual': 'Use conversational language, contractions are fine, be warm.',
            'semi-formal': 'Balance between formal and casual, use both precision and warmth.'
        }

        return f"""TONE INSTRUCTIONS:
Tone: {tone.upper()}
Description: {template['description']}

Guidelines:
- Formality level: {template['formality']} - {formality_notes[template['formality']]}
- Key words to use: {', '.join(template['tone_words'])}
- Use exclamation marks: {template['exclamation_usage']} per response (0=none, 1=sparingly, 2=moderately)
- Include emojis: {'Yes, but sparingly' if template['emoji_usage'] else 'No'}
- Response structure: Start with {template['response_structure'][0]}, then {', '.join(template['response_structure'][1:])}

Always maintain this tone throughout your response."""

    def _make_formal(self, text: str) -> str:
        """Convert text to more formal style."""
        replacements = {
            "don't": "do not",
            "can't": "cannot",
            "won't": "will not",
            "i'm": "I am",
            "you're": "you are",
            "it's": "it is",
            "that's": "that is",
            "we're": "we are",
            "they're": "they are",
            "wasn't": "was not",
            "weren't": "were not",
            "isn't": "is not",
            "aren't": "are not",
            "hasn't": "has not",
            "haven't": "have not",
            "hadn't": "had not",
            "doesn't": "does not",
            "didn't": "did not",
        }

        for informal, formal in replacements.items():
            text = text.replace(informal, formal)
            text = text.replace(informal.capitalize(), formal.capitalize())

        return text

    def _make_casual(self, text: str) -> str:
        """Convert text to more casual style."""
        replacements = {
            "do not": "don't",
            "cannot": "can't",
            "will not": "won't",
        }

        for formal, informal in replacements.items():
            text = text.replace(formal, informal)

        return text

    def _remove_emojis(self, text: str) -> str:
        """Remove emojis from text."""
        # Remove common emoji patterns
        import re
        # This is a simplified approach; full emoji removal would need emoji library
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "]+", flags=re.UNICODE
        )
        return emoji_pattern.sub(r'', text)

    def get_all_tones(self) -> Dict[str, Dict]:
        """Get information about all available tones."""
        return {
            tone: self.get_tone_info(tone)
            for tone in TONE_TEMPLATES.keys()
        }
