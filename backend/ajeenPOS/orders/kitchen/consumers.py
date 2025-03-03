# orders/kitchen/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from ..models import Order
from datetime import datetime, timedelta
from ..kitchen.serializers import KitchenOrderSerializer
from django.db.models import Q

class KitchenOrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for the kitchen display system
    Provides real-time updates on all pending/preparing orders
    """
    async def connect(self):
        # Join kitchen group
        self.room_group_name = 'kitchen_orders'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial list of active orders
        orders = await self.get_active_orders()
        await self.send(text_data=json.dumps({
            'type': 'initial_orders',
            'orders': orders
        }))
        
        print(f"Kitchen display connected. Sent {len(orders)} active orders.")
    
    async def disconnect(self, close_code):
        # Leave kitchen group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print("Kitchen display disconnected.")
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_prepared':
                order_id = data.get('order_id')
                if order_id:
                    success = await self.mark_order_prepared(order_id)
                    await self.send(text_data=json.dumps({
                        'type': 'action_response',
                        'action': 'mark_prepared',
                        'order_id': order_id,
                        'success': success
                    }))
            
            elif action == 'mark_completed':
                order_id = data.get('order_id')
                if order_id:
                    success = await self.mark_order_completed(order_id)
                    await self.send(text_data=json.dumps({
                        'type': 'action_response',
                        'action': 'mark_completed',
                        'order_id': order_id,
                        'success': success
                    }))
            
            elif action == 'refresh_orders':
                orders = await self.get_active_orders()
                await self.send(text_data=json.dumps({
                    'type': 'orders_update',
                    'orders': orders
                }))
                
        except Exception as e:
            print(f"Error processing kitchen websocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    # Broadcast handlers
    async def order_update(self, event):
        """Handle order updates from signals"""
        # Forward the update to all connected kitchen displays
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'order': event.get('order')
        }))
    
    async def new_order(self, event):
        """Handle new order notifications"""
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'order': event.get('order')
        }))
    
    # Database access methods
    @database_sync_to_async
    def get_active_orders(self):
        """Get all active orders for kitchen display (both POS and online)"""
        # Get active orders that need kitchen attention
        # For website orders: pending, preparing
        # For POS orders: saved, in_progress
        orders = Order.objects.filter(
            # Online orders that need preparation
        (Q(source='website') & Q(status__in=['pending', 'preparing'])) |
        # POS orders that need preparation
        (Q(source='pos') & Q(status__in=['saved', 'in_progress']))
        ).order_by('created_at')
        
        # Use the Kitchen serializer for consistent formatting
        serialized_orders = []
        for order in orders:
            # Serialize the order
            order_data = KitchenOrderSerializer(order).data
            
            # Add kitchen-specific fields based on order type and status
            if order.source == 'website':
                if order.status == 'pending':
                    # Online pending order
                    prep_time = 15  # Base time in minutes
                    order_data['estimated_prep_time'] = prep_time
                    order_data['kitchen_status'] = 'pending'
                    
                    # Calculate progress
                    elapsed = datetime.now().timestamp() - order.created_at.timestamp()
                    total_seconds = prep_time * 60
                    order_data['progress_percent'] = min(100, int((elapsed / total_seconds) * 100))
                
                elif order.status == 'preparing':
                    # Online preparing order
                    order_data['kitchen_status'] = 'preparing'
                    prep_start = order.updated_at
                    elapsed = datetime.now().timestamp() - prep_start.timestamp()
                    remaining_minutes = max(5, 15 - (elapsed / 60))
                    order_data['estimated_prep_time'] = int(remaining_minutes)
                    order_data['progress_percent'] = min(100, int((elapsed / (15 * 60)) * 100))
            
            elif order.source == 'pos':
                if order.status == 'saved':
                    # POS saved order (equivalent to pending)
                    order_data['kitchen_status'] = 'pending'
                    order_data['estimated_prep_time'] = 15
                    
                    # Calculate progress
                    elapsed = datetime.now().timestamp() - order.created_at.timestamp()
                    total_seconds = 15 * 60
                    order_data['progress_percent'] = min(100, int((elapsed / total_seconds) * 100))
                
                elif order.status == 'in_progress':
                    # POS in-progress order (equivalent to preparing)
                    order_data['kitchen_status'] = 'preparing'
                    prep_start = order.updated_at
                    elapsed = datetime.now().timestamp() - prep_start.timestamp()
                    remaining_minutes = max(5, 15 - (elapsed / 60))
                    order_data['estimated_prep_time'] = int(remaining_minutes)
                    order_data['progress_percent'] = min(100, int((elapsed / (15 * 60)) * 100))
            
            # Add item count for display
            order_data['item_count'] = order.items.count()
            
            serialized_orders.append(order_data)
        
        return serialized_orders
    
    @database_sync_to_async
    def mark_order_prepared(self, order_id):
        """Mark an order as 'preparing/in-progress' based on its source"""
        try:
            order = Order.objects.get(id=order_id)
            
            # Update status based on order source
            if order.source == 'website' and order.status == 'pending':
                order.status = 'preparing'
                order.save()
                return True
            elif order.source == 'pos' and order.status == 'saved':
                order.status = 'in_progress'
                order.save()
                return True
            else:
                print(f"Cannot mark order {order_id} as prepared: Invalid status transition from {order.status}")
                return False
                
        except Order.DoesNotExist:
            print(f"Order {order_id} not found")
            return False
    
    @database_sync_to_async
    def mark_order_completed(self, order_id):
        """Mark an order as 'completed'"""
        try:
            order = Order.objects.get(id=order_id)
            
            # Check if the order can be completed based on its current status
            valid_statuses = []
            if order.source == 'website':
                valid_statuses = ['pending', 'preparing']
            elif order.source == 'pos':
                valid_statuses = ['saved', 'in_progress']
            
            if order.status in valid_statuses:
                order.status = 'completed'
                order.save()
                return True
            else:
                print(f"Cannot mark order {order_id} as completed: Invalid status transition from {order.status}")
                return False
                
        except Order.DoesNotExist:
            print(f"Order {order_id} not found")
            return False