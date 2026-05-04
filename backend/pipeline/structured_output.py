"""
Structured Output Format System
================================
Converts LLM outputs to structured JSON format ready for UI rendering.
Provides multiple output schemas for different use cases.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class UIInsight:
    """Structured insight for UI rendering."""
    title: str
    description: str
    severity: str  # 'info', 'warning', 'alert'
    icon: str
    actions: List[Dict[str, str]]
    metadata: Dict[str, Any]


@dataclass
class UIRecommendation:
    """Structured recommendation for UI rendering."""
    category: str  # 'sleep', 'exercise', 'stress', etc.
    title: str
    description: str
    priority: str  # 'high', 'medium', 'low'
    confidence: float  # 0-1
    actions: List[str]
    estimated_impact: str
    timeframe: str


class StructuredOutputFormatter:
    """
    Formats LLM outputs into structured JSON for UI consumption.
    Supports multiple schema types for different output purposes.
    """

    def __init__(self):
        """Initialize structured output formatter."""
        self.schemas = self._setup_schemas()

    def _setup_schemas(self) -> Dict[str, Dict]:
        """Setup available output schemas."""
        return {
            'health_insight': {
                'type': 'object',
                'required': ['title', 'description', 'category', 'severity', 'metadata'],
                'properties': {
                    'title': {'type': 'string'},
                    'description': {'type': 'string'},
                    'category': {'type': 'string', 'enum': [
                        'heart', 'sleep', 'activity', 'stress', 'recovery', 'general'
                    ]},
                    'severity': {'type': 'string', 'enum': ['info', 'warning', 'alert']},
                    'metrics': {'type': 'object'},
                    'trend': {'type': 'string', 'enum': ['improving', 'stable', 'declining']},
                    'recommendation': {'type': 'string'},
                    'metadata': {'type': 'object'}
                }
            },
            'health_recommendation': {
                'type': 'object',
                'required': ['category', 'title', 'description', 'priority'],
                'properties': {
                    'category': {'type': 'string'},
                    'title': {'type': 'string'},
                    'description': {'type': 'string'},
                    'priority': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                    'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                    'actions': {'type': 'array', 'items': {'type': 'string'}},
                    'timeframe': {'type': 'string'},
                    'estimated_impact': {'type': 'string'}
                }
            },
            'daily_summary': {
                'type': 'object',
                'required': ['date', 'overall_health_score', 'key_insights', 'recommendations'],
                'properties': {
                    'date': {'type': 'string'},
                    'overall_health_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'key_insights': {'type': 'array', 'items': {'type': 'object'}},
                    'metrics_summary': {'type': 'object'},
                    'recommendations': {'type': 'array', 'items': {'type': 'object'}},
                    'trends': {'type': 'object'},
                    'alerts': {'type': 'array', 'items': {'type': 'object'}}
                }
            },
            'response_package': {
                'type': 'object',
                'required': ['response', 'metadata', 'ui_renderable'],
                'properties': {
                    'response': {'type': 'string'},
                    'metadata': {'type': 'object'},
                    'ui_renderable': {'type': 'object'},
                    'confidence': {'type': 'number'},
                    'actions': {'type': 'array'}
                }
            }
        }

    def format_health_insight(self, insight_text: str, health_data: Dict,
                             category: str = 'general',
                             severity: str = 'info') -> Dict:
        """
        Format health insight into structured output.

        Args:
            insight_text: Raw insight text from LLM
            health_data: Health metrics used for insight
            category: Insight category
            severity: Alert severity level

        Returns:
            Structured insight JSON
        """
        # Extract key components from text
        lines = insight_text.split('\n')
        title = lines[0] if lines else "Health Insight"
        description = '\n'.join(lines[1:]) if len(lines) > 1 else insight_text

        # Extract metrics mentioned
        mentioned_metrics = self._extract_metrics(insight_text, health_data)

        # Determine trend
        trend = self._determine_trend(health_data, mentioned_metrics)

        structured = {
            'title': title.strip(),
            'description': description.strip(),
            'category': category,
            'severity': severity,
            'metrics': mentioned_metrics,
            'trend': trend,
            'recommendation': self._extract_recommendation(insight_text),
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'data_points': len(health_data),
                'categories_covered': list(set([k.split('_')[0] for k in health_data.keys()]))
            }
        }

        return structured

    def format_recommendation(self, recommendation_text: str, category: str,
                             priority: str = 'medium',
                             confidence: float = 0.8,
                             evidence_count: int = 0) -> Dict:
        """
        Format recommendation into structured output.

        Args:
            recommendation_text: Raw recommendation text
            category: Recommendation category
            priority: Priority level
            confidence: Confidence score (0-1)
            evidence_count: Number of supporting evidence items

        Returns:
            Structured recommendation JSON
        """
        lines = recommendation_text.split('\n')
        title = lines[0] if lines else "Recommendation"

        # Extract actions/steps
        actions = self._extract_actions(recommendation_text)

        # Determine impact
        impact = self._estimate_impact(recommendation_text, evidence_count)

        # Estimate timeframe
        timeframe = self._extract_timeframe(recommendation_text)

        structured = {
            'category': category,
            'title': title.strip(),
            'description': recommendation_text.strip(),
            'priority': priority,
            'confidence': min(1.0, max(0.0, confidence)),
            'actions': actions,
            'timeframe': timeframe,
            'estimated_impact': impact,
            'evidence_count': evidence_count,
            'timestamp': datetime.now().isoformat(),
            'ui_hints': {
                'icon': self._get_category_icon(category),
                'color': self._get_priority_color(priority),
                'display_format': 'card'
            }
        }

        return structured

    def format_daily_summary(self, insights: List[Dict], recommendations: List[Dict],
                            health_score: float, metrics: Dict,
                            alerts: List[Dict] = None) -> Dict:
        """
        Format complete daily summary.

        Args:
            insights: List of insights
            recommendations: List of recommendations
            health_score: Overall health score (0-100)
            metrics: Daily metrics summary
            alerts: Critical alerts

        Returns:
            Structured daily summary JSON
        """
        summary = {
            'date': datetime.now().date().isoformat(),
            'overall_health_score': min(100, max(0, health_score)),
            'health_score_trend': self._determine_health_trend(health_score),
            'key_insights': insights[:5],  # Top 5 insights
            'metrics_summary': {
                'measured_metrics': len([v for v in metrics.values() if v is not None]),
                'total_metrics': len(metrics),
                'key_values': self._extract_key_metrics(metrics)
            },
            'recommendations': recommendations[:10],  # Top 10 recommendations
            'trends': {
                'heart_rate': self._get_metric_trend(metrics, 'heart_rate'),
                'sleep': self._get_metric_trend(metrics, 'sleep'),
                'activity': self._get_metric_trend(metrics, 'activity'),
                'stress': self._get_metric_trend(metrics, 'stress')
            },
            'alerts': alerts or [],
            'timestamp': datetime.now().isoformat(),
            'ui_layout': {
                'primary_metric': 'overall_health_score',
                'secondary_metrics': ['heart_rate', 'sleep', 'activity'],
                'visualization_types': ['gauge', 'line_chart', 'card_grid']
            }
        }

        return summary

    def format_response_package(self, response: str, metadata: Dict,
                               confidence: float = 0.8,
                               actions: List[Dict] = None,
                               ui_renderable: Optional[Dict] = None) -> Dict:
        """
        Format complete response package with all metadata.

        Args:
            response: Main response text
            metadata: Response metadata
            confidence: Confidence score
            actions: Available actions
            ui_renderable: UI rendering data

        Returns:
            Complete response package
        """
        if ui_renderable is None:
            ui_renderable = {
                'type': 'text',
                'format': 'markdown'
            }

        package = {
            'response': response,
            'metadata': {
                **metadata,
                'generated_at': datetime.now().isoformat(),
                'format_version': '1.0'
            },
            'confidence': min(1.0, max(0.0, confidence)),
            'confidence_level': self._confidence_to_level(confidence),
            'ui_renderable': ui_renderable,
            'actions': actions or [],
            'follow_up_suggestions': self._generate_follow_ups(response, metadata)
        }

        return package

    def convert_text_to_structured(self, text: str, output_type: str = 'response_package',
                                  metadata: Optional[Dict] = None) -> Dict:
        """
        Convert raw text to structured format with AI assistance.

        Args:
            text: Raw text to structure
            output_type: Type of structured output
            metadata: Additional metadata

        Returns:
            Structured output
        """
        metadata = metadata or {}

        if output_type == 'health_insight':
            return self.format_health_insight(text, metadata.get('health_data', {}))
        elif output_type == 'health_recommendation':
            return self.format_recommendation(
                text,
                metadata.get('category', 'general'),
                metadata.get('priority', 'medium'),
                metadata.get('confidence', 0.8)
            )
        elif output_type == 'daily_summary':
            return self.format_daily_summary(
                metadata.get('insights', []),
                metadata.get('recommendations', []),
                metadata.get('health_score', 75),
                metadata.get('metrics', {})
            )
        else:
            return self.format_response_package(text, metadata)

    def extract_json_from_text(self, text: str) -> Optional[Dict]:
        """
        Attempt to extract JSON from LLM text output.

        Args:
            text: Text potentially containing JSON

        Returns:
            Extracted JSON or None
        """
        # Find JSON blocks
        import re
        json_pattern = r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}'
        matches = re.finditer(json_pattern, text)

        for match in matches:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue

        return None

    # ───────────────────────────────────────────────────────────────────────
    # Helper methods
    # ───────────────────────────────────────────────────────────────────────

    def _extract_metrics(self, text: str, health_data: Dict) -> Dict:
        """Extract metrics mentioned in text from health data."""
        mentioned = {}
        for key, value in health_data.items():
            if key.lower() in text.lower() or key.replace('_', ' ') in text.lower():
                mentioned[key] = value
        return mentioned

    def _determine_trend(self, health_data: Dict, metrics: Dict) -> str:
        """Determine trend from metrics."""
        # Simplified: check if key metrics are in healthy ranges
        if not metrics:
            return 'stable'

        health_keywords_improving = ['improve', 'better', 'increase', 'high', 'positive']
        health_keywords_declining = ['decrease', 'worse', 'low', 'negative', 'risk']

        text_content = str(list(metrics.keys()) + list(health_data.values()))
        improving_score = sum(1 for kw in health_keywords_improving if kw.lower() in text_content.lower())
        declining_score = sum(1 for kw in health_keywords_declining if kw.lower() in text_content.lower())

        if improving_score > declining_score:
            return 'improving'
        elif declining_score > improving_score:
            return 'declining'
        else:
            return 'stable'

    def _extract_recommendation(self, text: str) -> str:
        """Extract primary recommendation from text."""
        lines = text.split('\n')
        for line in lines:
            if any(kw in line.lower() for kw in ['recommend', 'should', 'consider', 'try']):
                return line.strip()
        return ""

    def _extract_actions(self, text: str) -> List[str]:
        """Extract action items from text."""
        actions = []
        lines = text.split('\n')

        for line in lines:
            # Look for numbered or bulleted items
            if any(line.lstrip().startswith(marker) for marker in ['1.', '2.', '3.', '-', '•', '*']):
                action = line.lstrip('123456789. •*-').strip()
                if action:
                    actions.append(action)

        return actions[:5]  # Limit to 5 actions

    def _estimate_impact(self, text: str, evidence_count: int) -> str:
        """Estimate impact of recommendation."""
        strong_indicators = ['significantly', 'dramatically', 'greatly', 'substantial']
        moderate_indicators = ['moderately', 'somewhat', 'help', 'improve']

        strong_count = sum(1 for ind in strong_indicators if ind in text.lower())
        moderate_count = sum(1 for ind in moderate_indicators if ind in text.lower())

        if strong_count > 0:
            return 'significant'
        elif moderate_count > 0 or evidence_count >= 2:
            return 'moderate'
        else:
            return 'minor'

    def _extract_timeframe(self, text: str) -> str:
        """Extract timeframe from text."""
        import re
        timeframe_patterns = [
            (r'(\d+)\s*(week|weeks)', 'weeks'),
            (r'(\d+)\s*(day|days)', 'days'),
            (r'(\d+)\s*(month|months)', 'months'),
            (r'(daily|weekly|monthly)', 'ongoing'),
        ]

        for pattern, default in timeframe_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return default

        return 'ongoing'

    def _get_category_icon(self, category: str) -> str:
        """Get icon for category."""
        icons = {
            'sleep': '😴',
            'exercise': '💪',
            'stress': '🧘',
            'heart': '❤️',
            'activity': '🚶',
            'nutrition': '🥗',
            'recovery': '⚡',
            'general': '📊'
        }
        return icons.get(category.lower(), '📌')

    def _get_priority_color(self, priority: str) -> str:
        """Get color for priority level."""
        colors = {
            'high': '#FF6B6B',
            'medium': '#FFA500',
            'low': '#4ECDC4'
        }
        return colors.get(priority.lower(), '#999999')

    def _confidence_to_level(self, confidence: float) -> str:
        """Convert confidence score to level."""
        if confidence >= 0.8:
            return 'HIGH'
        elif confidence >= 0.5:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _determine_health_trend(self, score: float) -> str:
        """Determine health trend from score."""
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'fair'
        else:
            return 'needs_attention'

    def _extract_key_metrics(self, metrics: Dict) -> Dict:
        """Extract key metrics from full metrics dict."""
        priority_keys = ['heart_rate', 'hrv', 'spo2', 'sleep', 'stress', 'steps']
        key_metrics = {}

        for key in priority_keys:
            for metric_key, metric_value in metrics.items():
                if key in metric_key.lower():
                    key_metrics[metric_key] = metric_value
                    break

        return key_metrics

    def _get_metric_trend(self, metrics: Dict, category: str) -> str:
        """Get trend for specific metric category."""
        # Simplified: return stable if metric exists
        has_metric = any(category.lower() in str(k).lower() for k in metrics.keys())
        return 'available' if has_metric else 'unavailable'

    def _generate_follow_ups(self, response: str, metadata: Dict) -> List[str]:
        """Generate follow-up suggestions."""
        follow_ups = []

        if 'sleep' in response.lower():
            follow_ups.append('How are your sleep patterns tracking?')
        if 'exercise' in response.lower() or 'activity' in response.lower():
            follow_ups.append('Would you like personalized workout suggestions?')
        if 'stress' in response.lower():
            follow_ups.append('Try our guided breathing exercises for stress relief')

        return follow_ups[:3]
