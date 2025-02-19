# hardware/consumers.py
from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from .controllers import SimpleHardwareController
from .testing.mock_controller import MockHardwareController
from django.conf import settings

class HardwareConsumer(JsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.controller = (
            MockHardwareController()
            if settings.DEBUG
            else SimpleHardwareController()
        )

    def connect(self):
        self.accept()
        self.room_name = "hardware_operations"
        self.room_group_name = f"group_{self.room_name}"
        
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

    def receive_json(self, content):
        action = content.get('action')
        
        if action == 'open_drawer':
            result = self.controller.open_cash_drawer()
            self.send_json({
                'type': 'cash_drawer',
                'status': result['status'],
                'message': result['message'],
                'state': 'open' if result['status'] == 'success' else 'closed'
            })
            
        elif action == 'close_drawer':
            result = self.controller.close_cash_drawer()
            self.send_json({
                'type': 'cash_drawer',
                'status': result['status'],
                'message': result['message'],
                'state': 'closed' if result['status'] == 'success' else 'open'
            })
            
        elif action == 'subscribe_drawer_state':
            result = self.controller.get_drawer_state()
            self.send_json({
                'type': 'drawer_state',
                'state': result['state']
            })