# hardware/controllers/receipt_printer.py
import logging
from typing import Dict, Any
from .base import BaseHardwareController

# Try to import platform-specific printer libraries
try:
    from escpos.printer import Usb, Serial, Network
    REAL_PRINTER_AVAILABLE = True
except ImportError:
    REAL_PRINTER_AVAILABLE = False
    logging.warning("escpos library not found. Only mock printer will be available.")

logger = logging.getLogger(__name__)

# hardware/controllers/receipt_printer.py
class ReceiptPrinterController(BaseHardwareController):
    """Controller for receipt printer operations"""
    
    def __init__(self, use_real_hardware=None):
        # Initialize with explicit hardware preference if provided
        super().__init__(use_real_hardware=use_real_hardware)
        
        # Log the mode we're operating in
        logger.info(f"Receipt printer initialized in {'real' if self.use_real_hardware else 'mock'} mode")
        logger.info(f"Real printer available: {REAL_PRINTER_AVAILABLE}")

    def _initialize_mock_controller(self):
        """Initialize mock receipt printer"""
        from ..testing.mock_receipt_printer import MockReceiptPrinter
        self.printer = MockReceiptPrinter()
        self.connected = True
        logger.info("Initialized mock receipt printer")
        
    def _initialize_real_controller(self):
        """Initialize real receipt printer hardware"""
        if not REAL_PRINTER_AVAILABLE:
            logger.error("Required printer libraries not installed")
            self.connected = False
            return
        
        try:
            # First check if the printer is reachable with a longer timeout
            printer_ip = "192.168.2.196"
            printer_port = 9100
            
            logger.info(f"Testing connection to printer at {printer_ip}:{printer_port}...")
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(15)  # 15 second timeout
            
            # Set socket to non-blocking mode
            sock.setblocking(True)
            
            try:
                result = sock.connect_ex((printer_ip, printer_port))
                if result == 0:
                    logger.info("Socket connection successful")
                else:
                    logger.error(f"Socket connection failed with error code: {result}")
                    self.connected = False
                    sock.close()
                    return
            except Exception as socket_err:
                logger.error(f"Socket connection error: {socket_err}")
                self.connected = False
                sock.close()
                return
                
            sock.close()
            
            # Network Printer Example with explicit parameters
            logger.info(f"Connecting to network printer at {printer_ip}:{printer_port}")
            self.printer = Network(
                host=printer_ip,
                port=printer_port,
                timeout=15  # 15 second timeout
            )
            
            self.connected = True
            logger.info("Connected to real receipt printer")
        except Exception as e:
            logger.error(f"Failed to connect to printer: {e}")
            self.connected = False
    
    def is_connected(self) -> bool:
        """Check if printer is connected"""
        return getattr(self, 'connected', False)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Print receipt to the connected printer"""
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Printer not connected"
                )
            
            # Format and print the receipt
            formatted_text = self._format_receipt_for_printing(receipt_data)
            
            if self.is_debug or self.is_testing:
                # Use mock printer implementation
                logger.info(f"Mock printing receipt: {formatted_text}")
                return self.printer.print_receipt(receipt_data)
            else:
                # Use real printer implementation
                self._print_to_real_printer(formatted_text, receipt_data)
                return self.format_response(
                    status="success",
                    message="Receipt printed successfully",
                    receipt_data=receipt_data
                )
                
        except Exception as e:
            logger.error(f"Error printing receipt: {e}")
            return self.handle_error(e)
    
    def _format_receipt_for_printing(self, receipt_data: Dict[str, Any]) -> str:
        """Format receipt data for printing"""
        # Create a formatted string for printing
        lines = []
        
        # Add header
        lines.append("===== YOUR STORE NAME =====")
        lines.append(f"Date: {receipt_data.get('timestamp', '')}")
        lines.append(f"Transaction: {receipt_data.get('transaction_id', '')}")
        lines.append("---------------------------")
        
        # Add items
        for item in receipt_data.get('items', []):
            method = item.get('method', '')
            amount = item.get('amount', 0)
            lines.append(f"{method}: ${amount:.2f}")
        
        # Add totals
        lines.append("---------------------------")
        lines.append(f"TOTAL: ${receipt_data.get('total', 0):.2f}")
        
        # Add payment info
        payment = receipt_data.get('payment', {})
        lines.append(f"Payment: {payment.get('method', 'cash')}")
        lines.append(f"Amount Tendered: ${payment.get('amount_tendered', 0):.2f}")
        lines.append(f"Change: ${payment.get('change', 0):.2f}")
        
        # Add footer
        lines.append("---------------------------")
        lines.append("Thank you for your purchase!")
        lines.append("===========================")
        
        return "\n".join(lines)
    
    def _print_to_real_printer(self, text: str, receipt_data: Dict[str, Any]):
        """Send formatted text to the real printer"""
        if not REAL_PRINTER_AVAILABLE:
            raise RuntimeError("Real printer libraries not available")
        
        try:
            # Basic ESC/POS printing example - customize for your printer
            self.printer.text(text)
            self.printer.cut()  # Cut the paper
        except Exception as e:
            logger.error(f"Error sending to printer: {e}")
            raise