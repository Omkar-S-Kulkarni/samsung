"""
Confidence Scoring System
==========================
Assigns confidence scores to LLM outputs and health insights.
Enables self-correction loops and reliability tracking.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """
    Scores confidence levels for LLM outputs and health insights.
    Combines multiple factors: data quality, signal strength, consistency, etc.
    """

    def __init__(self, default_thresholds: Optional[Dict] = None):
        """
        Initialize confidence scorer.

        Args:
            default_thresholds: Custom confidence thresholds
        """
        self.thresholds = default_thresholds or {
            'high': 0.75,
            'medium': 0.50,
            'low': 0.25
        }

        self.score_history = []
        self.min_confidence_threshold = 0.5

    def score_llm_output(self, response: str, prompt: str,
                        input_data_quality: float = 0.8) -> Dict:
        """
        Score confidence in LLM output.

        Args:
            response: LLM response text
            prompt: Original prompt that generated response
            input_data_quality: Quality score of input data (0-1)

        Returns:
            Confidence score dict with detailed breakdown
        """
        scores = {
            'data_quality': input_data_quality,
            'response_structure': self._score_response_structure(response),
            'coherence': self._score_coherence(response),
            'specificity': self._score_specificity(response, prompt),
            'consistency': self._score_consistency(response),
            'length_appropriateness': self._score_length(response),
        }

        # Weighted average
        weights = {
            'data_quality': 0.25,
            'response_structure': 0.20,
            'coherence': 0.20,
            'specificity': 0.15,
            'consistency': 0.15,
            'length_appropriateness': 0.05,
        }

        overall_confidence = sum(
            scores[key] * weights[key]
            for key in scores.keys()
            if key in weights
        )

        confidence_level = self._categorize_confidence(overall_confidence)

        result = {
            'overall_confidence': min(1.0, max(0.0, overall_confidence)),
            'confidence_level': confidence_level,
            'component_scores': scores,
            'weights': weights,
            'should_retry': overall_confidence < self.min_confidence_threshold
        }

        self.score_history.append(result)
        return result

    def score_health_insight(self, insight: str, health_metrics: Dict,
                            data_completeness: float = 0.8) -> Dict:
        """
        Score confidence in a health insight.

        Args:
            insight: Health insight text
            health_metrics: Current health metrics used for insight
            data_completeness: Fraction of expected metrics available (0-1)

        Returns:
            Confidence score with detailed breakdown
        """
        scores = {
            'data_completeness': data_completeness,
            'metric_count': self._score_metric_count(health_metrics),
            'metric_quality': self._score_metric_quality(health_metrics),
            'insight_specificity': self._score_specificity(insight, "health insight"),
            'clinical_grounding': self._score_clinical_grounding(insight),
            'actionability': self._score_actionability(insight),
        }

        weights = {
            'data_completeness': 0.25,
            'metric_count': 0.15,
            'metric_quality': 0.20,
            'insight_specificity': 0.15,
            'clinical_grounding': 0.15,
            'actionability': 0.10,
        }

        overall_confidence = sum(
            scores[key] * weights[key]
            for key in scores.keys()
            if key in weights
        )

        confidence_level = self._categorize_confidence(overall_confidence)

        return {
            'overall_confidence': min(1.0, max(0.0, overall_confidence)),
            'confidence_level': confidence_level,
            'component_scores': scores,
            'weights': weights,
            'recommendation_strength': self._strength_from_confidence(overall_confidence)
        }

    def score_recommendation(self, recommendation: str, health_context: Dict,
                            evidence_count: int = 0) -> Dict:
        """
        Score confidence in a health recommendation.

        Args:
            recommendation: Recommendation text
            health_context: Health context used for recommendation
            evidence_count: Number of evidence items supporting recommendation

        Returns:
            Confidence score
        """
        scores = {
            'context_completeness': self._score_context_completeness(health_context),
            'evidence_strength': min(1.0, evidence_count / 3.0),  # Normalize by typical count
            'specificity': self._score_specificity(recommendation, "recommendation"),
            'safety': self._score_safety(recommendation),
            'feasibility': self._score_feasibility(recommendation),
        }

        weights = {
            'context_completeness': 0.25,
            'evidence_strength': 0.30,
            'specificity': 0.20,
            'safety': 0.15,
            'feasibility': 0.10,
        }

        overall_confidence = sum(
            scores[key] * weights[key]
            for key in scores.keys()
        )

        confidence_level = self._categorize_confidence(overall_confidence)

        return {
            'overall_confidence': min(1.0, max(0.0, overall_confidence)),
            'confidence_level': confidence_level,
            'component_scores': scores,
            'safety_validated': scores['safety'] > 0.7,
            'evidence_count': evidence_count
        }

    # ───────────────────────────────────────────────────────────────────────
    # Component scoring functions
    # ───────────────────────────────────────────────────────────────────────

    def _score_response_structure(self, response: str) -> float:
        """Score how well-structured the response is."""
        if not response:
            return 0.0

        # Check for sections/organization
        has_sections = any(
            marker in response for marker in
            ['[', '##', '1.', '-', '•', ':', 'First', 'Second', 'Finally']
        )

        structure_score = 0.7 if has_sections else 0.4

        # Check for proper ending
        if response.rstrip().endswith(('.', '!', '?')):
            structure_score += 0.2

        # Check for reasonable length
        word_count = len(response.split())
        if 20 < word_count < 500:
            structure_score += 0.1

        return min(1.0, structure_score)

    def _score_coherence(self, response: str) -> float:
        """Score coherence and logical flow of response."""
        if not response:
            return 0.0

        # Check for self-contradiction indicators
        negatives = response.lower().count('not')
        positives = response.lower().count('yes')
        contradictions = negatives > 0 and positives > 0

        coherence = 0.8 if not contradictions else 0.4

        # Check for topic consistency
        sentences = response.split('.')
        topic_words = {}
        for sentence in sentences:
            words = set(sentence.lower().split())
            for word in words:
                if len(word) > 4:
                    topic_words[word] = topic_words.get(word, 0) + 1

        # High repetition indicates coherence
        repeated_topics = sum(1 for count in topic_words.values() if count > 1)
        topic_boost = min(0.2, repeated_topics * 0.05)

        return min(1.0, coherence + topic_boost)

    def _score_specificity(self, text: str, context: str = "") -> float:
        """Score how specific and detailed the response is."""
        if not text:
            return 0.0

        # Check for specific numbers
        number_pattern = r'\d+\.?\d*'
        numbers = len(re.findall(number_pattern, text))
        number_score = min(0.4, numbers * 0.1)

        # Check for specific measurements/units
        units_score = 0.2 if any(
            unit in text for unit in
            ['bpm', 'ms', '%', 'hours', 'minutes', 'steps', 'kcal', 'mg']
        ) else 0.0

        # Check for specific actionable items
        actionable_keywords = ['should', 'recommend', 'try', 'aim', 'target', 'maintain']
        actionable = sum(
            text.lower().count(keyword) for keyword in actionable_keywords
        )
        actionable_score = min(0.4, actionable * 0.1)

        specificity = number_score + units_score + actionable_score
        return min(1.0, specificity)

    def _score_consistency(self, response: str) -> float:
        """Score internal consistency of response."""
        if not response:
            return 0.0

        consistency_score = 0.8  # Default to high consistency

        # Check for contradictory statements
        contradictions = [
            ('good', 'bad'),
            ('high', 'low'),
            ('increase', 'decrease'),
            ('safe', 'dangerous'),
            ('recommended', 'not recommended'),
        ]

        contradiction_count = 0
        for term1, term2 in contradictions:
            if term1 in response.lower() and term2 in response.lower():
                # Check if they're in the same context
                idx1 = response.lower().find(term1)
                idx2 = response.lower().find(term2)
                if abs(idx1 - idx2) < 200:  # Within 200 chars
                    contradiction_count += 1

        consistency_score -= contradiction_count * 0.15

        return max(0.0, consistency_score)

    def _score_length(self, response: str) -> float:
        """Score appropriateness of response length."""
        if not response:
            return 0.0

        word_count = len(response.split())

        # Ideal length: 50-300 words
        if 50 <= word_count <= 300:
            return 1.0
        elif 20 <= word_count < 50:
            return 0.8
        elif 300 < word_count <= 500:
            return 0.8
        elif word_count < 20:
            return 0.5
        else:
            return 0.6

    def _score_metric_count(self, metrics: Dict) -> float:
        """Score based on number of available metrics."""
        count = len([v for v in metrics.values() if v is not None])
        # Expect at least 3 metrics for good confidence
        return min(1.0, count / 5.0)

    def _score_metric_quality(self, metrics: Dict) -> float:
        """Score quality of metric values (within valid ranges)."""
        if not metrics:
            return 0.0

        valid_count = 0
        total_count = 0

        ranges = {
            'heart_rate_bpm': (40, 200),
            'hrv_ms': (5, 300),
            'spo2_pct': (70, 100),
            'stress_score': (0, 100),
            'sleep_duration_min': (0, 1000),
            'steps_per_min': (0, 250),
        }

        for metric, value in metrics.items():
            if value is None:
                continue
            total_count += 1
            if metric in ranges:
                low, high = ranges[metric]
                if low <= value <= high:
                    valid_count += 1
            else:
                valid_count += 0.8  # Unknown metric gets benefit of doubt

        if total_count == 0:
            return 0.5

        return valid_count / total_count

    def _score_clinical_grounding(self, insight: str) -> float:
        """Score how grounded in clinical/medical knowledge the insight is."""
        clinical_keywords = [
            'stress', 'recovery', 'heart rate', 'sleep', 'oxygen', 'activity',
            'metabolism', 'cardiovascular', 'rest', 'fatigue', 'performance'
        ]

        keywords_found = sum(
            1 for keyword in clinical_keywords
            if keyword.lower() in insight.lower()
        )

        return min(1.0, keywords_found / 3.0)

    def _score_actionability(self, text: str) -> float:
        """Score how actionable the recommendation/insight is."""
        action_keywords = [
            'should', 'recommend', 'consider', 'try', 'aim for',
            'maintain', 'increase', 'decrease', 'avoid', 'focus on'
        ]

        action_count = sum(
            text.lower().count(keyword) for keyword in action_keywords
        )

        # Check for specific targets/numbers
        has_targets = bool(re.search(r'\d+\s*(hours|minutes|steps|bpm|%)', text))
        target_boost = 0.2 if has_targets else 0.0

        actionability = min(1.0, (action_count * 0.2) + target_boost)
        return actionability

    def _score_safety(self, recommendation: str) -> float:
        """Score safety of a recommendation."""
        dangerous_keywords = ['aggressive', 'intensive', 'extreme', 'push hard', 'no rest']
        dangerous_count = sum(
            recommendation.lower().count(keyword) for keyword in dangerous_keywords
        )

        if dangerous_count > 2:
            return 0.3
        elif dangerous_count > 0:
            return 0.6

        safe_keywords = ['gradually', 'moderate', 'consult', 'listen to body', 'rest']
        safe_count = sum(
            recommendation.lower().count(keyword) for keyword in safe_keywords
        )

        return min(1.0, 0.8 + (safe_count * 0.1))

    def _score_feasibility(self, recommendation: str) -> float:
        """Score practical feasibility of recommendation."""
        # Check for specific, achievable targets
        specific_patterns = [
            r'\d+\s*(min|hour|day|week)',
            r'(walk|run|exercise)\s+(at|for)',
            r'(try|aim|target)\s+\d+',
        ]

        specific_count = sum(
            len(re.findall(pattern, recommendation, re.IGNORECASE))
            for pattern in specific_patterns
        )

        feasibility = min(1.0, 0.6 + (specific_count * 0.15))
        return feasibility

    def _score_context_completeness(self, context: Dict) -> float:
        """Score completeness of health context."""
        expected_keys = [
            'heart_rate', 'hrv', 'spo2', 'steps', 'sleep', 'stress'
        ]

        available_keys = sum(
            1 for key in expected_keys
            if any(ek in str(k).lower() for k in context.keys() for ek in [key])
        )

        return available_keys / len(expected_keys)

    def _categorize_confidence(self, score: float) -> str:
        """Categorize confidence score into level."""
        if score >= self.thresholds['high']:
            return 'HIGH'
        elif score >= self.thresholds['medium']:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _strength_from_confidence(self, confidence: float) -> str:
        """Convert confidence to recommendation strength."""
        if confidence >= 0.8:
            return 'STRONG'
        elif confidence >= 0.6:
            return 'MODERATE'
        else:
            return 'WEAK'

    def get_confidence_summary(self) -> Dict:
        """Get summary statistics of confidence scores."""
        if not self.score_history:
            return {}

        confidences = [s['overall_confidence'] for s in self.score_history]

        return {
            'total_scores': len(self.score_history),
            'average_confidence': np.mean(confidences),
            'median_confidence': np.median(confidences),
            'min_confidence': np.min(confidences),
            'max_confidence': np.max(confidences),
            'std_deviation': np.std(confidences),
            'high_confidence_ratio': sum(1 for c in confidences if c >= self.thresholds['high']) / len(confidences),
            'low_confidence_ratio': sum(1 for c in confidences if c < self.thresholds['medium']) / len(confidences),
        }
