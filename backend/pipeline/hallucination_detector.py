"""
Hallucination Detection Layer
==============================
Detects potential hallucinations and unreliable outputs from LLM.
Uses multiple detection strategies: factuality checks, consistency validation, etc.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class HallucinationDetector:
    """
    Detects potential hallucinations and unreliable outputs from LLM.
    Uses multiple detection strategies for comprehensive coverage.
    """

    def __init__(self):
        """Initialize hallucination detector."""
        self.suspicious_patterns = [
            r'i (think|believe|assume)',  # Uncertain language
            r'(might|may|could) be',      # Speculative
            r'approximately|roughly|about',  # Vague
            r'(probably|likely|supposedly)',  # Uncertain
        ]

        self.suspicious_markers = []
        self.confidence_modifiers = {
            'might': -0.2,
            'may': -0.15,
            'could': -0.15,
            'probably': -0.15,
            'likely': -0.1,
            'supposedly': -0.2,
            'perhaps': -0.2,
            'possibly': -0.15,
            'apparently': -0.2,
            'allegedly': -0.3,
        }

    def detect_hallucination(self, response: str, input_data: Dict,
                            context: Optional[str] = None) -> Dict:
        """
        Detect potential hallucinations in LLM response.

        Args:
            response: LLM response text
            input_data: Input data used to generate response
            context: Additional context

        Returns:
            Hallucination detection report
        """
        hallucination_indicators = {
            'invented_facts': self._detect_invented_facts(response, input_data),
            'inconsistent_claims': self._detect_inconsistencies(response),
            'unsupported_numbers': self._detect_unsupported_numbers(response, input_data),
            'overconfident_claims': self._detect_overconfidence(response),
            'logical_fallacies': self._detect_logical_fallacies(response),
            'contradictions': self._detect_contradictions(response),
        }

        # Score likelihood of hallucination
        hallucination_score = self._calculate_hallucination_score(hallucination_indicators)

        is_hallucinating = hallucination_score > 0.5

        return {
            'is_hallucinating': is_hallucinating,
            'hallucination_likelihood': hallucination_score,
            'indicators': hallucination_indicators,
            'flagged_segments': self._extract_flagged_segments(response, hallucination_indicators),
            'recommendation': self._get_recommendation(hallucination_score)
        }

    def _detect_invented_facts(self, response: str, input_data: Dict) -> List[Dict]:
        """Detect claims not supported by input data."""
        flagged = []

        # Extract specific medical claims
        medical_claims = re.findall(
            r'(heart rate|hr|hrv|spo2|stress|sleep|heart|blood|oxygen|pulse)',
            response,
            re.IGNORECASE
        )

        for claim in medical_claims:
            # Check if claim has supporting data
            if not any(
                claim.lower() in str(k).lower() or
                claim.lower() in str(v).lower()
                for k, v in input_data.items()
            ):
                flagged.append({
                    'claim': claim,
                    'type': 'unsupported_claim',
                    'severity': 'medium'
                })

        return flagged

    def _detect_inconsistencies(self, response: str) -> List[Dict]:
        """Detect internal inconsistencies within the response."""
        flagged = []

        sentences = [s.strip() for s in response.split('.') if s.strip()]

        # Check for conflicting recommendations
        contradictory_pairs = [
            ('increase', 'decrease'),
            ('rest', 'exercise'),
            ('more', 'less'),
            ('longer', 'shorter'),
            ('higher', 'lower'),
        ]

        for term1, term2 in contradictory_pairs:
            has_term1 = any(term1 in s.lower() for s in sentences)
            has_term2 = any(term2 in s.lower() for s in sentences)

            if has_term1 and has_term2:
                flagged.append({
                    'terms': (term1, term2),
                    'type': 'conflicting_advice',
                    'severity': 'high'
                })

        return flagged

    def _detect_unsupported_numbers(self, response: str,
                                   input_data: Dict) -> List[Dict]:
        """Detect specific numbers not found in input data."""
        flagged = []

        # Extract all numbers from response
        response_numbers = re.findall(r'\d+\.?\d*', response)

        # Extract all numbers from input
        input_numbers = set()
        for v in input_data.values():
            if isinstance(v, (int, float)):
                input_numbers.add(str(v))
            elif isinstance(v, str):
                input_numbers.update(re.findall(r'\d+\.?\d*', v))

        # Find numbers in response not in input
        for num in response_numbers:
            if num not in input_numbers:
                # Get context around number
                idx = response.find(num)
                context = response[max(0, idx-30):min(len(response), idx+30)]

                # Some numbers might be age, standard ranges, etc. - lower severity
                if self._is_standard_reference(num):
                    severity = 'low'
                else:
                    severity = 'medium'

                flagged.append({
                    'number': num,
                    'context': context,
                    'type': 'unsupported_number',
                    'severity': severity
                })

        return flagged

    def _detect_overconfidence(self, response: str) -> List[Dict]:
        """Detect overconfident statements without proper qualifiers."""
        flagged = []

        # Find strong claims without qualifiers
        strong_claims = re.findall(
            r'(will|must|definitely|certainly|absolutely|always|never)\s+([^.!?]+[.!?])',
            response,
            re.IGNORECASE
        )

        for claim in strong_claims:
            # Check if claim is medical
            if any(
                term in claim[1].lower() for term in
                ['health', 'sleep', 'heart', 'stress', 'blood', 'exercise']
            ):
                # Medical claims with absolute language are suspicious
                flagged.append({
                    'claim': f"{claim[0]} {claim[1][:50]}...",
                    'type': 'overconfident_medical_claim',
                    'severity': 'high'
                })

        return flagged

    def _detect_logical_fallacies(self, response: str) -> List[Dict]:
        """Detect common logical fallacies."""
        flagged = []

        # Circular reasoning
        if self._has_circular_reasoning(response):
            flagged.append({
                'type': 'circular_reasoning',
                'severity': 'medium'
            })

        # False cause/effect
        cause_effect_keywords = ['because', 'caused by', 'due to', 'results in', 'leads to']
        if any(keyword in response.lower() for keyword in cause_effect_keywords):
            # Check if cause-effect is justified in context
            if not any(
                term in response.lower() for term in
                ['research shows', 'studies found', 'evidence indicates']
            ):
                flagged.append({
                    'type': 'unjustified_causation',
                    'severity': 'medium'
                })

        return flagged

    def _detect_contradictions(self, response: str) -> List[Dict]:
        """Detect contradictory statements."""
        flagged = []

        # Check for "X is Y" followed by "X is not Y"
        contradictions = [
            ('good', 'bad'),
            ('high', 'low'),
            ('safe', 'dangerous'),
            ('improve', 'worsen'),
            ('beneficial', 'harmful'),
        ]

        for term1, term2 in contradictions:
            idx1 = response.lower().find(term1)
            idx2 = response.lower().find(term2)

            if idx1 >= 0 and idx2 >= 0:
                # Check if they're close together
                distance = abs(idx1 - idx2)
                if distance < 300:  # Within 300 characters
                    flagged.append({
                        'terms': (term1, term2),
                        'distance': distance,
                        'type': 'direct_contradiction',
                        'severity': 'high'
                    })

        return flagged

    def _calculate_hallucination_score(self, indicators: Dict) -> float:
        """Calculate overall hallucination likelihood score."""
        weights = {
            'invented_facts': 0.25,
            'inconsistent_claims': 0.20,
            'unsupported_numbers': 0.15,
            'overconfident_claims': 0.20,
            'logical_fallacies': 0.10,
            'contradictions': 0.10,
        }

        score = 0.0
        for indicator, flagged_items in indicators.items():
            if not flagged_items:
                continue

            if indicator not in weights:
                continue

            # Severity-weighted count
            severity_scores = {
                'low': 0.1,
                'medium': 0.3,
                'high': 0.5
            }

            indicator_score = sum(
                severity_scores.get(item.get('severity', 'medium'), 0.3)
                for item in flagged_items
            ) / max(1, len(flagged_items))

            score += weights[indicator] * indicator_score

        return min(1.0, score)

    def _extract_flagged_segments(self, response: str,
                                 indicators: Dict) -> List[str]:
        """Extract specific segments of response that are flagged."""
        flagged_segments = []

        # Extract sentences containing flagged claims
        sentences = [s.strip() for s in response.split('.') if s.strip()]

        for indicator, items in indicators.items():
            for item in items:
                if 'claim' in item or 'terms' in item:
                    search_term = item.get('claim') or item.get('terms')[0]

                    for sentence in sentences:
                        if search_term.lower() in sentence.lower():
                            flagged_segments.append({
                                'segment': sentence,
                                'indicator': indicator,
                                'severity': item.get('severity', 'medium')
                            })

        return flagged_segments

    def _get_recommendation(self, hallucination_score: float) -> str:
        """Get recommendation based on hallucination score."""
        if hallucination_score > 0.7:
            return "REJECT: High hallucination likelihood. Do not use this output."
        elif hallucination_score > 0.5:
            return "CAUTION: Moderate hallucination risk. Verify claims before using."
        elif hallucination_score > 0.3:
            return "FLAG: Minor issues detected. Review flagged segments."
        else:
            return "ACCEPT: Low hallucination likelihood. Output appears reliable."

    def _is_standard_reference(self, number_str: str) -> bool:
        """Check if number is a standard reference (age, percentages, etc.)."""
        num = float(number_str)
        standard_ranges = [
            (0, 120),   # Age
            (0, 100),   # Percentages
            (18, 65),   # Adult age range
        ]

        for low, high in standard_ranges:
            if low <= num <= high:
                return True

        return False

    def _has_circular_reasoning(self, response: str) -> bool:
        """Check for circular reasoning pattern."""
        # Very simplified check: look for repeating phrases
        words = response.lower().split()
        if len(words) < 10:
            return False

        # Check if main idea repeats without new information
        first_half = ' '.join(words[:len(words)//2])
        second_half = ' '.join(words[len(words)//2:])

        # Count overlapping significant words
        overlap = sum(
            1 for word in first_half.split()
            if len(word) > 4 and word in second_half
        )

        return overlap > len(first_half.split()) * 0.6

    def validate_factual_claims(self, response: str,
                               known_facts: Dict[str, any]) -> Dict:
        """
        Validate factual claims against known facts.

        Args:
            response: Response text to validate
            known_facts: Dictionary of verified facts

        Returns:
            Validation report
        """
        errors = []

        for key, expected_value in known_facts.items():
            # Check if response mentions this fact
            if key.lower() in response.lower():
                # Extract claimed value and compare
                # This is a simplified check
                if isinstance(expected_value, (int, float)):
                    pattern = key.replace('_', ' ') + r'\s*(?:is|=|:)?\s*(\d+\.?\d*)'
                    matches = re.findall(pattern, response, re.IGNORECASE)

                    for match in matches:
                        claimed = float(match)
                        expected = float(expected_value)

                        # Allow 10% variance
                        if abs(claimed - expected) / expected > 0.1:
                            errors.append({
                                'fact': key,
                                'expected': expected_value,
                                'claimed': claimed,
                                'error_magnitude': abs(claimed - expected) / expected
                            })

        return {
            'validated': len(known_facts) - len(errors),
            'errors': errors,
            'error_count': len(errors),
            'is_factually_accurate': len(errors) == 0
        }
