# hardware/controllers/receipt_printer.py
import logging
import socket
import time
from typing import Dict, Any
from .base import BaseHardwareController
from ..testing.mock_receipt_printer import MockReceiptPrinter
from django.conf import settings

logger = logging.getLogger(__name__)

class ReceiptPrinterController(BaseHardwareController):
    """Controller for receipt printer operations"""
    
    def __init__(self, hardware_type=None):
        super().__init__(hardware_type='RECEIPT_PRINTER')
        logger.info(f"Receipt Printer Controller initialized, using_real_hardware={self.use_real_hardware}")
        
        # Add additional logging for settings
        config = getattr(settings, 'HARDWARE_CONFIG', {})
        logger.info(f"HARDWARE_CONFIG settings: {config}")
        
        # Log current DEBUG and TESTING settings
        logger.info(f"Django DEBUG={settings.DEBUG}, TESTING={getattr(settings, 'TESTING', False)}")
    
    def _initialize_mock_controller(self):
        """Initialize mock receipt printer"""
        self.printer = MockReceiptPrinter()
        self.connected = True
        logger.info("Initialized mock receipt printer")
        
    # Add this to your ReceiptPrinterController.__init__ method
    def _initialize_real_controller(self):
        """Initialize real receipt printer hardware"""
        try:
            # Get printer settings from config
            config = getattr(settings, 'HARDWARE_CONFIG', {}).get('RECEIPT_PRINTER', {})
            self.printer_ip = config.get('ip', '192.168.2.196')
            self.printer_port = config.get('port', 9100)
            
            logger.info(f"Initializing real printer at {self.printer_ip}:{self.printer_port}")
            
            # Test connection with more detailed error reporting
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            
            try:
                result = sock.connect_ex((self.printer_ip, self.printer_port))
                if result == 0:
                    logger.info("Socket connection successful")
                    self.connected = True
                else:
                    logger.error(f"Socket connection failed with error code: {result}")
                    self.connected = False
                    # Check if printer IP is reachable
                    import subprocess
                    ping_result = subprocess.run(['ping', '-c', '1', self.printer_ip], 
                                                stdout=subprocess.PIPE, 
                                                stderr=subprocess.PIPE)
                    if ping_result.returncode == 0:
                        logger.info(f"Printer IP {self.printer_ip} is reachable but port {self.printer_port} is closed")
                    else:
                        logger.error(f"Printer IP {self.printer_ip} is not reachable")
            except Exception as socket_err:
                logger.error(f"Socket connection error: {socket_err}")
                self.connected = False
            finally:
                sock.close()
                
        except Exception as e:
            logger.error(f"Failed to connect to printer: {e}")
            self.connected = False
    
    def is_connected(self) -> bool:
        """Check if printer is connected"""
        return getattr(self, 'connected', False)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Print receipt to the connected printer"""
        try:
            logger.info(f"Receipt print request received with data: {receipt_data}")
            logger.info(f"Using {'REAL' if self.use_real_hardware else 'MOCK'} printer implementation")
            
            if not self.is_connected():
                logger.error("Printer not connected")
                return self.format_response(
                    status="error",
                    message="Printer not connected"
                )
            
            if not self.use_real_hardware:
                # Use mock printer implementation
                logger.warning("MOCK MODE: Receipt will be simulated, not actually printed")
                return self.printer.print_receipt(receipt_data)
            else:
                # Format receipt for printing
                logger.info("REAL MODE: Formatting receipt for actual printing")
                formatted_receipt = self._format_receipt(receipt_data)
                
                # Send to real printer
                logger.info(f"Sending to printer at {self.printer_ip}:{self.printer_port}")
                success = self._send_to_printer(formatted_receipt)
                
                if success:
                    logger.info("Receipt printed successfully")
                    return self.format_response(
                        status="success",
                        message="Receipt printed successfully",
                        receipt_data=receipt_data
                    )
                else:
                    logger.error("Failed to print receipt")
                    return self.format_response(
                        status="error",
                        message="Failed to print receipt"
                    )
        except Exception as e:
            logger.error(f"Error printing receipt: {e}", exc_info=True)
            return self.handle_error(e)
    
    def _format_receipt(self, receipt_data: Dict[str, Any]) -> bytes:
        """Format receipt data using ESC/POS commands"""
        # ESC/POS commands
        INIT = b'\x1B\x40'  # Initialize printer
        CUT = b'\x1D\x56\x41'  # Paper cut (partial cut)
        FULL_CUT = b'\x1D\x56\x00'  # Full paper cut
        DRAWER_OPEN = b'\x1B\x70\x00\x64\x19'  # Open cash drawer (pin 2, 100ms on, 25ms off)
        ALIGN_CENTER = b'\x1B\x61\x01'  # Center text
        ALIGN_LEFT = b'\x1B\x61\x00'  # Left align text
        DOUBLE_HEIGHT = b'\x1B\x21\x10'  # Double height text
        NORMAL_TEXT = b'\x1B\x21\x00'  # Normal text
        BOLD_ON = b'\x1B\x45\x01'  # Bold on
        BOLD_OFF = b'\x1B\x45\x00'  # Bold off
        LINE_FEED = b'\x0A'  # Line feed
        
        # Start building receipt
        receipt = b''
        
        # Initialize the printer
        receipt += INIT
        
        # Header - centered, bold, and double height
        receipt += ALIGN_CENTER
        receipt += BOLD_ON
        receipt += DOUBLE_HEIGHT
        receipt += "AJEEN RESTAURANT".encode('utf-8') + LINE_FEED
        receipt += NORMAL_TEXT
        receipt += "123 Main Street".encode('utf-8') + LINE_FEED
        receipt += "City, State 12345".encode('utf-8') + LINE_FEED
        receipt += "Tel: (123) 456-7890".encode('utf-8') + LINE_FEED
        receipt += LINE_FEED
        
        # Transaction details
        receipt += ALIGN_LEFT
        receipt += BOLD_OFF
        
        # Order ID and date
        order_id = receipt_data.get('id', 'Unknown')
        timestamp = receipt_data.get('timestamp', time.strftime('%Y-%m-%d %H:%M:%S'))
        
        receipt += f"Order #: {order_id}".encode('utf-8') + LINE_FEED
        receipt += f"Date: {timestamp}".encode('utf-8') + LINE_FEED
        
        # Customer info if available
        if receipt_data.get('customer_name'):
            receipt += f"Customer: {receipt_data.get('customer_name')}".encode('utf-8') + LINE_FEED
        
        receipt += LINE_FEED
        
        # Items - left aligned
        receipt += BOLD_ON
        receipt += "ITEMS".encode('utf-8') + LINE_FEED
        receipt += b'-' * 32 + LINE_FEED
        receipt += BOLD_OFF
        
        # Item rows
        items = receipt_data.get('items', [])
        for item in items:
            name = item.get('product_name', item.get('name', 'Unknown Item'))
            qty = item.get('quantity', 1)
            price = item.get('unit_price', item.get('price', 0.00))
            total = qty * price
            
            # Format: Name x Qty       $Price
            item_text = f"{name} x {qty}".ljust(20)
            price_text = f"${total:.2f}".rjust(12)
            receipt += f"{item_text}{price_text}".encode('utf-8') + LINE_FEED
        
        receipt += b'-' * 32 + LINE_FEED
        
        # Totals
        subtotal = receipt_data.get('subtotal', receipt_data.get('total_price', 0.00))
        tax = receipt_data.get('tax', 0.00)  # Get the tax directly from receipt_data
        total = receipt_data.get('total_amount', receipt_data.get('total_price', 0.00))
        
        receipt += BOLD_ON
        receipt += "Subtotal:".ljust(20).encode('utf-8') + f"${subtotal:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += "Tax:".ljust(20).encode('utf-8') + f"${tax:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += "Total:".ljust(20).encode('utf-8') + f"${total:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += BOLD_OFF
        receipt += LINE_FEED
        
        # Payment information
        payment = receipt_data.get('payment', {})
        payment_method = payment.get('method', payment.get('payment_method', 'cash'))
        
        receipt += f"Payment Method: {payment_method.upper()}".encode('utf-8') + LINE_FEED
        
        # Show amount tendered and change for cash payments
        if payment_method.lower() == 'cash':
            amount_tendered = payment.get('amount_tendered', 0.00)
            change = payment.get('change', 0.00)
            
            receipt += f"Amount Tendered: ${amount_tendered:.2f}".encode('utf-8') + LINE_FEED
            receipt += f"Change: ${change:.2f}".encode('utf-8') + LINE_FEED
        
        # Footer
        receipt += LINE_FEED
        receipt += ALIGN_CENTER
        receipt += "Thank you for your purchase!".encode('utf-8') + LINE_FEED
        receipt += "Please come again".encode('utf-8') + LINE_FEED
        receipt += LINE_FEED
        receipt += LINE_FEED
        
        # Add more line feeds before cutting to ensure enough paper advances
        receipt += LINE_FEED * 5  # Increased from 3 to 5
        
        # Try full cut instead of partial cut
        receipt += FULL_CUT  # Changed from CUT to FULL_CUT
        
        # Open drawer
        if receipt_data.get('open_drawer', True):
            receipt += DRAWER_OPEN
        
        return receipt
    
    def _send_to_printer(self, receipt_data: bytes) -> bool:
        """Send formatted receipt data to the printer"""
        try:
            # Create a socket and connect to the printer
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(5)  # 5 second timeout
            
            logger.info(f"Connecting to printer at {self.printer_ip}:{self.printer_port}")
            s.connect((self.printer_ip, self.printer_port))
            
            # Send receipt data
            logger.info(f"Sending {len(receipt_data)} bytes of receipt data to printer")
            s.sendall(receipt_data)
            
            # Close the connection
            s.close()
            logger.info("Receipt sent successfully")
            
            return True
        except socket.timeout:
            logger.error(f"Timeout connecting to printer at {self.printer_ip}:{self.printer_port}")
            return False
        except socket.error as e:
            logger.error(f"Socket error sending data to printer: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending data to printer: {e}")
            return False
    
    def open_cash_drawer(self) -> Dict[str, Any]:
        """Send command to open cash drawer without printing receipt"""
        try:
            if not self.is_connected():
                return self.format_response(
                    status="error",
                    message="Printer not connected"
                )
            
            if self.is_debug or self.is_testing:
                # Mock implementation
                logger.info("Mock opening cash drawer")
                return self.format_response(
                    status="success",
                    message="Cash drawer opened"
                )
            
            # ESC/POS command to open cash drawer
            DRAWER_OPEN = b'\x1B\x70\x00\x64\x19'  # Open cash drawer (pin 2, 100ms on, 25ms off)
            
            # Send command to printer
            success = self._send_to_printer(DRAWER_OPEN)
            
            if success:
                return self.format_response(
                    status="success",
                    message="Cash drawer opened"
                )
            else:
                return self.format_response(
                    status="error",
                    message="Failed to open cash drawer"
                )
            
        except Exception as e:
            logger.error(f"Error opening cash drawer: {e}")
            return self.handle_error(e)