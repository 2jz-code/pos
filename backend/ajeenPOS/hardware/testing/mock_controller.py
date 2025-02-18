# hardware/testing/mock_controller.py
import time
from datetime import datetime

class MockHardwareController:
    def __init__(self, connected=True):
        self.cash_drawer_connected = connected
        self.simulation_mode = 'normal'
        self.drawer_state = "closed"
        self.last_print_time = None
    
    def open_cash_drawer(self):
        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Hardware error simulation"
            }
        elif self.simulation_mode == 'delay':
            time.sleep(2)
            
        if not self.cash_drawer_connected:
            return {
                "status": "error",
                "message": "Cash drawer not connected"
            }
        
        self.drawer_state = "open"
        return {
            "status": "success",
            "message": "Cash drawer opened"
        }
    
    def close_cash_drawer(self):
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
        return {
            "status": "success",
            "state": self.drawer_state
        }
    
    def print_receipt(self, receipt_data):
        if self.simulation_mode == 'error':
            return {
                "status": "error",
                "message": "Printer error simulation"
            }
        
        self.last_print_time = datetime.now()
        return {
            "status": "success",
            "message": "Receipt printed successfully"
        }