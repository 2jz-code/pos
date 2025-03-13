# hardware/testing/mock_receipt_printer.py
import time
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MockReceiptPrinter:
    """Mock implementation of a receipt printer for testing"""
    
    def __init__(self, connected=True):
        self.connected = connected
        self.simulation_mode = 'normal'
        self.last_print_time = None
    
    def set_simulation_mode(self, mode):
        """Set simulation mode for testing different scenarios"""
        valid_modes = ['normal', 'error', 'delay', 'disconnect']
        if mode not in valid_modes:
            raise ValueError(f"Invalid simulation mode. Must be one of: {valid_modes}")
        self.simulation_mode = mode
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate printing a receipt"""
        if not self.connected:
            return {
                "status": "error",
                "message": "Printer not connected"
            }

        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Printer error simulation"
            }
        elif self.simulation_mode == 'delay':
            time.sleep(2)
        
        # Format receipt data
        formatted_receipt = {
            "timestamp": datetime.now().isoformat(),
            "transaction_id": f"TXN-{int(time.time())}",
            "items": receipt_data.get("items", []),
            "total": receipt_data.get("total", 0),
            "payment": {
                "method": receipt_data.get("payment_method", "cash"),
                "amount_tendered": receipt_data.get("amount_tendered", 0),
                "change": receipt_data.get("change", 0)
            }
        }
        
        self.last_print_time = datetime.now()
        
        # Log what would be printed in a real scenario
        logger.info(f"MOCK PRINTER - Would print receipt: {formatted_receipt}")
        
        return {
            "status": "success",
            "message": "Receipt printed successfully",
            "receipt_data": formatted_receipt
        }