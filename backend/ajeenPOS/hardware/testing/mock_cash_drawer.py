# hardware/testing/mock_cash_drawer.py
import time
from datetime import datetime

class MockCashDrawerController:
    def __init__(self, connected=True):
        self.connected = connected
        self.simulation_mode = 'normal'
        self.drawer_state = "closed"
        self.last_print_time = None
        self.printer_connected = True

    def set_simulation_mode(self, mode):
        """Set simulation mode for testing different scenarios"""
        valid_modes = ['normal', 'error', 'delay', 'disconnect']
        if mode not in valid_modes:
            raise ValueError(f"Invalid simulation mode. Must be one of: {valid_modes}")
        self.simulation_mode = mode

    def open_cash_drawer(self):
        """Simulate opening the cash drawer"""
        if not self.connected:
            return {
                "status": "error",
                "message": "Cash drawer not connected"
            }

        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Hardware error simulation"
            }
        elif self.simulation_mode == 'delay':
            time.sleep(2)
        
        self.drawer_state = "open"
        return {
            "status": "success",
            "message": "Cash drawer opened"
        }
    
    def close_cash_drawer(self):
        """Simulate closing the cash drawer"""
        if not self.connected:
            return {
                "status": "error",
                "message": "Cash drawer not connected"
            }

        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Hardware error simulation"
            }
            
        self.drawer_state = "closed"
        return {
            "status": "success",
            "message": "Cash drawer closed"
        }
    
    def get_drawer_state(self):
        """Get the current state of the cash drawer"""
        if not self.connected:
            return {
                "status": "error",
                "message": "Cash drawer not connected",
                "state": "unknown"
            }
        
        return {
            "status": "success",
            "state": self.drawer_state
        }
    
    def format_receipt(self, transaction_data):
        """Format receipt data for printing"""
        return {
            "timestamp": datetime.now().isoformat(),
            "transaction_id": f"TXN-{int(time.time())}",
            "items": transaction_data.get("items", []),
            "total": transaction_data.get("total", 0),
            "payment": {
                "method": transaction_data.get("payment_method", "cash"),
                "amount_tendered": transaction_data.get("amount_tendered", 0),
                "change": transaction_data.get("change", 0)
            }
        }

    def print_receipt(self, receipt_data):
        """Simulate printing a receipt"""
        if not self.printer_connected:
            return {
                "status": "error",
                "message": "Printer not connected"
            }

        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Printer error simulation"
            }
        
        formatted_receipt = self.format_receipt(receipt_data)
        self.last_print_time = datetime.now()
        return {
            "status": "success",
            "message": "Receipt printed successfully",
            "receipt_data": formatted_receipt
        }