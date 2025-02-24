# hardware/controllers/cash_drawer.py
from typing import Dict, Any
from .base import BaseHardwareController
from ..testing.mock_cash_drawer import MockCashDrawerController

class CashDrawerController(BaseHardwareController):
    """
    Controller for cash drawer operations. Handles both real hardware
    and mock implementations for testing/development.
    """
    
    def _initialize_mock_controller(self):
        """Initialize mock cash drawer controller"""
        self.controller = MockCashDrawerController()
        self.printer_enabled = True

    def _initialize_real_controller(self):
        """Initialize real cash drawer hardware"""
        # TODO: Implement real hardware integration
        raise NotImplementedError("Real hardware integration not implemented")

    def is_connected(self) -> bool:
        """Check if cash drawer is connected and ready"""
        return getattr(self.controller, 'connected', False)

    def open_cash_drawer(self) -> Dict[str, Any]:
        """
        Open the cash drawer
        
        Returns:
            Dict containing operation result
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Cash drawer not connected"
                )
            
            return self.controller.open_cash_drawer()
        except Exception as e:
            return self.handle_error(e)

    def close_cash_drawer(self) -> Dict[str, Any]:
        """
        Close the cash drawer
        
        Returns:
            Dict containing operation result
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Cash drawer not connected"
                )
            
            return self.controller.close_cash_drawer()
        except Exception as e:
            return self.handle_error(e)

    def get_drawer_state(self) -> Dict[str, Any]:
        """
        Get current state of the cash drawer
        
        Returns:
            Dict containing drawer state
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Cash drawer not connected",
                    state="unknown"
                )
            
            return self.controller.get_drawer_state()
        except Exception as e:
            return self.handle_error(e)

    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Print receipt
        
        Args:
            receipt_data: Dictionary containing receipt information
            
        Returns:
            Dict containing print operation result
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Printer not connected"
                )
            
            return self.controller.print_receipt(receipt_data)
        except Exception as e:
            return self.handle_error(e)  