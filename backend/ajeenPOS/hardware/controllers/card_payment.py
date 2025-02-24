# hardware/controllers/card_payment.py
from typing import Dict, Any, Optional
from .base import BaseHardwareController
from ..testing.mock_card_reader import MockCardReaderController

class CardPaymentController(BaseHardwareController):
    """
    Controller for card payment operations. Handles both real hardware
    and mock implementations for testing/development.
    """
    
    def _initialize_mock_controller(self):
        """Initialize mock card reader controller"""
        self.controller = MockCardReaderController()

    def _initialize_real_controller(self):
        """Initialize real card reader hardware"""
        # TODO: Implement real hardware integration
        raise NotImplementedError("Real hardware integration not implemented")

    def is_connected(self) -> bool:
        """Check if card reader is connected and ready"""
        return getattr(self.controller, 'connected', False)

    def process_payment(self, amount: float, card_number: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a card payment
        
        Args:
            amount: Payment amount
            card_number: Optional card number for testing
            
        Returns:
            Dict containing payment result
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Card reader not connected"
                )
            
            if card_number:
                return self.controller.process_card_payment(amount, card_number)
            return self.controller.process_card_payment(amount)
        except Exception as e:
            return self.handle_error(e)

    def cancel_payment(self) -> Dict[str, Any]:
        """
        Cancel ongoing payment process
        
        Returns:
            Dict containing operation result
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Card reader not connected"
                )
            
            return self.controller.cancel_payment()
        except Exception as e:
            return self.handle_error(e)

    def get_last_transaction(self) -> Dict[str, Any]:
        """
        Get details of the last transaction
        
        Returns:
            Dict containing transaction details
        """
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Card reader not connected"
                )
            
            return self.controller.get_last_transaction()
        except Exception as e:
            return self.handle_error(e)

    def set_simulation_mode(self, mode: str) -> Dict[str, Any]:
        """
        Set simulation mode for testing
        
        Args:
            mode: Simulation mode to set
            
        Returns:
            Dict containing operation result
        """
        try:
            if not self.is_debug and not self.is_testing:
                return self.format_response(
                    status="error",
                    message="Simulation mode only available in debug/test environment"
                )
            
            self.controller.set_simulation_mode(mode)
            return self.format_response(
                status="success",
                message=f"Simulation mode set to: {mode}"
            )
        except ValueError as e:
            return self.format_response(
                status="error",
                message=str(e)
            )
        except Exception as e:
            return self.handle_error(e)
        


