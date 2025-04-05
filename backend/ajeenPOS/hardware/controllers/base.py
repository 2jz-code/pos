# hardware/controllers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BaseHardwareController(ABC):
    """
    Abstract base class for hardware controllers defining common interface
    and shared functionality.
    """
    
    def __init__(self, hardware_type=None):
        """
        Initialize controller with option to override hardware type
        
        Args:
            hardware_type: Type of hardware this controller manages
                           (e.g., 'RECEIPT_PRINTER', 'CASH_DRAWER')
        """
        self.hardware_type = hardware_type
        
        # Get global debug settings
        self.is_debug = settings.DEBUG
        self.is_testing = getattr(settings, 'TESTING', False)
        
        # Check for hardware-specific override
        hardware_config = getattr(settings, 'HARDWARE_CONFIG', {})
        use_real_hardware = hardware_config.get('USE_REAL_HARDWARE', {})
        
        # If hardware_type is specified and has an entry in USE_REAL_HARDWARE,
        # override the debug setting
        if hardware_type and hardware_type in use_real_hardware:
            self.use_real_hardware = use_real_hardware[hardware_type]
            if self.use_real_hardware:
                # Log that we're overriding debug mode for this hardware
                logger.info(f"Using REAL hardware for {hardware_type} despite debug mode")
        else:
            # Default: use mock in debug/test mode, real hardware otherwise
            self.use_real_hardware = not (self.is_debug or self.is_testing)
        
        self._initialize_controller()

    def _initialize_controller(self):
        """Initialize the appropriate controller based on configuration"""
        if self.use_real_hardware:
            self._initialize_real_controller()
        else:
            self._initialize_mock_controller()

    @abstractmethod
    def _initialize_mock_controller(self):
        """Initialize mock controller for testing/development"""
        pass

    @abstractmethod
    def _initialize_real_controller(self):
        """Initialize real hardware controller for production"""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if hardware is connected and ready"""
        pass

    def format_response(self, status: str, message: str, **kwargs) -> Dict[str, Any]:
        """
        Standard response formatter for hardware operations
        
        Args:
            status: Operation status ('success', 'error', etc.)
            message: Human-readable message
            **kwargs: Additional response data
            
        Returns:
            Dict containing formatted response
        """
        return {
            "status": status,
            "message": message,
            **kwargs
        }

    def handle_error(self, error: Exception) -> Dict[str, Any]:
        """
        Standardized error handler for hardware operations
        
        Args:
            error: Exception that occurred
            
        Returns:
            Dict containing error response
        """
        return self.format_response(
            status="error",
            message=str(error)
        )