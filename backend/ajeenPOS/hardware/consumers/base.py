# hardware/consumers/base.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class BaseHardwareConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection"""
        logger.info(f"{self.__class__.__name__} connecting...")
        await self.accept()
        self.initialize_controller()

    def initialize_controller(self):
        """Initialize the appropriate controller - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement initialize_controller")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"{self.__class__.__name__} disconnected with code: {close_code}")