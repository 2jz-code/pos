from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch
from .testing.mock_controller import MockHardwareController

class CashDrawerTests(TestCase):
    def test_open_drawer_success(self):
        with patch('hardware.views.MockHardwareController') as mock_controller:
            # Configure mock to return success
            mock_instance = mock_controller.return_value
            mock_instance.open_cash_drawer.return_value = {
                "status": "success",
                "message": "Cash drawer opened"
            }
            
            response = self.client.post(reverse('hardware:open_cash_drawer'))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'success')

    def test_open_drawer_failure(self):
        with patch('hardware.views.MockHardwareController') as mock_controller:
            # Configure mock to return error
            mock_instance = mock_controller.return_value
            mock_instance.open_cash_drawer.return_value = {
                "status": "error",
                "message": "Cash drawer not connected"
            }
            
            response = self.client.post(reverse('hardware:open_cash_drawer'))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'error')


from channels.testing import WebsocketCommunicator
from hardware.consumers import HardwareConsumer

class WebSocketTests(TestCase):
    async def test_websocket_connection(self):
        communicator = WebsocketCommunicator(HardwareConsumer.as_asgi(), "/ws/hardware/")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_payment_processing(self):
        communicator = WebsocketCommunicator(HardwareConsumer.as_asgi(), "/ws/hardware/")
        await communicator.connect()
        
        await communicator.send_json_to({
            'action': 'process_payment',
            'payment_data': {
                'amount': 50.00,
                'card_type': 'visa'
            }
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['status'], 'success')
        await communicator.disconnect()