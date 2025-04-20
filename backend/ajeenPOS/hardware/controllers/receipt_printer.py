# hardware/controllers/receipt_printer.py
import logging
import socket
import time
from typing import Dict, Any, List, Optional
from .base import BaseHardwareController # Make sure this import is correct
from ..testing.mock_receipt_printer import MockReceiptPrinter
from django.conf import settings
# Import Order and OrderItem models (adjust path if necessary)
from orders.models import Order, OrderItem

logger = logging.getLogger(__name__)

# --- Add a flag to force all prints to the TRANSACTION printer ---
# Set this to True to redirect all prints, False to use configured printers
FORCE_SINGLE_PRINTER_TARGET = 'TRANSACTION' # Name of the printer config to redirect to
FORCE_SINGLE_PRINTER = True # Set to False when you get more printers

class ReceiptPrinterController(BaseHardwareController):
    """Controller for receipt printer operations, supporting multiple printers."""

    def __init__(self, hardware_type=None):
        # Initialize attributes used by this class *before* calling super().__init__
        self.printer_configs = getattr(settings, 'HARDWARE_CONFIG', {}).get('PRINTERS', {})
        self.mock_printer = MockReceiptPrinter() # Keep a mock instance for simulations
        self.connected = False # Initialize connection status

        # Call the base class __init__ AFTER setting up attributes needed by initializers
        # Pass the specific hardware_type='RECEIPT_PRINTER'
        super().__init__(hardware_type='RECEIPT_PRINTER')

        # Log status *after* initialization is complete
        logger.info(f"Receipt Printer Controller initialized. Found {len(self.printer_configs)} printer configs.")
        logger.info(f"Using REAL hardware setting for RECEIPT_PRINTER: {self.use_real_hardware}")
        logger.info(f"Printer connection status: {'Connected' if self.connected else 'Disconnected'}")
        if FORCE_SINGLE_PRINTER:
            logger.warning(f"--- FORCE_SINGLE_PRINTER ACTIVE --- All prints will be redirected to '{FORCE_SINGLE_PRINTER_TARGET}' printer.")


    # --- METHOD IMPLEMENTATIONS REQUIRED BY BaseHardwareController ---

    def _initialize_mock_controller(self):
        """Initialize mock receipt printer (required by base class)."""
        # self.mock_printer is already initialized in __init__
        self.connected = True # Assume mock is always connected
        logger.info("Initialized mock receipt printer connection.")

    def _initialize_real_controller(self):
        """Initialize real receipt printer hardware connection check (required by base class)."""
        # Determine the target printer config (handles redirection)
        # Check the config for the printer we intend to use for initialization checks
        target_printer_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else 'TRANSACTION'
        printer_config = self._get_printer_config_for_init(target_printer_name) # Use helper

        if not printer_config:
            logger.error(f"Cannot initialize real printer: Config for target '{target_printer_name}' not found or disabled.")
            self.connected = False
            return

        printer_ip = printer_config.get('ip')
        printer_port = printer_config.get('port')
        printer_type = printer_config.get('type', 'network')

        if not printer_ip or not printer_port:
            logger.error(f"Cannot initialize real printer: Missing IP or Port for '{target_printer_name}'.")
            self.connected = False
            return

        logger.info(f"Initializing real printer connection check for '{target_printer_name}' at {printer_ip}:{printer_port}")

        if printer_type == 'network':
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(printer_config.get('timeout', 3)) # Shorter timeout for init check
                result = sock.connect_ex((printer_ip, printer_port))
                sock.close()
                if result == 0:
                    logger.info(f"Real printer connection successful to {printer_ip}:{printer_port}")
                    self.connected = True
                else:
                    # Log specific error code if available
                    logger.error(f"Real printer connection failed to {printer_ip}:{printer_port} (Error code: {result})")
                    self.connected = False
            except Exception as e:
                logger.error(f"Error during real printer connection check for {printer_ip}:{printer_port}: {e}")
                self.connected = False
        else:
            logger.warning(f"Real printer initialization not implemented for type '{printer_type}'. Assuming disconnected.")
            self.connected = False

    def is_connected(self) -> bool:
        """Check if the controller believes it's connected (required by base class)."""
        # This now returns the status determined during initialization
        return self.connected

    # --- Helper for init to get config without logging redirection ---
    def _get_printer_config_for_init(self, printer_name: str) -> Optional[Dict[str, Any]]:
        """Gets config for init without logging redirection messages."""
        target_printer_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
        config = self.printer_configs.get(target_printer_name)
        if config and config.get('enabled', False):
            return config
        return None

    # --- Core Methods (Modified _get_printer_config, _connect_and_send, etc.) ---

    def _get_printer_config(self, printer_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific printer, handling redirection."""
        target_printer_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
        if FORCE_SINGLE_PRINTER and printer_name != target_printer_name:
            logger.info(f"Redirecting print request for '{printer_name}' to '{target_printer_name}'.")

        config = self.printer_configs.get(target_printer_name) # Use target_printer_name
        if not config:
            log_name = f"'{printer_name}' (redirected to '{target_printer_name}')" if FORCE_SINGLE_PRINTER and printer_name != target_printer_name else f"'{target_printer_name}'"
            logger.error(f"Printer configuration for {log_name} not found.")
            return None
        if not config.get('enabled', False):
            log_name = f"'{printer_name}' (redirected to '{target_printer_name}')" if FORCE_SINGLE_PRINTER and printer_name != target_printer_name else f"'{target_printer_name}'"
            logger.warning(f"Printer {log_name} is disabled in settings.")
            return None
        return config

    def _connect_and_send(self, printer_config: Dict[str, Any], data: bytes) -> bool:
        """Connects to a specific printer and sends data."""
        # This method uses the printer_config passed to it, which already accounts
        # for redirection via _get_printer_config in the calling methods.

        if not self.use_real_hardware:
            target_ip = printer_config.get('ip', 'UNKNOWN_MOCK_IP')
            logger.warning(f"MOCK MODE: Simulating print to printer config: {target_ip}")
            mock_result = self.mock_printer._simulate_print(f"Data for {target_ip}:\n{data.decode('utf-8', errors='ignore')}")
            return mock_result.get('status') == 'success'

        # Real hardware logic
        printer_ip = printer_config.get('ip')
        printer_port = printer_config.get('port')
        printer_type = printer_config.get('type', 'network')

        if not printer_ip or not printer_port:
            logger.error(f"Missing IP or Port for printer config: {printer_config}")
            return False

        logger.info(f"REAL MODE: Attempting to print to {printer_ip}:{printer_port}")

        if printer_type == 'network':
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(printer_config.get('timeout', 5)) # Use timeout from config or default
                logger.info(f"Connecting to printer at {printer_ip}:{printer_port}")
                s.connect((printer_ip, printer_port))
                logger.info(f"Sending {len(data)} bytes of data to printer {printer_ip}")
                s.sendall(data)
                s.close()
                logger.info(f"Data sent successfully to {printer_ip}")
                return True
            except socket.timeout:
                logger.error(f"Timeout connecting to printer at {printer_ip}:{printer_port}")
                return False
            except socket.error as e:
                logger.error(f"Socket error sending data to printer {printer_ip}: {e}")
                return False
            except Exception as e:
                logger.error(f"Error sending data to printer {printer_ip}: {e}", exc_info=True)
                return False
        else:
            logger.error(f"Printer type '{printer_type}' not yet implemented for real hardware.")
            # Add logic for other printer types (USB, Serial) here if needed
            return False

    # --- Formatting Methods ---
    def _format_base_ticket(self, order: Order, title: str) -> bytes:
        """Generates common header for kitchen/QC tickets."""
        INIT = b'\x1B\x40'
        ALIGN_CENTER = b'\x1B\x61\x01'
        ALIGN_LEFT = b'\x1B\x61\x00'
        BOLD_ON = b'\x1B\x45\x01'
        BOLD_OFF = b'\x1B\x45\x00'
        DOUBLE_HEIGHT_WIDTH = b'\x1B\x21\x30' # Larger font for title
        NORMAL_TEXT = b'\x1B\x21\x00'
        LINE_FEED = b'\x0A'

        receipt = b''
        receipt += INIT
        receipt += ALIGN_CENTER
        receipt += BOLD_ON + DOUBLE_HEIGHT_WIDTH
        receipt += title.encode('utf-8') + LINE_FEED
        receipt += NORMAL_TEXT + BOLD_OFF + ALIGN_LEFT + LINE_FEED

        order_id = order.id
        timestamp = order.created_at.strftime('%Y-%m-%d %H:%M:%S')

        receipt += BOLD_ON
        receipt += f"Order #: {order_id}".encode('utf-8') + LINE_FEED
        receipt += BOLD_OFF
        receipt += f"Time: {timestamp}".encode('utf-8') + LINE_FEED
        try:
            customer_name = order.get_customer_name() # Use the method from Order model
            if customer_name:
                receipt += f"Customer: {customer_name}".encode('utf-8') + LINE_FEED
        except AttributeError:
             logger.warning(f"Order model {order.id} does not have get_customer_name method.")
        receipt += f"Source: {order.source.upper()}".encode('utf-8') + LINE_FEED

        receipt += LINE_FEED
        receipt += BOLD_ON
        receipt += "ITEMS".encode('utf-8') + LINE_FEED
        receipt += b'-' * 32 + LINE_FEED
        receipt += BOLD_OFF
        return receipt

    def _format_station_ticket(self, order: Order, items: List[OrderItem], station_name: str) -> bytes:
        """Formats a ticket for a specific kitchen station."""
        LINE_FEED = b'\x0A'
        CUT = b'\x1D\x56\x41' # Partial Cut

        receipt = self._format_base_ticket(order, station_name.upper()) # Use base header

        for item in items:
            name = item.product.name if item.product else 'Unknown Item'
            qty = item.quantity
            receipt += f"{qty} x {name}".encode('utf-8') + LINE_FEED
            # Consider adding modifiers/notes here if your OrderItem model has them

        receipt += b'-' * 32 + LINE_FEED
        receipt += LINE_FEED * 3 # Add some space before cut
        receipt += CUT
        return receipt

    def _format_qc_ticket(self, order: Order) -> bytes:
        """Formats a ticket for the Quality Control station (all items)."""
        LINE_FEED = b'\x0A'
        CUT = b'\x1D\x56\x41' # Partial Cut

        receipt = self._format_base_ticket(order, "QC TICKET") # Use base header

        # Ensure items are fetched if not already passed (though signal should prefetch)
        items = order.items.select_related('product').all()

        for item in items:
            name = item.product.name if item.product else 'Unknown Item'
            qty = item.quantity
            receipt += f"{qty} x {name}".encode('utf-8') + LINE_FEED
            # Consider adding modifiers/notes

        receipt += b'-' * 32 + LINE_FEED
        receipt += LINE_FEED * 3
        receipt += CUT
        return receipt

    def _format_transaction_receipt(self, receipt_data: Dict[str, Any]) -> bytes:
        """Formats the standard customer/transaction receipt."""
        # Keep the detailed formatting for customer receipt
        INIT = b'\x1B\x40'; CUT = b'\x1D\x56\x41'; FULL_CUT = b'\x1D\x56\x00'
        DRAWER_OPEN = b'\x1B\x70\x00\x64\x19'; ALIGN_CENTER = b'\x1B\x61\x01'
        ALIGN_LEFT = b'\x1B\x61\x00'; DOUBLE_HEIGHT = b'\x1B\x21\x10'
        NORMAL_TEXT = b'\x1B\x21\x00'; BOLD_ON = b'\x1B\x45\x01'
        BOLD_OFF = b'\x1B\x45\x00'; LINE_FEED = b'\x0A'

        receipt = b'' + INIT + ALIGN_CENTER + BOLD_ON + DOUBLE_HEIGHT
        receipt += "AJEEN RESTAURANT".encode('utf-8') + LINE_FEED
        receipt += NORMAL_TEXT
        receipt += "123 Main Street".encode('utf-8') + LINE_FEED # Replace with actual address
        receipt += "City, State 12345".encode('utf-8') + LINE_FEED # Replace with actual
        receipt += "Tel: (123) 456-7890".encode('utf-8') + LINE_FEED # Replace with actual
        receipt += LINE_FEED + ALIGN_LEFT + BOLD_OFF

        order_id = receipt_data.get('id', 'N/A')
        timestamp = receipt_data.get('timestamp', time.strftime('%Y-%m-%d %H:%M:%S'))
        receipt += f"Order #: {order_id}".encode('utf-8') + LINE_FEED
        receipt += f"Date: {timestamp}".encode('utf-8') + LINE_FEED
        if receipt_data.get('customer_name'):
            receipt += f"Customer: {receipt_data.get('customer_name')}".encode('utf-8') + LINE_FEED
        receipt += LINE_FEED + BOLD_ON + "ITEMS".encode('utf-8') + LINE_FEED
        receipt += b'-' * 32 + LINE_FEED + BOLD_OFF

        items = receipt_data.get('items', [])
        subtotal_calc = 0.0 # Calculate subtotal from items if not provided
        for item in items:
            name = item.get('product_name', item.get('name', 'Unknown'))
            qty = item.get('quantity', 1)
            try:
                price = float(item.get('unit_price', item.get('price', 0.00)))
            except (ValueError, TypeError):
                price = 0.00
            total = qty * price
            subtotal_calc += total
            item_text = f"{name} x {qty}".ljust(20)
            price_text = f"${total:.2f}".rjust(12)
            receipt += f"{item_text}{price_text}".encode('utf-8') + LINE_FEED

        receipt += b'-' * 32 + LINE_FEED

        # Use provided totals if available, otherwise use calculated/defaults
        subtotal = float(receipt_data.get('subtotal', subtotal_calc))
        tax = float(receipt_data.get('tax', 0.00))
        total = float(receipt_data.get('total_amount', subtotal + tax)) # Use provided total or calculate

        receipt += BOLD_ON
        receipt += "Subtotal:".ljust(20).encode('utf-8') + f"${subtotal:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += "Tax:".ljust(20).encode('utf-8') + f"${tax:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += "Total:".ljust(20).encode('utf-8') + f"${total:.2f}".rjust(12).encode('utf-8') + LINE_FEED
        receipt += BOLD_OFF + LINE_FEED

        payment = receipt_data.get('payment', {})
        payment_method = payment.get('method', payment.get('payment_method', 'N/A'))
        receipt += f"Payment Method: {payment_method.upper()}".encode('utf-8') + LINE_FEED

        if payment_method.lower() == 'cash':
             try:
                amount_tendered = float(payment.get('amount_tendered', 0.00))
                change = float(payment.get('change', 0.00))
                receipt += f"Amount Tendered: ${amount_tendered:.2f}".encode('utf-8') + LINE_FEED
                receipt += f"Change: ${change:.2f}".encode('utf-8') + LINE_FEED
             except (ValueError, TypeError):
                 logger.warning("Could not parse cash payment details for receipt.")


        receipt += LINE_FEED + ALIGN_CENTER
        receipt += "Thank you for your purchase!".encode('utf-8') + LINE_FEED
        receipt += "Please come again".encode('utf-8') + LINE_FEED
        receipt += LINE_FEED * 2 # Extra spacing
        receipt += FULL_CUT # Use full cut for customer receipt

        # Optionally open drawer
        if receipt_data.get('open_drawer', False): # Default to False unless specified
            receipt += DRAWER_OPEN
        return receipt

    # --- Public Interface Methods ---
    def print_receipt_to_printer(self, printer_name: str, receipt_data_bytes: bytes) -> Dict[str, Any]:
        """Prints raw byte data to a specific named printer (or redirects)."""
        printer_config = self._get_printer_config(printer_name) # Handles redirection internally
        if not printer_config:
            return self.format_response(status="error", message=f"Target printer for '{printer_name}' not found or disabled.")

        # Check connection status determined at init (optional but good practice)
        if not self.is_connected() and self.use_real_hardware:
             logger.warning(f"Attempting print to {printer_name} but initial connection check failed. Trying anyway...")
             # Or: return self.format_response(status="error", message="Printer disconnected")

        success = self._connect_and_send(printer_config, receipt_data_bytes)
        effective_target_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name

        if success:
            log_msg = f"Data intended for '{printer_name}' printed successfully to '{effective_target_name}' ({printer_config.get('ip')})"
            logger.info(log_msg)
            return self.format_response(status="success", message=f"Printed successfully to {effective_target_name}")
        else:
            log_msg = f"Failed to print data intended for '{printer_name}' to '{effective_target_name}' ({printer_config.get('ip')})"
            logger.error(log_msg)
            return self.format_response(status="error", message=f"Failed to print to {effective_target_name}")

    def print_transaction_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Formats and prints the standard transaction receipt."""
        try:
            logger.info(f"Transaction receipt print request received.")
            if not isinstance(receipt_data, dict):
                 logger.error("Invalid receipt_data format for transaction receipt.")
                 return self.format_response(status="error", message="Invalid receipt data format.")

            formatted_receipt = self._format_transaction_receipt(receipt_data)
            # Intentionally targets 'TRANSACTION', redirection handles if needed
            return self.print_receipt_to_printer('TRANSACTION', formatted_receipt)
        except Exception as e:
            logger.error(f"Error formatting or printing transaction receipt: {e}", exc_info=True)
            return self.handle_error(e) # Use base class error handler

    def print_station_ticket(self, order: Order, printer_name: str) -> Dict[str, Any]:
        """Formats and prints a filtered ticket for a station."""
        try:
            # Check the *original* intended printer config for role/categories
            original_config = self.printer_configs.get(printer_name)
            if not original_config or not original_config.get('enabled') or original_config.get('role') != 'station':
                logger.warning(f"Station printer '{printer_name}' not found, disabled, or misconfigured. Skipping print.")
                return self.format_response(status="warning", message=f"Station printer '{printer_name}' misconfigured.")

            required_categories = original_config.get('categories', [])
            if not required_categories:
                logger.warning(f"Station printer '{printer_name}' has no categories assigned. Skipping print.")
                return self.format_response(status="warning", message=f"No categories for {printer_name}.")

            # Ensure items are loaded with product and category
            items_to_print = order.items.filter(
                product__category__name__in=required_categories
            ).select_related('product') # Optimization

            if not items_to_print.exists():
                logger.info(f"No items for station '{printer_name}' in order {order.id}.")
                return self.format_response(status="success", message=f"No items for {printer_name}")

            logger.info(f"Formatting ticket for station '{printer_name}' for order {order.id}")
            formatted_ticket = self._format_station_ticket(order, list(items_to_print), printer_name)
            # This call handles redirection if FORCE_SINGLE_PRINTER is True
            return self.print_receipt_to_printer(printer_name, formatted_ticket)

        except Exception as e:
            logger.error(f"Error processing station ticket for {printer_name}: {e}", exc_info=True)
            return self.handle_error(e)

    def print_qc_ticket(self, order: Order, printer_name: str = 'QC') -> Dict[str, Any]:
        """Formats and prints a full order ticket for Quality Control."""
        try:
            # Check the *original* intended printer config for role
            original_config = self.printer_configs.get(printer_name)
            if not original_config or not original_config.get('enabled') or original_config.get('role') != 'quality_control':
                logger.warning(f"QC printer '{printer_name}' not found, disabled, or misconfigured. Skipping print.")
                return self.format_response(status="warning", message=f"QC printer '{printer_name}' misconfigured.")

            logger.info(f"Formatting QC ticket for order {order.id}")
            formatted_ticket = self._format_qc_ticket(order)
             # This call handles redirection if FORCE_SINGLE_PRINTER is True
            return self.print_receipt_to_printer(printer_name, formatted_ticket)
        except Exception as e:
            logger.error(f"Error processing QC ticket for {printer_name}: {e}", exc_info=True)
            return self.handle_error(e)

    def open_cash_drawer(self, printer_name: str = 'TRANSACTION') -> Dict[str, Any]:
        """Sends command to open cash drawer via specified printer (or redirects)."""
        try:
            # _get_printer_config handles redirection if FORCE_SINGLE_PRINTER is True
            printer_config = self._get_printer_config(printer_name)
            if not printer_config:
                return self.format_response(status="error", message=f"Target printer for cash drawer ('{printer_name}') not found or disabled.")

            # Check initial connection status
            if not self.is_connected() and self.use_real_hardware:
                 logger.warning(f"Attempting to open drawer via {printer_name} but initial connection check failed. Trying anyway...")
                 # Or: return self.format_response(status="error", message="Printer disconnected")

            if not self.use_real_hardware:
                effective_target_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
                logger.info(f"MOCK opening cash drawer via printer '{effective_target_name}' (intended for '{printer_name}')")
                self.mock_printer.open_cash_drawer() # Assuming mock has this method
                return self.format_response(status="success", message="Cash drawer opened (simulated)")

            # Real hardware command
            DRAWER_OPEN = b'\x1B\x70\x00\x64\x19'
            effective_target_name = FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
            logger.info(f"REAL MODE: Sending open drawer command to printer '{effective_target_name}' ({printer_config.get('ip')}) (intended for '{printer_name}')")
            success = self._connect_and_send(printer_config, DRAWER_OPEN)

            if success:
                return self.format_response(status="success", message=f"Cash drawer opened via {effective_target_name}")
            else:
                return self.format_response(status="error", message=f"Failed to open cash drawer via {effective_target_name}")

        except Exception as e:
            logger.error(f"Error opening cash drawer (intended for {printer_name}): {e}", exc_info=True)
            return self.handle_error(e)

    def check_all_printer_status(self) -> Dict[str, Any]:
        """Checks the status of all enabled printers via network ping/socket."""
        statuses = {}
        if not self.use_real_hardware:
            logger.warning("MOCK MODE: Simulating printer status check.")
            for name, config in self.printer_configs.items():
                if config.get('enabled'):
                    statuses[name] = {'status': 'ok', 'message': 'Mock printer OK', 'config': config}
            return self.format_response(status="success", data=statuses)

        # Real hardware check
        logger.info("Checking status of all enabled real printers...")
        for name, config in self.printer_configs.items():
            if config.get('enabled'):
                ip = config.get('ip')
                port = config.get('port')
                printer_type = config.get('type', 'network')
                status_detail = {'status': 'error', 'message': 'Unknown', 'config': config}

                if printer_type == 'network' and ip and port:
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(2) # Short timeout for status check
                        result = sock.connect_ex((ip, port))
                        sock.close()
                        if result == 0:
                            status_detail['status'] = 'ok'
                            status_detail['message'] = f"Connected successfully to {ip}:{port}"
                            logger.info(f"Printer '{name}' ({ip}:{port}) status: OK")
                        else:
                            status_detail['message'] = f"Connection failed to {ip}:{port} (Error code: {result})"
                            logger.warning(f"Printer '{name}' ({ip}:{port}) status: ERROR - Connection Failed")
                    except Exception as e:
                        status_detail['message'] = f"Error checking {ip}:{port}: {str(e)}"
                        logger.error(f"Printer '{name}' ({ip}:{port}) status: ERROR - {str(e)}")
                elif printer_type != 'network':
                    status_detail['message'] = f"Status check not implemented for type '{printer_type}'"
                    logger.warning(f"Printer '{name}' status: UNKNOWN - Type '{printer_type}'")
                else:
                    status_detail['message'] = "Missing IP or Port configuration"
                    logger.error(f"Printer '{name}' status: ERROR - Configuration Incomplete")
                statuses[name] = status_detail
            else:
                 logger.debug(f"Skipping disabled printer: {name}")


        # Add overall status message based on individual checks
        all_ok = all(details['status'] == 'ok' for details in statuses.values())
        overall_status = "success" if all_ok else "warning"
        overall_message = "All enabled printers connected." if all_ok else "One or more printers disconnected."

        logger.info(f"Printer status check complete: {overall_message}")
        return self.format_response(status=overall_status, message=overall_message, data=statuses)

    # Ensure the base class handle_error is available if not overridden
    # If BaseHardwareController defines handle_error, it's inherited.
    # def handle_error(self, error: Exception) -> Dict[str, Any]:
    #     # Default implementation uses format_response
    #     return self.format_response(
    #         status="error",
    #         message=str(error)
    #     )