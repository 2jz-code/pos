import logging
import socket
import time
from typing import Dict, Any, List, Optional
from .base import BaseHardwareController
from ..testing.mock_receipt_printer import MockReceiptPrinter
from django.conf import settings
from orders.models import Order, OrderItem
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import datetime


logger = logging.getLogger(__name__)

FORCE_SINGLE_PRINTER_TARGET = "TRANSACTION"
FORCE_SINGLE_PRINTER = True
RECEIPT_ENCODING = "cp437"
DRAWER_OPEN = b"\x1b\x70\x00\x64\x19"  # Use command defined in original file


class ReceiptPrinterController(BaseHardwareController):

    def __init__(self, hardware_type=None):
        self.printer_configs = getattr(settings, "HARDWARE_CONFIG", {}).get(
            "PRINTERS", {}
        )
        self.mock_printer = MockReceiptPrinter()
        self.connected = False
        super().__init__(hardware_type="RECEIPT_PRINTER")
        logger.info(
            f"Receipt Printer Controller initialized. Found {len(self.printer_configs)} printer configs."
        )
        logger.info(
            f"Using REAL hardware setting for RECEIPT_PRINTER: {self.use_real_hardware}"
        )
        logger.info(
            f"Printer connection status: {'Connected' if self.connected else 'Disconnected'}"
        )
        if FORCE_SINGLE_PRINTER:
            logger.warning(
                f"--- FORCE_SINGLE_PRINTER ACTIVE --- All prints will be redirected to '{FORCE_SINGLE_PRINTER_TARGET}' printer."
            )

    def _initialize_mock_controller(self):
        self.connected = True
        logger.info("Initialized mock receipt printer connection.")

    def _initialize_real_controller(self):
        target_printer_name = (
            FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else "TRANSACTION"
        )
        printer_config = self._get_printer_config_for_init(target_printer_name)

        if not printer_config:
            logger.error(
                f"Cannot initialize real printer: Config for target '{target_printer_name}' not found or disabled."
            )
            self.connected = False
            return

        printer_ip = printer_config.get("ip")
        printer_port = printer_config.get("port")
        printer_type = printer_config.get("type", "network")

        if not printer_ip or not printer_port:
            logger.error(
                f"Cannot initialize real printer: Missing IP or Port for '{target_printer_name}'."
            )
            self.connected = False
            return

        logger.info(
            f"Initializing real printer connection check for '{target_printer_name}' at {printer_ip}:{printer_port}"
        )

        if printer_type == "network":
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(printer_config.get("timeout", 3))
                result = sock.connect_ex((printer_ip, printer_port))
                sock.close()
                if result == 0:
                    logger.info(
                        f"Real printer connection successful to {printer_ip}:{printer_port}"
                    )
                    self.connected = True
                else:
                    logger.error(
                        f"Real printer connection failed to {printer_ip}:{printer_port} (Error code: {result})"
                    )
                    self.connected = False
            except Exception as e:
                logger.error(
                    f"Error during real printer connection check for {printer_ip}:{printer_port}: {e}"
                )
                self.connected = False
        else:
            logger.warning(
                f"Real printer initialization not implemented for type '{printer_type}'. Assuming disconnected."
            )
            self.connected = False

    def is_connected(self) -> bool:
        return self.connected

    def _get_printer_config_for_init(
        self, printer_name: str
    ) -> Optional[Dict[str, Any]]:
        target_printer_name = (
            FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
        )
        config = self.printer_configs.get(target_printer_name)
        if config and config.get("enabled", False):
            return config
        return None

    def _get_printer_config(self, printer_name: str) -> Optional[Dict[str, Any]]:
        target_printer_name = (
            FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
        )
        if FORCE_SINGLE_PRINTER and printer_name != target_printer_name:
            logger.info(
                f"Redirecting print request for '{printer_name}' to '{target_printer_name}'."
            )

        config = self.printer_configs.get(target_printer_name)
        if not config:
            log_name = (
                f"'{printer_name}' (redirected to '{target_printer_name}')"
                if FORCE_SINGLE_PRINTER and printer_name != target_printer_name
                else f"'{target_printer_name}'"
            )
            logger.error(f"Printer configuration for {log_name} not found.")
            return None
        if not config.get("enabled", False):
            log_name = (
                f"'{printer_name}' (redirected to '{target_printer_name}')"
                if FORCE_SINGLE_PRINTER and printer_name != target_printer_name
                else f"'{target_printer_name}'"
            )
            logger.warning(f"Printer {log_name} is disabled in settings.")
            return None
        return config

    def _connect_and_send(self, printer_config: Dict[str, Any], data: bytes) -> bool:
        if not self.use_real_hardware:
            target_ip = printer_config.get("ip", "UNKNOWN_MOCK_IP")
            logger.warning(
                f"MOCK MODE: Simulating print to printer config: {target_ip}"
            )
            mock_result = self.mock_printer._simulate_print(
                f"Data for {target_ip}:\n{data.decode('utf-8', errors='ignore')}"
            )
            return mock_result.get("status") == "success"

        printer_ip = printer_config.get("ip")
        printer_port = printer_config.get("port")
        printer_type = printer_config.get("type", "network")

        if not printer_ip or not printer_port:
            logger.error(f"Missing IP or Port for printer config: {printer_config}")
            return False

        logger.info(f"REAL MODE: Attempting to print to {printer_ip}:{printer_port}")

        if printer_type == "network":
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(printer_config.get("timeout", 5))
                logger.info(f"Connecting to printer at {printer_ip}:{printer_port}")
                s.connect((printer_ip, printer_port))
                logger.info(
                    f"Sending {len(data)} bytes of data to printer {printer_ip}"
                )
                s.sendall(data)
                s.close()
                logger.info(f"Data sent successfully to {printer_ip}")
                return True
            except socket.timeout:
                logger.error(
                    f"Timeout connecting to printer at {printer_ip}:{printer_port}"
                )
                return False
            except socket.error as e:
                logger.error(f"Socket error sending data to printer {printer_ip}: {e}")
                return False
            except Exception as e:
                logger.error(
                    f"Error sending data to printer {printer_ip}: {e}", exc_info=True
                )
                return False
        else:
            logger.error(
                f"Printer type '{printer_type}' not yet implemented for real hardware."
            )
            return False

    def _format_base_ticket(self, order: Order, title: str) -> bytes:
        INIT = b"\x1b\x40"
        ALIGN_CENTER = b"\x1b\x61\x01"
        ALIGN_LEFT = b"\x1b\x61\x00"
        BOLD_ON = b"\x1b\x45\x01"
        BOLD_OFF = b"\x1b\x45\x00"
        DOUBLE_HEIGHT_WIDTH = b"\x1b\x21\x30"
        NORMAL_TEXT = b"\x1b\x21\x00"
        LINE_FEED = b"\x0a"

        receipt = b""
        receipt += INIT
        receipt += ALIGN_CENTER
        receipt += BOLD_ON + DOUBLE_HEIGHT_WIDTH
        receipt += title.encode("utf-8") + LINE_FEED
        receipt += NORMAL_TEXT + BOLD_OFF + ALIGN_LEFT + LINE_FEED

        order_id = order.id
        timestamp = order.created_at.strftime("%Y-%m-%d %H:%M:%S")

        receipt += BOLD_ON
        receipt += f"Order #: {order_id}".encode("utf-8") + LINE_FEED
        receipt += BOLD_OFF
        receipt += f"Time: {timestamp}".encode("utf-8") + LINE_FEED
        try:
            customer_name = order.get_customer_name()
            if customer_name:
                receipt += f"Customer: {customer_name}".encode("utf-8") + LINE_FEED
        except AttributeError:
            logger.warning(
                f"Order model {order.id} does not have get_customer_name method."
            )
        receipt += f"Source: {order.source.upper()}".encode("utf-8") + LINE_FEED

        receipt += LINE_FEED
        receipt += BOLD_ON
        receipt += "ITEMS".encode("utf-8") + LINE_FEED
        receipt += b"-" * 32 + LINE_FEED
        receipt += BOLD_OFF
        return receipt

    def _format_station_ticket(
        self, order: Order, items: List[OrderItem], station_name: str
    ) -> bytes:
        LINE_FEED = b"\x0a"
        CUT = b"\x1d\x56\x41"

        receipt = self._format_base_ticket(order, station_name.upper())

        for item in items:
            name = item.product.name if item.product else "Unknown Item"
            qty = item.quantity
            receipt += f"{qty} x {name}".encode("utf-8") + LINE_FEED

        receipt += b"-" * 32 + LINE_FEED
        receipt += LINE_FEED * 3
        receipt += CUT
        return receipt

    def _format_qc_ticket(self, order: Order) -> bytes:
        LINE_FEED = b"\x0a"
        CUT = b"\x1d\x56\x41"

        receipt = self._format_base_ticket(order, "QC TICKET")

        items = order.items.select_related("product").all()

        for item in items:
            name = item.product.name if item.product else "Unknown Item"
            qty = item.quantity
            receipt += f"{qty} x {name}".encode("utf-8") + LINE_FEED

        receipt += b"-" * 32 + LINE_FEED
        receipt += LINE_FEED * 3
        receipt += CUT
        return receipt

    def _format_transaction_receipt(
        self, receipt_data: Dict[str, Any], open_drawer: bool = False
    ) -> bytes:
        # *** ADDED LOGGING FOR DEBUGGING ***
        logger.info(
            f"--- Inside _format_transaction_receipt --- Received open_drawer flag: {open_drawer} (Type: {type(open_drawer)})"
        )

        INIT = b"\x1b\x40"
        PARTIAL_CUT = b"\x1d\x56\x41"
        FULL_CUT = b"\x1d\x56\x00"
        ALIGN_CENTER = b"\x1b\x61\x01"
        ALIGN_LEFT = b"\x1b\x61\x00"
        DOUBLE_HEIGHT = b"\x1b\x21\x10"
        DOUBLE_HEIGHT_WIDTH = b"\x1b\x21\x30"
        NORMAL_TEXT = b"\x1b\x21\x00"
        BOLD_ON = b"\x1b\x45\x01"
        BOLD_OFF = b"\x1b\x45\x00"
        LINE_FEED = b"\x0a"
        WIDTH = 42
        TWO_PLACES = Decimal("0.01")

        def safe_decimal(key, value, default=Decimal("0.00")) -> Decimal:
            if value is None:
                return default
            if isinstance(value, Decimal):
                return value
            if isinstance(value, (int, float)):
                value = str(value)
            try:
                return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            except (InvalidOperation, TypeError, ValueError):
                logger.warning(
                    f"SafeDecimal Warning: Could not convert key '{key}' value '{value}' (type: {type(value)}) to Decimal. Using default: {default}"
                )
                return default

        def format_total_line(label: str, value: Optional[Decimal]) -> bytes:
            if value is None:
                logger.error(
                    f"format_total_line called with None value for label: {label}"
                )
                value = Decimal("0.00")
            value_str = f"${value:.2f}"
            label_str = label + ":"
            padding = " " * max(0, WIDTH - len(label_str) - len(value_str))
            return (
                f"{label_str}{padding}{value_str}".encode(
                    RECEIPT_ENCODING, errors="replace"
                )
                + LINE_FEED
            )

        receipt_commands = bytearray()
        receipt_commands += INIT
        receipt_commands += LINE_FEED * 2
        receipt_commands += ALIGN_CENTER
        receipt_commands += (
            BOLD_ON
            + DOUBLE_HEIGHT_WIDTH
            + "AJEEN RESTAURANT".encode(RECEIPT_ENCODING, errors="replace")
            + LINE_FEED
        )
        receipt_commands += NORMAL_TEXT + BOLD_OFF
        receipt_commands += (
            "123 Main Street".encode(RECEIPT_ENCODING, errors="replace") + LINE_FEED
        )
        receipt_commands += (
            "Apple Valley, MN 55124".encode(RECEIPT_ENCODING, errors="replace")
            + LINE_FEED
        )
        receipt_commands += (
            "Tel: (123) 456-7890".encode(RECEIPT_ENCODING, errors="replace") + LINE_FEED
        )
        receipt_commands += LINE_FEED + ALIGN_LEFT
        order_id = receipt_data.get("id", "N/A")
        timestamp_str = receipt_data.get(
            "timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        receipt_commands += (
            f"Order #: {order_id}".ljust(WIDTH).encode(
                RECEIPT_ENCODING, errors="replace"
            )
            + LINE_FEED
        )
        receipt_commands += (
            f"Date: {timestamp_str}".ljust(WIDTH).encode(
                RECEIPT_ENCODING, errors="replace"
            )
            + LINE_FEED
        )
        receipt_commands += (
            LINE_FEED
            + BOLD_ON
            + "ITEMS".center(WIDTH).encode(RECEIPT_ENCODING, errors="replace")
            + LINE_FEED
        )
        receipt_commands += (b"-" * WIDTH) + LINE_FEED + BOLD_OFF
        items = receipt_data.get("items", [])
        subtotal_calc = Decimal("0.00")
        for item in items:
            name = item.get("product_name", item.get("name", "Unknown"))[: WIDTH - 12]
            qty_val = item.get("quantity", 1)
            price_val = item.get("unit_price", item.get("price", "0.00"))
            try:
                qty_int = 1
                try:
                    qty_int = int(qty_val)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid qty '{qty_val}' for '{name}'. Using 1.")
                    qty_int = 1
                price_decimal = safe_decimal("unit_price", price_val)
                total_item_price = Decimal(qty_int) * price_decimal
                subtotal_calc += total_item_price
                item_text = f"{qty_int}x {name}"
                price_text = f"${total_item_price:.2f}"
                padding = " " * max(0, WIDTH - len(item_text) - len(price_text))
                receipt_commands += (
                    f"{item_text}{padding}{price_text}".encode(
                        RECEIPT_ENCODING, errors="replace"
                    )
                    + LINE_FEED
                )
            except Exception as item_err:
                logger.error(
                    f"Error processing item details. Item: {item}. Error: {item_err}",
                    exc_info=True,
                )
                receipt_commands += f"  Error processing item: {name}\n".encode(
                    RECEIPT_ENCODING, errors="replace"
                )
        receipt_commands += (b"-" * WIDTH) + LINE_FEED
        subtotal = safe_decimal("subtotal", receipt_data.get("subtotal"), subtotal_calc)
        discount_amount = safe_decimal(
            "discount_amount", receipt_data.get("discount_amount")
        )
        tax_amount = safe_decimal("tax", receipt_data.get("tax"))
        tip_amount = safe_decimal("tip_amount", receipt_data.get("tip_amount"))
        calculated_total = subtotal - discount_amount + tax_amount + tip_amount
        total = safe_decimal(
            "total_price", receipt_data.get("total_price"), calculated_total
        )
        receipt_commands += format_total_line("Subtotal", subtotal)
        if discount_amount > 0:
            receipt_commands += format_total_line("Discount", -discount_amount)
        if tax_amount > 0:
            receipt_commands += format_total_line("Tax", tax_amount)
        if tip_amount > 0:
            receipt_commands += format_total_line("Tip", tip_amount)
        receipt_commands += BOLD_ON
        receipt_commands += format_total_line("TOTAL", total)
        receipt_commands += BOLD_OFF + LINE_FEED
        payment = receipt_data.get("payment", {})
        payment_method = "N/A"
        if isinstance(payment, dict):
            payment_method = payment.get("method", "N/A").upper()
            receipt_commands += (
                f"Payment Method: {payment_method}".ljust(WIDTH).encode(
                    RECEIPT_ENCODING, errors="replace"
                )
                + LINE_FEED
            )
            if payment_method == "CASH":
                amount_tendered = safe_decimal(
                    "amount_tendered", payment.get("amount_tendered")
                )
                change = safe_decimal("change", payment.get("change"))
                if amount_tendered > Decimal("0.00"):
                    receipt_commands += format_total_line(
                        " Amount Tendered", amount_tendered
                    )
                    receipt_commands += format_total_line(" Change", change)
        else:
            receipt_commands += (
                f"Payment Method: {payment_method}".ljust(WIDTH).encode(
                    RECEIPT_ENCODING, errors="replace"
                )
                + LINE_FEED
            )
        receipt_commands += LINE_FEED + ALIGN_CENTER
        receipt_commands += (
            "Thank you!".encode(RECEIPT_ENCODING, errors="replace") + LINE_FEED
        )
        receipt_commands += LINE_FEED * 2

        # *** ADDED LOGGING FOR DEBUGGING ***
        logger.info(f"Checking condition: if open_drawer ({open_drawer}):")
        if open_drawer:
            logger.info(">>> Condition TRUE: Adding drawer kick command <<<")
            receipt_commands += DRAWER_OPEN
        else:
            logger.info(">>> Condition FALSE: NOT adding drawer kick command <<<")

        receipt_commands += LINE_FEED * 3
        receipt_commands += PARTIAL_CUT
        receipt_commands += LINE_FEED * 3
        logger.debug(
            f"_format_transaction_receipt complete. Bytes: {len(receipt_commands)}"
        )
        return bytes(receipt_commands)

    def print_receipt_to_printer(
        self, printer_name: str, receipt_data_bytes: bytes
    ) -> Dict[str, Any]:
        printer_config = self._get_printer_config(printer_name)
        if not printer_config:
            return self.format_response(
                status="error",
                message=f"Target printer for '{printer_name}' not found or disabled.",
            )
        if not self.is_connected() and self.use_real_hardware:
            logger.warning(
                f"Attempting print to {printer_name} but initial connection check failed. Trying anyway..."
            )
        success = self._connect_and_send(printer_config, receipt_data_bytes)
        effective_target_name = (
            FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
        )
        if success:
            log_msg = f"Data intended for '{printer_name}' printed successfully to '{effective_target_name}' ({printer_config.get('ip')})"
            logger.info(log_msg)
            return self.format_response(
                status="success",
                message=f"Printed successfully to {effective_target_name}",
            )
        else:
            log_msg = f"Failed to print data intended for '{printer_name}' to '{effective_target_name}' ({printer_config.get('ip')})"
            logger.error(log_msg)
            return self.format_response(
                status="error", message=f"Failed to print to {effective_target_name}"
            )

    def print_transaction_receipt(
        self, receipt_data: Dict[str, Any], open_drawer: bool = False
    ) -> Dict[str, Any]:
        logger.info(
            f"--- Entered print_transaction_receipt --- Received open_drawer flag: {open_drawer}"
        )
        try:
            if not isinstance(receipt_data, dict):
                logger.error("Invalid receipt_data format.")
                return self.format_response(
                    status="error", message="Invalid receipt data."
                )
            # *** MODIFIED: Pass flag down to formatting function ***
            formatted_receipt = self._format_transaction_receipt(
                receipt_data, open_drawer=open_drawer
            )
            logger.info(f"Sending formatted receipt to 'TRANSACTION' target.")
            return self.print_receipt_to_printer("TRANSACTION", formatted_receipt)
        except Exception as e:
            logger.exception(
                f"Error formatting/printing transaction receipt (open_drawer={open_drawer})"
            )
            return self.handle_error(e)

    def print_station_ticket(self, order: Order, printer_name: str) -> Dict[str, Any]:
        try:
            original_config = self.printer_configs.get(printer_name)
            if (
                not original_config
                or not original_config.get("enabled")
                or original_config.get("role") != "station"
            ):
                logger.warning(
                    f"Station printer '{printer_name}' misconfigured. Skipping."
                )
                return self.format_response(
                    status="warning",
                    message=f"Station printer '{printer_name}' misconfigured.",
                )
            required_categories = original_config.get("categories", [])
            if not required_categories:
                logger.warning(
                    f"Station printer '{printer_name}' has no categories. Skipping."
                )
                return self.format_response(
                    status="warning", message=f"No categories for {printer_name}."
                )
            items_to_print = order.items.filter(
                product__category__name__in=required_categories
            ).select_related("product")
            if not items_to_print.exists():
                logger.info(
                    f"No items for station '{printer_name}' in order {order.id}."
                )
                return self.format_response(
                    status="success", message=f"No items for {printer_name}"
                )
            logger.info(
                f"Formatting ticket for station '{printer_name}' for order {order.id}"
            )
            formatted_ticket = self._format_station_ticket(
                order, list(items_to_print), printer_name
            )
            return self.print_receipt_to_printer(printer_name, formatted_ticket)
        except Exception as e:
            logger.error(
                f"Error processing station ticket for {printer_name}: {e}",
                exc_info=True,
            )
            return self.handle_error(e)

    def print_qc_ticket(self, order: Order, printer_name: str = "QC") -> Dict[str, Any]:
        try:
            original_config = self.printer_configs.get(printer_name)
            if (
                not original_config
                or not original_config.get("enabled")
                or original_config.get("role") != "quality_control"
            ):
                logger.warning(f"QC printer '{printer_name}' misconfigured. Skipping.")
                return self.format_response(
                    status="warning",
                    message=f"QC printer '{printer_name}' misconfigured.",
                )
            logger.info(f"Formatting QC ticket for order {order.id}")
            formatted_ticket = self._format_qc_ticket(order)
            return self.print_receipt_to_printer(printer_name, formatted_ticket)
        except Exception as e:
            logger.error(
                f"Error processing QC ticket for {printer_name}: {e}", exc_info=True
            )
            return self.handle_error(e)

    def open_cash_drawer(self, printer_name: str = "TRANSACTION") -> Dict[str, Any]:
        try:
            printer_config = self._get_printer_config(printer_name)
            if not printer_config:
                return self.format_response(
                    status="error",
                    message=f"Target printer for cash drawer ('{printer_name}') not found or disabled.",
                )
            if not self.is_connected() and self.use_real_hardware:
                logger.warning(
                    f"Attempting to open drawer via {printer_name} but initial connection check failed. Trying anyway..."
                )
            if not self.use_real_hardware:
                effective_target_name = (
                    FORCE_SINGLE_PRINTER_TARGET
                    if FORCE_SINGLE_PRINTER
                    else printer_name
                )
                logger.info(
                    f"MOCK opening cash drawer via printer '{effective_target_name}' (intended for '{printer_name}')"
                )
                self.mock_printer.open_cash_drawer()
                return self.format_response(
                    status="success", message="Cash drawer opened (simulated)"
                )

            DRAWER_OPEN = b"\x1b\x70\x00\x64\x19"  # Use the same command as defined in _format_transaction_receipt
            effective_target_name = (
                FORCE_SINGLE_PRINTER_TARGET if FORCE_SINGLE_PRINTER else printer_name
            )
            logger.info(
                f"REAL MODE: Sending open drawer command to printer '{effective_target_name}' ({printer_config.get('ip')}) (intended for '{printer_name}')"
            )
            success = self._connect_and_send(printer_config, DRAWER_OPEN)
            if success:
                return self.format_response(
                    status="success",
                    message=f"Cash drawer opened via {effective_target_name}",
                )
            else:
                return self.format_response(
                    status="error",
                    message=f"Failed to open cash drawer via {effective_target_name}",
                )
        except Exception as e:
            logger.error(
                f"Error opening cash drawer (intended for {printer_name}): {e}",
                exc_info=True,
            )
            return self.handle_error(e)

    def check_all_printer_status(self) -> Dict[str, Any]:
        statuses = {}
        if not self.use_real_hardware:
            logger.warning("MOCK MODE: Simulating printer status check.")
            for name, config in self.printer_configs.items():
                if config.get("enabled"):
                    statuses[name] = {
                        "status": "ok",
                        "message": "Mock printer OK",
                        "config": config,
                    }
            return self.format_response(status="success", data=statuses)

        logger.info("Checking status of all enabled real printers...")
        for name, config in self.printer_configs.items():
            if config.get("enabled"):
                ip = config.get("ip")
                port = config.get("port")
                printer_type = config.get("type", "network")
                status_detail = {
                    "status": "error",
                    "message": "Unknown",
                    "config": config,
                }
                if printer_type == "network" and ip and port:
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(2)
                        result = sock.connect_ex((ip, port))
                        sock.close()
                        if result == 0:
                            status_detail["status"] = "ok"
                            status_detail["message"] = (
                                f"Connected successfully to {ip}:{port}"
                            )
                            logger.info(f"Printer '{name}' ({ip}:{port}) status: OK")
                        else:
                            status_detail["message"] = (
                                f"Connection failed to {ip}:{port} (Error code: {result})"
                            )
                            logger.warning(
                                f"Printer '{name}' ({ip}:{port}) status: ERROR - Connection Failed"
                            )
                    except Exception as e:
                        status_detail["message"] = (
                            f"Error checking {ip}:{port}: {str(e)}"
                        )
                        logger.error(
                            f"Printer '{name}' ({ip}:{port}) status: ERROR - {str(e)}"
                        )
                elif printer_type != "network":
                    status_detail["message"] = (
                        f"Status check not implemented for type '{printer_type}'"
                    )
                    logger.warning(
                        f"Printer '{name}' status: UNKNOWN - Type '{printer_type}'"
                    )
                else:
                    status_detail["message"] = "Missing IP or Port configuration"
                    logger.error(
                        f"Printer '{name}' status: ERROR - Configuration Incomplete"
                    )
                statuses[name] = status_detail
            else:
                logger.debug(f"Skipping disabled printer: {name}")

        all_ok = all(details["status"] == "ok" for details in statuses.values())
        overall_status = "success" if all_ok else "warning"
        overall_message = (
            "All enabled printers connected."
            if all_ok
            else "One or more printers disconnected."
        )
        logger.info(f"Printer status check complete: {overall_message}")
        return self.format_response(
            status=overall_status, message=overall_message, data=statuses
        )

    def handle_error(self, error: Exception) -> Dict[str, Any]:
        return self.format_response(status="error", message=str(error))
