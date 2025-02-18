# hardware/controllers.py
import time
from datetime import datetime

class SimpleHardwareController:
    def __init__(self):
        self.cash_drawer_connected = True
        self.drawer_state = "closed"  # Add drawer state tracking
        self.last_print_time = None
    
    def open_cash_drawer(self):
        if not self.cash_drawer_connected:
            return {"status": "error", "message": "Cash drawer not connected"}
        self.drawer_state = "open"
        return {"status": "success", "message": "Cash drawer opened"}
    
    def close_cash_drawer(self):
        if not self.cash_drawer_connected:
            return {"status": "error", "message": "Cash drawer not connected"}
        self.drawer_state = "closed"
        return {"status": "success", "message": "Cash drawer closed"}
    
    def get_drawer_state(self):
        return {"status": "success", "state": self.drawer_state}
    
    def print_receipt(self, receipt_data):
        self.last_print_time = datetime.now()
        return {"status": "success", "message": "Receipt printed successfully"}