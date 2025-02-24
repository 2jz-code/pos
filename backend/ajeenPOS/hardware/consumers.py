# hardware/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
from .controllers import SimpleHardwareController
from django.conf import settings
from .testing.mock_cash_drawer import MockHardwareController
import asyncio


class HardwareConsumer(AsyncJsonWebsocketConsumer):
    def get_controller(self):
        if settings.DEBUG or getattr(settings, 'TESTING', False):
            return MockHardwareController()
        return SimpleHardwareController()
    
    async def connect(self):
        await self.channel_layer.group_add("hardware_operations", self.channel_name)
        await self.accept()
        
        # Initialize controller
        self.controller = MockHardwareController() if settings.DEBUG else SimpleHardwareController()
        
        # Send initial state
        drawer_state = self.controller.get_drawer_state()
        await self.send_json({
            "type": "connection_established",
            "status": "connected",
            "drawer_state": drawer_state["state"]
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("hardware_operations", self.channel_name)

    async def receive_json(self, content):
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
                # First, send processing state
                await self.send_json({
                    "type": "drawer_operation",
                    "operation": "open",
                    "status": "processing",
                    "state": "processing",
                    "id": message_id
                })

                # Then perform the actual operation
                result = await asyncio.to_thread(self.controller.open_cash_drawer)
                
                # Send final result
                response = {
                    "type": "drawer_operation",
                    "operation": "open",
                    "status": result["status"],
                    "message": result["message"],
                    "state": "open" if result["status"] == "success" else "error",
                    "id": message_id
                }
                await self.send_json(response)

            elif message_type == 'close_drawer':
                # Similar pattern for close operation
                processing_response = {
                    "type": "drawer_operation",
                    "operation": "close",
                    "status": "processing",
                    "state": "processing",
                    "id": message_id
                }
                await self.send_json(processing_response)

                # Perform operation
                result = await asyncio.to_thread(self.controller.close_cash_drawer)
                
                # Send final result
                final_response = {
                    "type": "drawer_operation",
                    "operation": "close",
                    "status": result["status"],
                    "message": result["message"],
                    "state": "closed" if result["status"] == "success" else "error",
                    "id": message_id
                }
                await self.send_json(final_response)

                
            elif message_type == 'print_receipt':
                receipt_data = content.get('receipt_data', {})
                
                # Send processing state
                await self.send_json({
                    "type": "print_operation",
                    "status": "processing",
                    "id": message_id
                })

                # Perform print operation
                result = await asyncio.to_thread(
                    self.controller.print_receipt, 
                    receipt_data
                )
                
                # Send final result
                await self.send_json({
                    "type": "print_operation",
                    "status": result["status"],
                    "message": result["message"],
                    "id": message_id
                })


        except Exception as e:
            error_response = {
                "type": "drawer_operation",
                "operation": "close",
                "status": "error",
                "message": str(e),
                "state": "error",
                "id": message_id
            }
            await self.send_json(error_response)

    async def hardware_message(self, event):
        await self.send_json(event["content"])