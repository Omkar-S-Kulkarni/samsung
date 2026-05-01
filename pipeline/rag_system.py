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

    def store(self, health_state: Dict, summary: str, user_id: str = "default"):
        """
        Store a health state snapshot with its embedding in memory.

        Args:
            health_state: Dict of current health metrics
            summary: Text description of the health state
            user_id: User identifier for filtering
        """
        entry = {
            "user_id": user_id,
            "timestamp": time.time(),
            "health_state": health_state,
            "summary": summary,
        }

        embedding = self._get_embedding(summary)

        if self.use_faiss:
            self.index.add(embedding.reshape(1, -1))
        else:
            self.embeddings = np.vstack([self.embeddings, embedding.reshape(1, -1)])

        self.entries.append(entry)

        # Evict old entries if over limit
        if len(self.entries) > self.max_entries:
            self._evict_oldest()

        logger.debug(f"Stored health state for {user_id}, total entries: {len(self.entries)}")

    def retrieve(self, query: str, user_id: Optional[str] = None,
                 top_k: Optional[int] = None) -> List[Dict]:
        """
        Retrieve the most similar past health states.

        Args:
            query: Text description of current state
            user_id: Optional filter to only search user's own history
            top_k: Number of results to return

        Returns:
            List of matching entries with similarity scores
        """
        k = top_k or self.top_k
        if len(self.entries) == 0:
            return []

        query_embedding = self._get_embedding(query)

        if self.use_faiss:
            scores, indices = self.index.search(query_embedding.reshape(1, -1), min(k, len(self.entries)))
            scores = scores[0]
            indices = indices[0]
        else:
            # Numpy cosine similarity
            similarities = np.dot(self.embeddings, query_embedding)
            k_actual = min(k, len(similarities))
            indices = np.argsort(similarities)[-k_actual:][::-1]
            scores = similarities[indices]

        results = []
        for idx, score in zip(indices, scores):
            if idx < 0 or idx >= len(self.entries):
                continue
            entry = self.entries[idx].copy()
            entry["similarity_score"] = float(score)

            # Filter by user if requested
            if user_id and entry["user_id"] != user_id:
                continue

            results.append(entry)

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
