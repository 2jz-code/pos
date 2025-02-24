# hardware/consumers/card_payment.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
import asyncio
from ..controllers.card_payment import CardPaymentController

logger = logging.getLogger(__name__)

class CardPaymentConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.controller = None

    def initialize_controller(self):
        """Initialize the card payment controller"""
        self.controller = CardPaymentController()

    async def connect(self):
        """Handle WebSocket connection"""
        await self.accept()
        self.initialize_controller()
        
        await self.send_json({
            "type": "connection_established",
            "status": "connected",
            "device": "card_reader"
        })

    async def receive_json(self, content):
        """Handle incoming WebSocket messages"""
        message_type = content.get('type')
        message_id = content.get('id')
        
        # Acknowledge receipt
        await self.send_json({
            "type": "message_received",
            "id": message_id,
            "original_type": message_type
        })

        try:
            if message_type == 'process_payment':
                await self._handle_payment_process(content, message_id)
            elif message_type == 'cancel_payment':
                await self._handle_payment_cancel(message_id)
            else:
                await self.send_json({
                    "type": "error",
                    "message": f"Unknown operation type: {message_type}",
                    "id": message_id
                })
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send_json({
                "type": "card_operation",
                "operation": "process",
                "status": "error",
                "message": str(e),
                "id": message_id
            })

    async def _handle_payment_process(self, content, message_id):
        amount = content.get('amount')
        
        # Send initial processing state
        await self.send_json({
            "type": "card_operation",
            "operation": "process",
            "status": "waiting_for_card",
            "message": "Please insert or swipe card",
            "id": message_id
        })

        # Simulate card read delay
        await asyncio.sleep(2)

        # Send card read state
        await self.send_json({
            "type": "card_operation",
            "operation": "process",
            "status": "processing",
            "message": "Processing payment...",
            "id": message_id
        })

        # Process payment
        result = await asyncio.to_thread(
            self.controller.process_payment,
            amount
        )
        
        # Send final result
        await self.send_json({
            "type": "card_operation",
            "operation": "process",
            "status": result["status"],
            "message": result["message"],
            "transaction_id": result.get("transaction_id"),
            "card_type": result.get("card_type"),
            "last_four": result.get("last_four"),
            "id": message_id
        })

    async def _handle_payment_cancel(self, message_id):
        result = await asyncio.to_thread(self.controller.cancel_payment)
        
        await self.send_json({
            "type": "card_operation",
            "operation": "cancel",
            "status": result["status"],
            "message": result["message"],
            "id": message_id
        })