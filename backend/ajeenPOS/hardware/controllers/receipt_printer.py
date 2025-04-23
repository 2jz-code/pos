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
from typing import Dict, Any, List, Optional
from decimal import Decimal, InvalidOperation # Ensure Decimal is imported

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
        """Formats the standard customer/transaction receipt with extra spacing."""
        # --- Constants ---
        INIT = b'\x1B\x40'; CUT = b'\x1D\x56\x41'; FULL_CUT = b'\x1D\x56\x00'
        DRAWER_OPEN = b'\x1B\x70\x00\x64\x19'; ALIGN_CENTER = b'\x1B\x61\x01'
        ALIGN_LEFT = b'\x1B\x61\x00'; DOUBLE_HEIGHT = b'\x1B\x21\x10'
        NORMAL_TEXT = b'\x1B\x21\x00'; BOLD_ON = b'\x1B\x45\x01'
        BOLD_OFF = b'\x1B\x45\x00'; LINE_FEED = b'\x0A'
        WIDTH = 32 # Or your printer's width

        # --- Receipt Building ---
        receipt = b'' + INIT
        # <<<--- ADDED: Extra whitespace at the top --- >>>
        receipt += LINE_FEED * 2
        # <<<------------------------------------------- >>>
        receipt += ALIGN_CENTER
        receipt += BOLD_ON + DOUBLE_HEIGHT + "AJEEN RESTAURANT".encode('utf-8') + LINE_FEED
        receipt += NORMAL_TEXT + BOLD_OFF
        receipt += "123 Main Street".encode('utf-8') + LINE_FEED # Replace with actual address
        receipt += "Apple Valley, MN 55124".encode('utf-8') + LINE_FEED # Replace/Update
        receipt += "Tel: (123) 456-7890".encode('utf-8') + LINE_FEED # Replace with actual
        receipt += LINE_FEED + ALIGN_LEFT

        order_id = receipt_data.get('id', 'N/A')
        timestamp_str = receipt_data.get('timestamp', time.strftime('%Y-%m-%d %H:%M:%S'))
        receipt += f"Order #: {order_id}".ljust(WIDTH).encode('utf-8') + LINE_FEED
        receipt += f"Date: {timestamp_str}".ljust(WIDTH).encode('utf-8') + LINE_FEED
        if receipt_data.get('customer_name'):
            receipt += f"Customer: {receipt_data.get('customer_name')}".ljust(WIDTH).encode('utf-8') + LINE_FEED
        if receipt_data.get('cashier_name'):
             receipt += f"Cashier: {receipt_data.get('cashier_name')}".ljust(WIDTH).encode('utf-8') + LINE_FEED
        receipt += LINE_FEED + BOLD_ON + "ITEMS".center(WIDTH).encode('utf-8') + LINE_FEED
        receipt += (b'-' * WIDTH) + LINE_FEED + BOLD_OFF

        items = receipt_data.get('items', [])
        subtotal_calc = Decimal('0.0')

        for item in items:
            name = item.get('product_name', item.get('name', 'Unknown'))
            qty = item.get('quantity', 1)
            price_val = item.get('unit_price', item.get('price', '0.00'))
            try:
                price = Decimal(str(price_val)) if price_val is not None else Decimal('0.00')
            except InvalidOperation:
                price = Decimal('0.00')

            total_item_price = Decimal(qty) * price
            subtotal_calc += total_item_price

            item_text = f"{qty}x {name}"
            price_text = f"${total_item_price:.2f}"
            padding_len = WIDTH - len(item_text) - len(price_text)
            padding = " " * max(0, padding_len)
            receipt += f"{item_text}{padding}{price_text}".encode('utf-8') + LINE_FEED

        receipt += (b'-' * WIDTH) + LINE_FEED

        # --- Safely handle totals ---
        def safe_decimal(key, default=Decimal('0.0')):
            # ... (safe_decimal implementation from previous step) ...
            val = receipt_data.get(key)
            if isinstance(val, (int, float)):
                val = str(val)
            try:
                return Decimal(val) if val is not None else default
            except InvalidOperation:
                logger.warning(f"InvalidOperation converting key '{key}' with value '{val}' to Decimal. Using default: {default}")
                return default
            except TypeError:
                 logger.warning(f"TypeError converting key '{key}' with value '{val}' to Decimal. Using default: {default}")
                 return default

        subtotal = safe_decimal('subtotal', subtotal_calc)
        discount_amount = safe_decimal('discount_amount')
        tax_amount = safe_decimal('tax')
        tip_amount = safe_decimal('tip_amount')
        calculated_total = subtotal - discount_amount + tax_amount + tip_amount
        total = safe_decimal('total_amount', calculated_total)

        def format_total_line(label: str, value: Decimal) -> bytes:
            # ... (format_total_line implementation from previous step) ...
            value_str = f"${value:.2f}"
            label_str = label + ":"
            padding_len = WIDTH - len(label_str) - len(value_str)
            padding = " " * max(0, padding_len)
            return f"{label_str}{padding}{value_str}".encode('utf-8') + LINE_FEED

        receipt += format_total_line("Subtotal", subtotal)
        if discount_amount > 0:
            receipt += format_total_line("Discount", -discount_amount)
        if tax_amount > 0:
            receipt += format_total_line("Tax", tax_amount)
        if tip_amount > 0:
            receipt += format_total_line("Tip", tip_amount)

        receipt += BOLD_ON
        receipt += format_total_line("TOTAL", total)
        receipt += BOLD_OFF + LINE_FEED

        # --- Payment Details (Simplified) ---
        payment = receipt_data.get('payment', {})
        payment_method = "Not specified"
        if isinstance(payment, dict):
            payment_method = payment.get('method', payment.get('payment_method', 'N/A'))
            if payment_method:
                payment_method = payment_method.replace("_", " ").upper()

        receipt += f"Payment Method: {payment_method}".ljust(WIDTH).encode('utf-8') + LINE_FEED

        if isinstance(payment, dict) and payment_method.lower() == 'cash':
             try:
                amount_tendered = safe_decimal('amount_tendered', payment.get('amount_tendered'))
                change = safe_decimal('change', payment.get('change'))
                if amount_tendered > 0 or change > 0:
                    receipt += format_total_line(" Amount Tendered", amount_tendered)
                    receipt += format_total_line(" Change", change)
             except Exception as cash_err:
                 logger.warning(f"Could not parse/format cash payment details: {cash_err}")

        # --- Footer ---
        receipt += LINE_FEED + ALIGN_CENTER
        receipt += "Thank you for your purchase!".encode('utf-8') + LINE_FEED
        receipt += "Please come again!".encode('utf-8') + LINE_FEED
        receipt += LINE_FEED # One extra line feed after message

        # <<<--- ADDED: Extra whitespace feed before cutting --- >>>
        # Adjust the number '5' based on how much space you need
        receipt += LINE_FEED * 5
        # <<<-------------------------------------------------- >>>

        # --- Cut & Drawer ---
        receipt += FULL_CUT # Full cut command
        if receipt_data.get('open_drawer', False):
            receipt += DRAWER_OPEN

        logger.debug("_format_transaction_receipt (simple version with spacing) finished.")
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