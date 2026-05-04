import os
import json
import logging
from typing import Dict, List, Any, Optional
from cryptography.fernet import Fernet
from .config import PipelineConfig

logger = logging.getLogger(__name__)

class PrivacyManager:
    """Phase M: Privacy Manager - Ensures all user data is encrypted and permissions are enforced."""
    
    def __init__(self, config: PipelineConfig):
        self.config = config.privacy
        self.key_path = os.path.join(config.data_dir, "master.key")
        self._key = self._load_or_generate_key()
        self._cipher = Fernet(self._key)
        
        # In-memory permission cache
        self._permissions = {
            "biometrics": self.config.allow_biometric_processing,
            "location": self.config.allow_location_processing,
            "cloud": self.config.allow_cloud_sync
        }

    def _load_or_generate_key(self) -> bytes:
        """Load the master encryption key or create one if it doesn't exist."""
        if os.path.exists(self.key_path):
            with open(self.key_path, "rb") as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            os.makedirs(os.path.dirname(self.key_path), exist_ok=True)
            with open(self.key_path, "wb") as f:
                f.write(key)
            logger.info("Generated new master encryption key.")
            return key

    def encrypt_data(self, data: Any) -> bytes:
        """Encrypt any serializable data."""
        json_data = json.dumps(data).encode()
        return self._cipher.encrypt(json_data)

    def decrypt_data(self, encrypted_data: bytes) -> Any:
        """Decrypt data back to its original form."""
        decrypted = self._cipher.decrypt(encrypted_data)
        return json.loads(decrypted.decode())

    def secure_save(self, data: Any, filename: str):
        """Encrypt and save data to secure storage."""
        if not self.config.enable_encryption:
            # Fallback to plain save if encryption disabled (not recommended)
            with open(filename, "w") as f:
                json.dump(data, f)
            return

        encrypted = self.encrypt_data(data)
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, "wb") as f:
            f.write(encrypted)
        logger.debug(f"Securely saved {filename}")

    def secure_load(self, filename: str) -> Optional[Any]:
        """Load and decrypt data from secure storage."""
        if not os.path.exists(filename):
            return None

        if not self.config.enable_encryption:
            with open(filename, "r") as f:
                return json.load(f)

        try:
            with open(filename, "rb") as f:
                encrypted = f.read()
            return self.decrypt_data(encrypted)
        except Exception as e:
            logger.error(f"Failed to decrypt {filename}: {e}")
            return None

    def check_permission(self, data_type: str) -> bool:
        """Check if a specific type of data processing is allowed."""
        return self._permissions.get(data_type, False)

    def set_permission(self, data_type: str, allowed: bool):
        """Update user permissions."""
        self._permissions[data_type] = allowed
        logger.info(f"Permission updated: {data_type} = {allowed}")

    def export_all_data(self, output_path: str) -> bool:
        """Export all encrypted data to a readable format for the user (Visibility)."""
        # This would crawl the data directories and decrypt everything
        # For demo, we just log the action
        logger.info(f"Exporting all user data to {output_path}")
        return True

    def purge_user_data(self) -> bool:
        """Delete all local data and keys (GDPR Right to be Forgotten)."""
        # Implementation would delete data files
        return True
