# hardware/testing/mock_card_reader.py
import time
from datetime import datetime
import random

class MockCardReaderController:
    def __init__(self, connected=True):
        self.connected = connected
        self.simulation_mode = 'normal'
        self.processing_payment = False
        self.last_transaction = None
        
        # Predefined test cards
        self.test_cards = {
            "4111111111111111": {
                "type": "VISA",
                "last_four": "1111",
                "should_decline": False
            },
            "5555555555554444": {
                "type": "MASTERCARD",
                "last_four": "4444",
                "should_decline": False
            },
            "4000000000000002": {
                "type": "VISA",
                "last_four": "0002",
                "should_decline": True  # Test decline card
            }
        }

    def set_simulation_mode(self, mode):
        """Set simulation mode for testing different scenarios"""
        valid_modes = ['normal', 'error', 'delay', 'decline', 'timeout']
        if mode not in valid_modes:
            raise ValueError(f"Invalid simulation mode. Must be one of: {valid_modes}")
        self.simulation_mode = mode

    def _generate_transaction_id(self):
        """Generate a unique transaction ID"""
        return f"CC-{int(time.time())}-{random.randint(1000, 9999)}"

    def process_card_payment(self, amount, card_number="4111111111111111"):
        """Simulate processing a card payment"""
        if not self.connected:
            return {
                "status": "error",
                "message": "Card reader not connected"
            }

        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Card reader error simulation"
            }
        elif self.simulation_mode == 'delay':
            time.sleep(2)
        elif self.simulation_mode == 'decline':
            return {
                "status": "declined",
                "message": "Card declined",
                "code": "DECLINED"
            }
        elif self.simulation_mode == 'timeout':
            time.sleep(31)  # Simulate timeout

        # Get test card data
        card_data = self.test_cards.get(card_number, self.test_cards["4111111111111111"])
        
        if card_data["should_decline"]:
            return {
                "status": "declined",
                "message": "Card declined",
                "code": "DECLINED"
            }

        # Simulate successful payment
        transaction = {
            "status": "success",
            "message": "Payment approved",
            "transaction_id": self._generate_transaction_id(),
            "amount": amount,
            "card_type": card_data["type"],
            "last_four": card_data["last_four"],
            "timestamp": datetime.now().isoformat()
        }
        
        self.last_transaction = transaction
        return transaction

    def cancel_payment(self):
        """Cancel ongoing payment process"""
        if not self.processing_payment:
            return {
                "status": "error",
                "message": "No payment in progress"
            }
        
        self.processing_payment = False
        return {
            "status": "success",
            "message": "Payment cancelled"
        }

    def get_last_transaction(self):
        """Get details of the last transaction"""
        if not self.last_transaction:
            return {
                "status": "error",
                "message": "No previous transaction found"
            }
        
        return {
            "status": "success",
            "transaction": self.last_transaction
        }