# hardware/consumers/cash_drawer.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
import asyncio
from ..controllers.cash_drawer import CashDrawerController

logger = logging.getLogger(__name__)

class CashDrawerConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.controller = None
    
    def initialize_controller(self):
        """Initialize the cash drawer controller"""
        self.controller = CashDrawerController()

    async def connect(self):
        """Handle WebSocket connection"""
        await self.accept()
        
        # Initialize controller
        self.initialize_controller()
        
        # Get and send initial drawer state
        drawer_state = self.controller.get_drawer_state()
        await self.send_json({
            "type": "connection_established",
            "status": "connected",
            "drawer_state": drawer_state["state"]
        })

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"Cash drawer disconnected with code: {close_code}")

    async def receive_json(self, content):
        """Handle incoming WebSocket messages"""
        message_type = content.get('type')
        message_id = content.get('id')
        
        # Immediately acknowledge receipt
        await self.send_json({
            "type": "message_received",
            "id": message_id,
            "original_type": message_type
        })

        try:
            if message_type == 'open_drawer':
                await self._handle_open_drawer(message_id)
            elif message_type == 'close_drawer':
                await self._handle_close_drawer(message_id)
            elif message_type == 'print_receipt':
                await self._handle_print_receipt(content, message_id)
            else:
                await self.send_json({
                    "type": "error",
                    "message": f"Unknown operation type: {message_type}",
                    "id": message_id
                })
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send_json({
                "type": "drawer_operation",
                "operation": message_type.replace('_drawer', ''),
                "status": "error",
                "message": str(e),
                "state": "error",
                "id": message_id
            })

    async def _handle_open_drawer(self, message_id):
        await self.send_json({
            "type": "drawer_operation",
            "operation": "open",
            "status": "processing",
            "state": "processing",
            "id": message_id
        })

        result = await asyncio.to_thread(self.controller.open_cash_drawer)
        
        await self.send_json({
            "type": "drawer_operation",
            "operation": "open",
            "status": result["status"],
            "message": result["message"],
            "state": "open" if result["status"] == "success" else "error",
            "id": message_id
        })

    async def _handle_close_drawer(self, message_id):
        await self.send_json({
            "type": "drawer_operation",
            "operation": "close",
            "status": "processing",
            "state": "processing",
            "id": message_id
        })

        result = await asyncio.to_thread(self.controller.close_cash_drawer)
        
        await self.send_json({
            "type": "drawer_operation",
            "operation": "close",
            "status": result["status"],
            "message": result["message"],
            "state": "closed" if result["status"] == "success" else "error",
            "id": message_id
        })

    async def _handle_print_receipt(self, content, message_id):
        receipt_data = content.get('receipt_data', {})
        
        await self.send_json({
            "type": "print_operation",
            "status": "processing",
            "id": message_id
        })

        result = await asyncio.to_thread(
            self.controller.print_receipt,
            receipt_data
        )
        
        await self.send_json({
            "type": "print_operation",
            "status": result["status"],
            "message": result["message"],
            "id": message_id,
            "receipt_data": result.get("receipt_data")
        })