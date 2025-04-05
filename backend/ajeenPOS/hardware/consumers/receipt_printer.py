# hardware/consumers/receipt_printer.py
import asyncio
import logging
from typing import Dict, Any
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from ..controllers.receipt_printer import ReceiptPrinterController

logger = logging.getLogger(__name__)

class ReceiptPrinterConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for receipt printer operations"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.controller = None

    def initialize_controller(self):
        """Initialize the receipt printer controller"""
        self.controller = ReceiptPrinterController()
    
    async def connect(self):
        """Handle WebSocket connection"""
        await self.accept()
        self.initialize_controller()
        
        # Send initial state
        await self.send_json({
            "type": "connection_established",
            "status": "connected",
            "printer_connected": self.controller.is_connected(),
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })

    async def receive_json(self, content: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        message_type = content.get('type')
        message_id = content.get('id', 'unknown')
        
        # Acknowledge receipt
        await self.send_json({
            "type": "message_received",
            "id": message_id,
            "original_type": message_type,
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })

        try:
            if message_type == 'print_receipt':
                await self._handle_print_receipt(content, message_id)
            elif message_type == 'open_drawer':
                await self._handle_open_drawer(message_id)
            elif message_type == "test_connection":
                await self.send_json({
                    "type": "connection_test",
                    "status": "success",
                    "printer_connected": self.controller.is_connected(),
                    "id": message_id,
                    "_source": {
                        "category": "HARDWARE",
                        "endpoint": "RECEIPT_PRINTER"
                    }
                })
            else:
                await self.send_json({
                    "type": "error",
                    "message": f"Unknown operation type: {message_type}",
                    "id": message_id,
                    "_source": {
                        "category": "HARDWARE",
                        "endpoint": "RECEIPT_PRINTER"
                    }
                })
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send_json({
                "type": "error",
                "operation": message_type,
                "status": "error",
                "message": str(e),
                "id": message_id,
                "_source": {
                    "category": "HARDWARE",
                    "endpoint": "RECEIPT_PRINTER"
                }
            })

    async def _handle_print_receipt(self, content: Dict[str, Any], message_id: str):
        """Handle receipt printing operation"""
        receipt_data = content.get('receipt_data', {})
        
        # Send processing status
        await self.send_json({
            "type": "print_operation",
            "status": "processing",
            "id": message_id,
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })

        # Run the printing operation in a thread to avoid blocking the event loop
        result = await asyncio.to_thread(
            self.controller.print_receipt,
            receipt_data
        )
        
        # Send result
        await self.send_json({
            "type": "print_operation",
            "status": result["status"],
            "message": result["message"],
            "id": message_id,
            "receipt_data": result.get("receipt_data"),
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })
    
    async def _handle_open_drawer(self, message_id: str):
        """Handle cash drawer open operation"""
        # Send processing status
        await self.send_json({
            "type": "drawer_operation",
            "operation": "open",
            "status": "processing",
            "id": message_id,
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })

        # Run the operation in a thread to avoid blocking
        result = await asyncio.to_thread(
            self.controller.open_cash_drawer
        )
        
        # Send result
        await self.send_json({
            "type": "drawer_operation",
            "operation": "open",
            "status": result["status"],
            "message": result["message"],
            "id": message_id,
            "_source": {
                "category": "HARDWARE",
                "endpoint": "RECEIPT_PRINTER"
            }
        })