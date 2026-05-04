"""
Reasoning Validation System
============================
Post-validates LLM reasoning and outputs for correctness and safety.
Implements logical consistency checks and output verification.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)


class ReasoningValidator:
    """
    Validates LLM reasoning process and outputs.
    Checks logical consistency, clinical appropriateness, and safety.
    """

    def __init__(self):
        """Initialize reasoning validator."""
        self.validation_rules = self._setup_validation_rules()

    def _setup_validation_rules(self) -> Dict:
        """Setup validation rules for different output types."""
        return {
            'health_insight': {
                'required_elements': ['observation', 'interpretation', 'actionable_item'],
                'prohibited_terms': ['cure', 'guaranteed', 'always works'],
                'required_caveats': True,
                'max_claims': 5
            },
            'medical_recommendation': {
                'required_elements': ['rationale', 'action', 'monitoring'],
                'prohibited_terms': ['must', 'will definitely', 'certain cure'],
                'required_caveats': True,
                'max_claims': 4
            },
            'health_analysis': {
                'required_elements': ['data_summary', 'pattern', 'interpretation'],
                'prohibited_terms': ['definitely means', 'absolute'],
                'required_caveats': False,
                'max_claims': 10
            }
        }

    def validate_output(self, output: str, output_type: str,
                       context: Optional[Dict] = None) -> Dict:
        """
        Validate LLM output for correctness and safety.

        Args:
            output: Output text to validate
            output_type: Type of output ('health_insight', 'medical_recommendation', 'health_analysis')
            context: Additional context for validation

        Returns:
            Comprehensive validation report
        """
        validation_results = {
            'output_type': output_type,
            'is_valid': True,
            'validation_scores': {},
            'issues': [],
            'warnings': [],
            'passed_checks': 0,
            'failed_checks': 0
        }

        # Run all validation checks
        validation_results['validation_scores']['structure'] = self._validate_structure(
            output, output_type
        )
        validation_results['validation_scores']['safety'] = self._validate_safety(
            output, output_type, context
        )
        validation_results['validation_scores']['logic'] = self._validate_logic(output)
        validation_results['validation_scores']['clinical_appropriateness'] = self._validate_clinical_appropriateness(
            output, context
        )
        validation_results['validation_scores']['clarity'] = self._validate_clarity(output)

        # Aggregate issues
        structure_issues = self._validate_structure(output, output_type, return_issues=True)
        safety_issues = self._validate_safety(output, output_type, context, return_issues=True)
        logic_issues = self._validate_logic(output, return_issues=True)
        clinical_issues = self._validate_clinical_appropriateness(output, context, return_issues=True)

        all_issues = structure_issues + safety_issues + logic_issues + clinical_issues

        for issue in all_issues:
            if issue['severity'] == 'error':
                validation_results['issues'].append(issue)
                validation_results['failed_checks'] += 1
            else:
                validation_results['warnings'].append(issue)
            validation_results['passed_checks'] += 1

        # Overall validity
        validation_results['is_valid'] = len(validation_results['issues']) == 0
        validation_results['overall_score'] = self._calculate_validation_score(
            validation_results['validation_scores']
        )

        return validation_results

    def _validate_structure(self, output: str, output_type: str,
                           return_issues: bool = False) -> Union[float, List[Dict]]:
        """Validate output structure and organization."""
        issues = []
        score = 1.0

        if not output or len(output.strip()) == 0:
            issues.append({
                'type': 'empty_output',
                'severity': 'error',
                'message': 'Output is empty'
            })
            return issues if return_issues else 0.0

        # Check minimum length
        word_count = len(output.split())
        if word_count < 10:
            issues.append({
                'type': 'too_short',
                'severity': 'warning',
                'message': f'Output too short ({word_count} words, expected > 10)'
            })
            score -= 0.2

        # Check for proper sentences
        sentences = [s.strip() for s in output.split('.') if s.strip()]
        if len(sentences) < 2:
            issues.append({
                'type': 'insufficient_sentences',
                'severity': 'warning',
                'message': 'Output should have multiple sentences for clarity'
            })
            score -= 0.15

        # Check for required elements based on output type
        if output_type in self.validation_rules:
            required = self.validation_rules[output_type]['required_elements']
            for element in required:
                # Simplified check: look for element in output
                if element.lower() not in output.lower():
                    # Element is missing - but some flexibility allowed
                    pass

        # Check for proper ending
        if not output.rstrip().endswith(('.', '!', '?')):
            issues.append({
                'type': 'no_proper_ending',
                'severity': 'warning',
                'message': 'Output should end with punctuation'
            })
            score -= 0.05

        return issues if return_issues else max(0.0, score)

    def _validate_safety(self, output: str, output_type: str,
                        context: Optional[Dict] = None,
                        return_issues: bool = False) -> Union[float, List[Dict]]:
        """Validate output for medical safety."""
        issues = []
        score = 1.0

        # Check for prohibited terms
        if output_type in self.validation_rules:
            prohibited = self.validation_rules[output_type]['prohibited_terms']
            for term in prohibited:
                if term.lower() in output.lower():
                    issues.append({
                        'type': 'prohibited_term',
                        'severity': 'error',
                        'message': f'Prohibited term used: "{term}"',
                        'term': term
                    })
                    score -= 0.3

        # Check for dangerous medical advice
        dangerous_patterns = [
            r'stop (medication|treatment|insulin)',
            r'(overdose|poisoning|toxicity)',
            r'ignore.*symptom',
            r'dangerous|critical.*no (medical|doctor)',
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, output, re.IGNORECASE):
                issues.append({
                    'type': 'dangerous_advice',
                    'severity': 'error',
                    'message': f'Potentially dangerous advice detected: {pattern}'
                })
                score -= 0.5

        # Check for required caveats
        if output_type in self.validation_rules:
            if self.validation_rules[output_type]['required_caveats']:
                caveat_keywords = ['consult', 'doctor', 'healthcare', 'professional', 'discuss', 'may', 'consider']
                if not any(kw in output.lower() for kw in caveat_keywords):
                    issues.append({
                        'type': 'missing_caveat',
                        'severity': 'warning',
                        'message': 'Medical recommendations should include appropriate caveats'
                    })
                    score -= 0.15

        # Check for critical health alerts being downplayed
        critical_terms = ['critical', 'emergency', 'severe', 'chest pain', 'difficulty breathing']
        for term in critical_terms:
            if term in output.lower():
                # Should recommend professional help
                if not any(
                    kw in output.lower() for kw in
                    ['emergency', 'hospital', 'doctor', 'medical professional', 'seek help']
                ):
                    issues.append({
                        'type': 'critical_alert_downplayed',
                        'severity': 'error',
                        'message': f'Critical health alert "{term}" should recommend professional help'
                    })
                    score -= 0.4

        return issues if return_issues else max(0.0, score)

    def _validate_logic(self, output: str,
                       return_issues: bool = False) -> Union[float, List[Dict]]:
        """Validate logical consistency of reasoning."""
        issues = []
        score = 1.0

        # Check for contradictions
        contradictions = self._find_contradictions(output)
        for contradiction in contradictions:
            issues.append({
                'type': 'logical_contradiction',
                'severity': 'error',
                'message': f'Contradictory statements: {contradiction}'
            })
            score -= 0.25

        # Check for unsupported claims
        unsupported = self._find_unsupported_claims(output)
        for claim in unsupported:
            issues.append({
                'type': 'unsupported_claim',
                'severity': 'warning',
                'message': f'Claim may lack support: {claim[:50]}...'
            })
            score -= 0.1

        # Check for faulty generalizations
        if self._detects_faulty_generalization(output):
            issues.append({
                'type': 'faulty_generalization',
                'severity': 'warning',
                'message': 'Output contains potentially faulty generalizations'
            })
            score -= 0.15

        # Check for proper causal reasoning
        causal_errors = self._find_causal_errors(output)
        for error in causal_errors:
            issues.append({
                'type': 'causal_error',
                'severity': 'warning',
                'message': f'Potentially faulty causation: {error}'
            })
            score -= 0.1

        return issues if return_issues else max(0.0, score)

    def _validate_clinical_appropriateness(self, output: str,
                                          context: Optional[Dict] = None,
                                          return_issues: bool = False) -> Union[float, List[Dict]]:
        """Validate clinical appropriateness of output."""
        issues = []
        score = 1.0

        # Check for evidence-based language when making claims
        strong_claims = re.findall(
            r'(will|must|should|always|never)\s+([^.!?]+)',
            output,
            re.IGNORECASE
        )

        for claim in strong_claims:
            # Check if claim is supported by evidence indicators
            if not any(
                indicator in output.lower() for indicator in
                ['research', 'study', 'evidence', 'clinical', 'shown', 'data']
            ):
                # Allow some common sense claims
                if not self._is_common_health_sense(claim[1]):
                    issues.append({
                        'type': 'unsupported_strong_claim',
                        'severity': 'warning',
                        'message': f'Strong claim without evidence: "{claim[0]} {claim[1][:30]}..."'
                    })
                    score -= 0.1

        # Check if recommendations are specific enough
        if 'recommend' in output.lower() or 'should' in output.lower():
            if not re.search(r'\d+', output):  # No numbers/specificity
                issues.append({
                    'type': 'non_specific_recommendation',
                    'severity': 'warning',
                    'message': 'Recommendations should be specific with measurable targets'
                })
                score -= 0.1

        # Check for individualization
        generic_phrases = ['everyone should', 'all people', 'humans need']
        if any(phrase in output.lower() for phrase in generic_phrases):
            issues.append({
                'type': 'overgeneralized',
                'severity': 'warning',
                'message': 'Recommendations should be tailored to individual context'
            })
            score -= 0.15

        return issues if return_issues else max(0.0, score)

    def _validate_clarity(self, output: str,
                         return_issues: bool = False) -> Union[float, List[Dict]]:
        """Validate clarity and readability."""
        issues = []
        score = 1.0

        sentences = [s.strip() for s in output.split('.') if s.strip()]

        # Check for overly complex sentences
        for sentence in sentences:
            words = sentence.split()
            if len(words) > 30:
                issues.append({
                    'type': 'overly_complex_sentence',
                    'severity': 'warning',
                    'message': f'Sentence too long ({len(words)} words): "{sentence[:40]}..."'
                })
                score -= 0.05

        # Check for jargon without explanation
        medical_jargon = [
            'myocardial', 'arrhythmia', 'hypertension', 'tachycardia',
            'bradycardia', 'hypoxemia', 'tachypnea'
        ]

        for term in medical_jargon:
            if term in output.lower():
                # Check if explained
                if not self._is_term_explained(term, output):
                    issues.append({
                        'type': 'unexplained_jargon',
                        'severity': 'warning',
                        'message': f'Medical term "{term}" used without explanation'
                    })
                    score -= 0.05

        # Check for ambiguous pronouns
        if re.search(r'\b(it|this|that|they)\b\s+([^.!?]{30,})[.!?]', output):
            # Potential ambiguous reference
            pass  # Only flag if clearly problematic

        return issues if return_issues else max(0.0, score)

    def _calculate_validation_score(self, scores: Dict[str, float]) -> float:
        """Calculate overall validation score."""
        if not scores:
            return 0.5

        weights = {
            'structure': 0.15,
            'safety': 0.35,
            'logic': 0.25,
            'clinical_appropriateness': 0.15,
            'clarity': 0.10
        }

        total = sum(
            scores.get(key, 0.5) * weight
            for key, weight in weights.items()
        )

        return min(1.0, total)

    def _find_contradictions(self, text: str) -> List[str]:
        """Find contradictory statements."""
        contradictions = []

        contradictory_pairs = [
            ('good', 'bad'),
            ('high', 'low'),
            ('increase', 'decrease'),
            ('yes', 'no'),
            ('should', 'should not'),
        ]

        for term1, term2 in contradictory_pairs:
            pattern = f'{term1}.*{term2}|{term2}.*{term1}'
            if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                contradictions.append(f'"{term1}" and "{term2}" both mentioned')

        return contradictions

    def _find_unsupported_claims(self, text: str) -> List[str]:
        """Find claims that lack support."""
        claims = []

        # Claims with modal verbs but no basis
        unsupported_patterns = [
            r'(will|must|should)\s+(always|never)\s+([^.!?]+)',
            r'(is|are)\s+(the\s+)?(best|only|most)\s+([^.!?]+)',
        ]

        for pattern in unsupported_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                claim = ' '.join(str(m) for m in match if m)
                claims.append(claim[:50])

        return claims

    def _detects_faulty_generalization(self, text: str) -> bool:
        """Detect faulty generalizations."""
        generalization_keywords = [
            'everyone', 'nobody', 'always', 'never', 'all people'
        ]

        return any(kw in text.lower() for kw in generalization_keywords)

    def _find_causal_errors(self, text: str) -> List[str]:
        """Find potentially faulty causal reasoning."""
        errors = []

        # Post hoc ergo propter hoc: A happened, then B happened, so A caused B
        causal_patterns = [
            r'because\s+([^.!?]+)[.!?]',
            r'caused by\s+([^.!?]+)[.!?]',
            r'resulted in\s+([^.!?]+)[.!?]',
        ]

        for pattern in causal_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches and len(matches) > 2:
                errors.append("Multiple causal claims without sufficient evidence")

        return errors

    def _is_common_health_sense(self, claim: str) -> bool:
        """Check if claim is common health sense."""
        common_sense_claims = [
            'sleep', 'rest', 'exercise', 'eat', 'drink water',
            'avoid stress', 'move more', 'monitor'
        ]

        return any(sense in claim.lower() for sense in common_sense_claims)

    def _is_term_explained(self, term: str, text: str) -> bool:
        """Check if medical term is explained in context."""
        explanation_keywords = ['(', 'also known as', 'meaning', 'refers to', 'definition']
        window = 100

        idx = text.lower().find(term)
        if idx < 0:
            return False

        context = text[max(0, idx-window):min(len(text), idx+window)]

        return any(kw in context.lower() for kw in explanation_keywords)

    def suggest_improvements(self, validation_report: Dict) -> List[str]:
        """Generate improvement suggestions based on validation results."""
        suggestions = []

        for issue in validation_report.get('issues', []):
            if issue['type'] == 'empty_output':
                suggestions.append('Regenerate output with more content')
            elif issue['type'] == 'prohibited_term':
                suggestions.append(f'Replace prohibited term: {issue.get("term", "")}')
            elif issue['type'] == 'dangerous_advice':
                suggestions.append('Remove potentially dangerous medical advice')
            elif issue['type'] == 'missing_caveat':
                suggestions.append('Add appropriate medical disclaimers')

        for warning in validation_report.get('warnings', []):
            if warning['type'] == 'too_short':
                suggestions.append('Expand output with more detail')
            elif warning['type'] == 'non_specific_recommendation':
                suggestions.append('Make recommendations more specific with measurable targets')
            elif warning['type'] == 'unexplained_jargon':
                suggestions.append('Explain medical terms in simpler language')

        return suggestions
