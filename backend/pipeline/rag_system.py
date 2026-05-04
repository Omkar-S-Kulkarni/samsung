"""
RAG Memory System
==================
FAISS-based retrieval-augmented generation memory for health patterns.
Stores past user states as embeddings for contextual retrieval.
Designed for on-device operation with minimal memory footprint.
"""

import json
import logging
import os
import time
from typing import Dict, List, Optional, Tuple

import numpy as np

from .config import PipelineConfig

logger = logging.getLogger(__name__)


class HealthMemory:
    """
    On-device RAG memory system using FAISS for fast similarity search.
    Stores health state snapshots as embeddings for pattern matching.
    Falls back to numpy-based cosine similarity if FAISS unavailable.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.embedding_dim = config.model.embedding_dim
        self.max_entries = config.model.max_memory_entries
        self.top_k = config.model.rag_top_k

        # Storage
        self.entries: List[Dict] = []  # Metadata for each entry
        self.embeddings: Optional[np.ndarray] = None
        self.index = None
        self.use_faiss = False

        self._init_index()

    def _init_index(self):
        """Initialize FAISS index if available, otherwise use numpy fallback."""
        try:
            import faiss
            self.index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product (cosine with normalized vecs)
            self.use_faiss = True
            logger.info("FAISS index initialized for RAG memory")
        except ImportError:
            logger.info("FAISS not available — using numpy cosine similarity fallback")
            self.embeddings = np.empty((0, self.embedding_dim), dtype=np.float32)
            self.use_faiss = False

    def _get_embedding(self, text: str) -> np.ndarray:
        """
        Get embedding for text using local embedding model (Ollama).
        Falls back to simple hash-based embedding if Ollama unavailable.
        """
        try:
            import requests
            response = requests.post(
                "http://localhost:11434/api/embeddings",
                json={"model": self.config.model.embedding_model, "prompt": text},
                timeout=5
            )
            if response.status_code == 200:
                embedding = np.array(response.json()["embedding"], dtype=np.float32)
                # Normalize for cosine similarity
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding /= norm
                return embedding
        except Exception as e:
            logger.debug(f"Ollama embedding unavailable: {e}")

        # Fallback: deterministic hash-based embedding
        return self._hash_embedding(text)

    def _hash_embedding(self, text: str) -> np.ndarray:
        """
        Deterministic hash-based embedding fallback.
        Uses character-level hashing to produce a fixed-size vector.
        Not semantically meaningful but preserves exact-match capability.
        """
        import hashlib
        # Create a seed from text hash
        hash_bytes = hashlib.sha256(text.encode()).digest()
        seed = int.from_bytes(hash_bytes[:4], 'big')
        rng = np.random.RandomState(seed)
        embedding = rng.randn(self.embedding_dim).astype(np.float32)
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding /= norm
        return embedding

    def store(self, health_state: Dict, summary: str, user_id: str = "default", 
              importance: Optional[float] = None, tier: str = "short-term"):
        """
        Store a health state snapshot with its embedding in memory.
        
        Args:
            health_state: Dict of current health metrics
            summary: Text description of the health state
            user_id: User identifier
            importance: Optional importance score (0-1)
            tier: Memory tier ('short-term', 'long-term', 'event')
        """
        if importance is None:
            importance = self._calculate_importance(health_state)

        entry = {
            "user_id": user_id,
            "timestamp": time.time(),
            "health_state": health_state.copy() if isinstance(health_state, dict) else health_state,
            "summary": summary,
            "importance_score": float(importance),
            "tier": tier,
        }

        embedding = self._get_embedding(summary)

        if self.use_faiss:
            self.index.add(embedding.reshape(1, -1))
        else:
            self.embeddings = np.vstack([self.embeddings, embedding.reshape(1, -1)])

        self.entries.append(entry)

        # Hierarchical Management: Move important STM to LTM
        self._manage_hierarchical_memory()

        logger.debug(f"Stored {tier} memory for {user_id}, importance: {importance:.2f}")

    def _calculate_importance(self, state: Dict) -> float:
        """Calculate importance score based on health significance."""
        score = 0.1  # Base importance
        
        # Anomaly flags increase importance significantly
        if state.get("anomaly_score", 0) > 0:
            score += 0.4 * min(state["anomaly_score"], 2.0)
            
        # Critical alerts make it high importance
        if "CRITICAL" in str(state.get("alerts", "")):
            score += 0.5
            
        # High risk scores
        if state.get("risk_score", 0) > 70:
            score += 0.3
            
        return min(1.0, score)

    def _manage_hierarchical_memory(self):
        """Manage memory tiers and limits."""
        # Split by tier
        stm = [e for e in self.entries if e["tier"] == "short-term"]
        ltm = [e for e in self.entries if e["tier"] == "long-term"]
        events = [e for e in self.entries if e["tier"] == "event"]
        
        # 1. STM Limit
        if len(stm) > self.config.memory.short_term_limit:
            # Move important STM to LTM, discard others
            for entry in stm[:-self.config.memory.short_term_limit]:
                if entry["importance_score"] >= self.config.memory.importance_threshold:
                    entry["tier"] = "long-term"
                    ltm.append(entry)
            stm = stm[-self.config.memory.short_term_limit:]
            
        # 2. LTM Limit
        if len(ltm) > self.config.memory.long_term_limit:
            # Sort by importance and keep best
            ltm = sorted(ltm, key=lambda x: x["importance_score"], reverse=True)[:self.config.memory.long_term_limit]
            
        # Re-assemble entries
        self.entries = events + ltm + stm
        
        # For simplicity in this phase, we rebuild if entries were removed
        # but in a production system we'd use a more efficient index.
        if self.use_faiss:
             self._init_index()
             all_embeddings = np.array([self._get_embedding(e["summary"]) for e in self.entries])
             if len(all_embeddings) > 0:
                 self.index.add(all_embeddings)
        elif self.embeddings is not None:
             self.embeddings = np.array([self._get_embedding(e["summary"]) for e in self.entries])

    def apply_decay(self):
        """Apply importance decay to all entries."""
        for entry in self.entries:
            # Events don't decay
            if entry.get("tier") == "event":
                continue
                
            entry["importance_score"] *= (1 - self.config.memory.decay_rate)
            
        # Remove entries that fell below absolute minimum
        self.entries = [e for e in self.entries if e.get("importance_score", 0) > 0.05 or e.get("tier") == "event"]
        self._manage_hierarchical_memory()

    def summarize_memories(self, user_id: str):
        """Consolidate old memories into thematic summaries."""
        # Get LTM older than window
        cutoff = time.time() - (self.config.memory.summarization_window_days * 86400)
        old_ltm = [e for e in self.entries if e.get("tier") == "long-term" and e.get("timestamp", 0) < cutoff]
        
        if len(old_ltm) < 5:
            return
            
        # Simple template-based consolidation
        summary_text = f"Consolidated summary of {len(old_ltm)} past interactions: "
        summary_text += "; ".join([e["summary"] for e in old_ltm[:5]])
        
        # Store as new event memory
        self.store(
            health_state={}, 
            summary=summary_text, 
            user_id=user_id, 
            importance=0.6, 
            tier="event"
        )
        
        # Remove old ones
        old_timestamps = [e["timestamp"] for e in old_ltm]
        self.entries = [e for e in self.entries if e.get("timestamp") not in old_timestamps]
        self._manage_hierarchical_memory()

    def retrieve(self, query: str, user_id: Optional[str] = None,
                 top_k: Optional[int] = None, include_temporal: bool = True) -> List[Dict]:
        """
        Retrieve memories using semantic + temporal weighting.
        """
        k = top_k or self.top_k
        if len(self.entries) == 0:
            return []

        query_embedding = self._get_embedding(query)

        if self.use_faiss:
            # FAISS search returns top K semantically similar
            # We search more than K to allow temporal re-ranking
            search_k = min(k * 3, len(self.entries))
            scores, indices = self.index.search(query_embedding.reshape(1, -1), search_k)
            scores = scores[0]
            indices = indices[0]
        else:
            similarities = np.dot(self.embeddings, query_embedding)
            indices = np.argsort(similarities)[::-1]
            scores = similarities[indices]

        results = []
        now = time.time()
        for idx, s_score in zip(indices, scores):
            if idx < 0 or idx >= len(self.entries):
                continue
            
            entry = self.entries[idx].copy()
            if user_id and entry["user_id"] != user_id:
                continue
                
            # Hybrid Score = Semantic + Temporal + Importance
            final_score = float(s_score)
            
            if include_temporal:
                time_diff = (now - entry["timestamp"]) / 86400 # days
                temporal_decay = np.exp(-0.1 * time_diff) # decay over days
                final_score = (final_score * 0.5) + (temporal_decay * 0.3) + (entry["importance_score"] * 0.2)
            
            entry["similarity_score"] = float(s_score)
            entry["hybrid_score"] = final_score
            results.append(entry)

        # Re-sort by hybrid score
        results = sorted(results, key=lambda x: x.get("hybrid_score", 0), reverse=True)
        return results[:k]

    def _evict_oldest(self):
        """Remove oldest entries to stay within memory limit."""
        excess = len(self.entries) - self.max_entries
        if excess <= 0:
            return

        self.entries = self.entries[excess:]
        if self.use_faiss:
            # Rebuild index (FAISS doesn't support deletion on FlatIP)
            import faiss
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            if self.entries:
                all_embeddings = np.array([
                    self._get_embedding(e["summary"]) for e in self.entries
                ])
                self.index.add(all_embeddings)
        else:
            self.embeddings = self.embeddings[excess:]

    def get_user_patterns(self, user_id: str, days: int = 7) -> List[Dict]:
        """Get recent patterns for a specific user."""
        cutoff = time.time() - (days * 86400)
        return [e for e in self.entries
                if e["user_id"] == user_id and e["timestamp"] >= cutoff]

    def save(self, path: str):
        """Persist memory to disk."""
        os.makedirs(path, exist_ok=True)
        with open(os.path.join(path, "rag_entries.json"), "w") as f:
            # Convert numpy values to Python types for JSON serialization
            serializable_entries = []
            for entry in self.entries:
                se = entry.copy()
                se["health_state"] = {
                    k: float(v) if isinstance(v, (np.floating, np.integer)) else v
                    for k, v in entry["health_state"].items()
                }
                serializable_entries.append(se)
            json.dump(serializable_entries, f, indent=2, default=str)

        if not self.use_faiss and self.embeddings is not None:
            np.save(os.path.join(path, "rag_embeddings.npy"), self.embeddings)

        logger.info(f"RAG memory saved to {path} ({len(self.entries)} entries)")

    def load(self, path: str):
        """Load memory from disk."""
        entries_path = os.path.join(path, "rag_entries.json")
        if os.path.exists(entries_path):
            with open(entries_path, "r") as f:
                self.entries = json.load(f)

            embeddings_path = os.path.join(path, "rag_embeddings.npy")
            if os.path.exists(embeddings_path) and not self.use_faiss:
                self.embeddings = np.load(embeddings_path)

            logger.info(f"RAG memory loaded: {len(self.entries)} entries")

    def get_stats(self) -> Dict:
        """Return memory statistics."""
        return {
            "total_entries": len(self.entries),
            "users": len(set(e["user_id"] for e in self.entries)),
            "use_faiss": self.use_faiss,
            "embedding_dim": self.embedding_dim,
        }
