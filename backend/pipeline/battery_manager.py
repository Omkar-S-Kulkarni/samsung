import logging
from .config import PipelineConfig

logger = logging.getLogger(__name__)

class BatteryManager:
    """Phase H: Battery-Aware Edge Optimization - Monitors and manages power usage."""
    
    def __init__(self, config: PipelineConfig):
        self.config = config.battery
        self._battery_level = 100 # Default to full

    @property
    def battery_level(self) -> int:
        return self._battery_level

    @battery_level.setter
    def battery_level(self, value: int):
        self._battery_level = max(0, min(100, value))
        logger.debug(f"Battery level updated to {self._battery_level}%")

    def get_battery_level(self) -> int:
        """In a real wearable, this would call hardware APIs (e.g. psutil or sysfs)."""
        return self.battery_level

    def is_power_critical(self) -> bool:
        """Check if battery is below critical threshold."""
        return self.battery_level < self.config.battery_critical_threshold

    def is_power_low(self) -> bool:
        """Check if battery is below low threshold."""
        return self.battery_level < self.config.battery_low_threshold
