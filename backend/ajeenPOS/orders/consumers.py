# orders/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Order

class WebsiteOrderStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.room_group_name = f'website_order_{self.order_id}'
        self.global_group_name = 'global_website_prep_time_updates'  # Global group for preparation time updates
        
        # Join room group for specific order
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Join global group for preparation time updates
        await self.channel_layer.group_add(
            self.global_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial status
        order_data = await self.get_order_data(self.order_id)
        if order_data:
            # Calculate estimated preparation time
            estimated_time = await self.calculate_individual_prep_time(self.order_id)
            
            # Send initial status with preparation time
            await self.send(text_data=json.dumps({
                'type': 'order_status_update',
                'status': order_data['status'],
                'payment_status': order_data['payment_status'],
                'estimated_preparation_time': estimated_time
            }))
            
            print(f"Connected to websocket for order {self.order_id}. Status: {order_data['status']}, Est. Time: {estimated_time} min")
    
    async def disconnect(self, close_code):
        # Leave both groups when disconnected
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            self.global_group_name,
            self.channel_name
        )
        print(f"Disconnected from websocket for order {self.order_id}")
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        # We don't expect clients to send messages for website orders,
        # but we'll keep this for future functionality
        try:
            data = json.loads(text_data)
            print(f"Received websocket message for order {self.order_id}: {data}")
        except Exception as e:
            print(f"Error processing websocket message: {str(e)}")
    
    # Handler for order status updates
    async def order_status_update(self, event):
        # Forward the status update to the connected client
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'status': event.get('status'),
            'payment_status': event.get('payment_status', None),
            'estimated_preparation_time': event.get('estimated_preparation_time', None)
        }))
        print(f"Sent status update to client for order {self.order_id}: {event}")
    
    # Handler for status_update messages (this matches the signal's message type)
    async def status_update(self, event):
        # Add estimated time to the event
        estimated_time = await self.calculate_individual_prep_time(self.order_id)
        event['estimated_preparation_time'] = estimated_time
        
        # Forward to client with the order_status_update type that frontend expects
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'status': event.get('status'),
            'payment_status': event.get('payment_status'),
            'estimated_preparation_time': estimated_time
        }))
        print(f"Sent status update to client for order {self.order_id}: {event}")
    
    # Update the prep_time_update method in WebsiteOrderStatusConsumer
    async def prep_time_update(self, event):
        """Handle preparation time updates"""
        print(f"Prep time update received for order {self.order_id}: {event}")
        
        # Send the update to the WebSocket client
        await self.send(text_data=json.dumps({
            'type': 'prep_time_update',
            'estimated_preparation_time': event.get('estimated_preparation_time')
        }))
    
    @database_sync_to_async
    def get_order_data(self, order_id):
        try:
            order = Order.objects.get(id=order_id, source='website')
            return {
                'status': order.status,
                'payment_status': order.payment_status,
                'order': order  # Return the actual order object for calculations
            }
        except Order.DoesNotExist:
            return None
    
    @database_sync_to_async
    def calculate_individual_prep_time(self, order_id):
        """
        Calculate the estimated preparation time for a specific order based on its position in the queue.
        """
        try:
            # Get all pending website orders, ordered by creation time
            pending_orders = Order.objects.filter(
                status="pending", 
                source='website'
            ).order_by('created_at')
            
            # Find the position of this order in the queue
            for index, order in enumerate(pending_orders):
                if str(order.id) == str(order_id):
                    # Each order takes 15 minutes, calculate based on position
                    prep_time = (index + 1) * 15
                    print(f"Calculated prep time for order {order_id}: {prep_time} min (position {index+1})")
                    return prep_time
            
            # If order is not pending, return a default time
            order = Order.objects.get(id=order_id)
            if order.status == "completed":
                return 0
            elif order.status == "preparing":
                return 10
            else:
                return 20
                
        except Exception as e:
            print(f"Error calculating prep time for order {order_id}: {str(e)}")
            return 30  # Default fallback time