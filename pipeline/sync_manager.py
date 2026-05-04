import os
import json
import logging
import time
import requests
from typing import Dict, List, Any, Optional
from .config import PipelineConfig

logger = logging.getLogger(__name__)

class SyncManager:
    """Phase N: Cross-Device Intelligence - Synchronizes state across wearable and phone."""
    
    def __init__(self, config: PipelineConfig):
        self.config = config.sync
        self.battery_config = config.battery
        self.sync_queue_path = os.path.join(config.data_dir, "sync_queue.json")
        self.queue: List[Dict] = self._load_queue()
        
    def _load_queue(self) -> List[Dict]:
        if os.path.exists(self.sync_queue_path):
            with open(self.sync_queue_path, "r") as f:
                return json.load(f)
        return []

    def _save_queue(self):
        with open(self.sync_queue_path, "w") as f:
            json.dump(self.queue, f)

    def enqueue_sync(self, action: str, data: Any):
        """Add a synchronization task to the offline-first queue."""
        item = {
            "action": action,
            "data": data,
            "timestamp": time.time(),
            "retry_count": 0
        }
        self.queue.append(item)
        self._save_queue()
        logger.debug(f"Enqueued sync action: {action}")
        
        # Trigger immediate sync attempt in background
        self.process_sync_queue()

    def process_sync_queue(self):
        """Attempt to send queued items to the phone."""
        if not self.queue or not self.config.enable_sync:
            return

        logger.info(f"Attempting to sync {len(self.queue)} items to phone...")
        
        remaining_items = []
        for item in self.queue:
            try:
                # Simulated sync call
                response = requests.post(
                    f"{self.config.phone_endpoint}/sync",
                    json=item,
                    timeout=2
                )
                if response.status_code != 200:
                    item["retry_count"] += 1
                    remaining_items.append(item)
            except Exception:
                item["retry_count"] += 1
                remaining_items.append(item)

        self.queue = remaining_items
        self._save_queue()

    def should_offload_task(self, complexity_score: int, battery_level: int) -> bool:
        """Determine if a heavy task (like LLM reasoning) should be offloaded to the phone."""
        if not self.config.enable_task_offloading:
            return False
            
        # Offload if battery is low
        if battery_level < self.config.offload_threshold_battery:
            logger.info("Offloading task: Low battery on wearable.")
            return True
            
        # Offload if task is too complex for wearable
        if complexity_score > self.config.offload_threshold_complexity:
            logger.info(f"Offloading task: High complexity ({complexity_score}).")
            return True
            
        return False

    def offload_task(self, task_type: str, payload: Dict) -> Optional[Dict]:
        """Send a task to the phone for execution."""
        try:
            logger.info(f"Offloading {task_type} to phone...")
            response = requests.post(
                f"{self.config.phone_endpoint}/execute",
                json={"task": task_type, "payload": payload},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Task offloading failed: {e}. Falling back to local execution.")
            
        return None

    def sync_memory_entry(self, entry: Dict):
        """Specifically sync a new RAG memory entry to ensure cross-device consistency."""
        self.enqueue_sync("add_memory", entry)
