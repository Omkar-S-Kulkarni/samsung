"""
Cross-Session Conversational Memory System
============================================
Maintains long-term conversation continuity and user interaction patterns.
Enables the coach to remember user preferences, past interactions, and context.
"""

import json
import logging
import os
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ConversationMemory:
    """
    Cross-session memory for maintaining conversation continuity.
    Stores user interactions, preferences, and context for personalization.
    """

    def __init__(self, memory_file: str = "output/conversation_memory.json",
                 max_sessions: int = 50, max_interactions_per_session: int = 100):
        """
        Initialize conversation memory system.

        Args:
            memory_file: Path to persistent memory storage
            max_sessions: Maximum conversation sessions to store
            max_interactions_per_session: Max interactions per session
        """
        self.memory_file = memory_file
        self.max_sessions = max_sessions
        self.max_interactions_per_session = max_interactions_per_session

        # In-memory cache
        self.sessions: Dict[str, Dict] = {}
        self.current_session_id: Optional[str] = None

        self._load_from_disk()

    def _load_from_disk(self):
        """Load conversation memory from disk."""
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, 'r') as f:
                    data = json.load(f)
                    self.sessions = data.get('sessions', {})
                    logger.info(f"Loaded {len(self.sessions)} conversation sessions")
            except Exception as e:
                logger.warning(f"Failed to load conversation memory: {e}")
                self.sessions = {}
        else:
            self.sessions = {}

    def _save_to_disk(self):
        """Save conversation memory to disk."""
        try:
            os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
            with open(self.memory_file, 'w') as f:
                json.dump({
                    'sessions': self.sessions,
                    'last_updated': datetime.now().isoformat()
                }, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save conversation memory: {e}")

    def start_session(self, user_id: str) -> str:
        """
        Start a new conversation session.

        Returns:
            Session ID
        """
        session_id = f"{user_id}_{int(time.time())}"
        self.current_session_id = session_id

        self.sessions[session_id] = {
            'user_id': user_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'interactions': [],
            'metadata': {},
            'user_preferences': {},
            'context_variables': {}
        }

        logger.info(f"Started session {session_id} for user {user_id}")
        return session_id

    def add_interaction(self, user_message: str, assistant_response: str,
                       metadata: Optional[Dict] = None,
                       session_id: Optional[str] = None):
        """
        Record a user-assistant interaction.

        Args:
            user_message: User's input
            assistant_response: Assistant's response
            metadata: Additional metadata (confidence, tone, etc.)
            session_id: Session to record in (current if not specified)
        """
        session_id = session_id or self.current_session_id
        if not session_id or session_id not in self.sessions:
            logger.warning(f"Invalid session: {session_id}")
            return

        interaction = {
            'timestamp': datetime.now().isoformat(),
            'user_message': user_message,
            'assistant_response': assistant_response,
            'metadata': metadata or {}
        }

        session = self.sessions[session_id]
        session['interactions'].append(interaction)
        session['updated_at'] = datetime.now().isoformat()

        # Maintain max interactions
        if len(session['interactions']) > self.max_interactions_per_session:
            session['interactions'] = session['interactions'][-self.max_interactions_per_session:]

        self._save_to_disk()
        logger.debug(f"Added interaction to session {session_id}")

    def get_session_context(self, session_id: Optional[str] = None,
                           max_interactions: int = 10) -> Dict:
        """
        Get context from a conversation session.

        Returns:
            Dictionary with session info and recent interactions
        """
        session_id = session_id or self.current_session_id
        if not session_id or session_id not in self.sessions:
            return {}

        session = self.sessions[session_id]
        interactions = session['interactions'][-max_interactions:]

        return {
            'session_id': session_id,
            'user_id': session['user_id'],
            'created_at': session['created_at'],
            'total_interactions': len(session['interactions']),
            'recent_interactions': interactions,
            'user_preferences': session.get('user_preferences', {}),
            'context_variables': session.get('context_variables', {})
        }

    def get_user_history(self, user_id: str, max_sessions: int = 5) -> Dict:
        """
        Get user's conversation history across sessions.

        Args:
            user_id: User identifier
            max_sessions: Number of recent sessions to retrieve

        Returns:
            Compiled history from recent sessions
        """
        user_sessions = [
            (sid, s) for sid, s in self.sessions.items()
            if s['user_id'] == user_id
        ]

        # Sort by creation time, get most recent
        user_sessions = sorted(
            user_sessions,
            key=lambda x: x[1]['created_at'],
            reverse=True
        )[:max_sessions]

        history = {
            'user_id': user_id,
            'total_sessions': len(user_sessions),
            'sessions': []
        }

        for session_id, session in user_sessions:
            history['sessions'].append({
                'session_id': session_id,
                'created_at': session['created_at'],
                'interaction_count': len(session['interactions']),
                'user_preferences': session.get('user_preferences', {}),
                'context_variables': session.get('context_variables', {})
            })

        return history

    def update_user_preferences(self, preferences: Dict,
                               session_id: Optional[str] = None):
        """Update user preferences in current session."""
        session_id = session_id or self.current_session_id
        if not session_id or session_id not in self.sessions:
            return

        self.sessions[session_id]['user_preferences'].update(preferences)
        self._save_to_disk()
        logger.info(f"Updated user preferences for session {session_id}")

    def set_context_variable(self, key: str, value: any,
                            session_id: Optional[str] = None):
        """Set a context variable for conversation state."""
        session_id = session_id or self.current_session_id
        if not session_id or session_id not in self.sessions:
            return

        self.sessions[session_id]['context_variables'][key] = value
        self._save_to_disk()

    def get_context_variables(self, session_id: Optional[str] = None) -> Dict:
        """Get all context variables for a session."""
        session_id = session_id or self.current_session_id
        if not session_id or session_id not in self.sessions:
            return {}

        return self.sessions[session_id]['context_variables'].copy()

    def get_interaction_patterns(self, user_id: str) -> Dict:
        """
        Analyze user's interaction patterns across sessions.

        Returns patterns useful for personalization:
        - Most common topics
        - Preferred response length
        - Time-of-day patterns
        - Interaction frequency
        """
        user_sessions = [
            s for sid, s in self.sessions.items()
            if s['user_id'] == user_id
        ]

        if not user_sessions:
            return {}

        all_interactions = []
        for session in user_sessions:
            all_interactions.extend(session['interactions'])

        patterns = {
            'total_interactions': len(all_interactions),
            'avg_interactions_per_session': len(all_interactions) / len(user_sessions),
            'preferred_tone': self._infer_preferred_tone(all_interactions),
            'preferred_length': self._infer_preferred_length(all_interactions),
            'topic_distribution': self._extract_topics(all_interactions),
            'interaction_times': self._analyze_interaction_times(all_interactions)
        }

        return patterns

    def _infer_preferred_tone(self, interactions: List[Dict]) -> str:
        """Infer user's preferred communication tone from history."""
        if not interactions:
            return "balanced"

        # Look at metadata from recent interactions
        tone_scores = {'friendly': 0, 'strict': 0, 'coach': 0}
        for interaction in interactions[-20:]:  # Last 20 interactions
            metadata = interaction.get('metadata', {})
            if 'tone_preference' in metadata:
                tone = metadata['tone_preference']
                if tone in tone_scores:
                    tone_scores[tone] += 1

        if not sum(tone_scores.values()):
            return "balanced"

        best_tone = max(tone_scores, key=tone_scores.get)
        return best_tone if tone_scores[best_tone] > 0 else "balanced"

    def _infer_preferred_length(self, interactions: List[Dict]) -> str:
        """Infer user's preferred response length."""
        if not interactions:
            return "balanced"

        lengths = [
            len(interaction['assistant_response'].split())
            for interaction in interactions[-20:]
        ]

        avg_length = sum(lengths) / len(lengths) if lengths else 0

        if avg_length < 50:
            return "short"
        elif avg_length > 200:
            return "long"
        else:
            return "balanced"

    def _extract_topics(self, interactions: List[Dict]) -> Dict[str, int]:
        """Extract topic distribution from user messages."""
        topics = {}
        keywords = {
            'sleep': ['sleep', 'rest', 'bed', 'nap'],
            'exercise': ['exercise', 'workout', 'run', 'walk', 'gym', 'activity'],
            'stress': ['stress', 'anxiety', 'relax', 'calm'],
            'nutrition': ['eat', 'food', 'drink', 'hydration', 'diet'],
            'health': ['health', 'condition', 'symptom', 'pain'],
        }

        for interaction in interactions:
            message = interaction['user_message'].lower()
            for topic, words in keywords.items():
                if any(word in message for word in words):
                    topics[topic] = topics.get(topic, 0) + 1

        return topics

    def _analyze_interaction_times(self, interactions: List[Dict]) -> Dict:
        """Analyze when user typically interacts (time-of-day patterns)."""
        hours = {}
        for interaction in interactions:
            timestamp = interaction['timestamp']
            try:
                dt = datetime.fromisoformat(timestamp)
                hour = dt.hour
                hours[hour] = hours.get(hour, 0) + 1
            except:
                continue

        if not hours:
            return {}

        most_active_hour = max(hours, key=hours.get)
        return {
            'most_active_hour': most_active_hour,
            'hour_distribution': hours,
            'typical_time': f"{most_active_hour}:00"
        }

    def cleanup_old_sessions(self, days_old: int = 30):
        """Remove conversation sessions older than specified days."""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        sessions_to_remove = []

        for session_id, session in self.sessions.items():
            created_at = datetime.fromisoformat(session['created_at'])
            if created_at < cutoff_date:
                sessions_to_remove.append(session_id)

        for session_id in sessions_to_remove:
            del self.sessions[session_id]

        logger.info(f"Cleaned up {len(sessions_to_remove)} old sessions")
        self._save_to_disk()
