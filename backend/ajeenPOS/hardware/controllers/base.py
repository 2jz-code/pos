# hardware/controllers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.conf import settings

class BaseHardwareController(ABC):
    """
    Abstract base class for hardware controllers defining common interface
    and shared functionality.
    """
    
    def __init__(self):
        self.is_debug = settings.DEBUG
        self.is_testing = getattr(settings, 'TESTING', False)
        self._initialize_controller()

    def _initialize_controller(self):
        """Initialize the appropriate controller based on environment"""
        if self.is_debug or self.is_testing:
            self._initialize_mock_controller()
        else:
            self._initialize_real_controller()

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