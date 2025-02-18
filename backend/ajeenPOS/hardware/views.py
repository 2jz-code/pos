# hardware/views.py
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .testing.mock_controller import MockHardwareController
from django.conf import settings
from .controllers import SimpleHardwareController
import json


@method_decorator(csrf_exempt, name='dispatch')
class CashDrawerView(View):
    def get_controller(self):
        if settings.DEBUG or getattr(settings, 'TESTING', False):
            return MockHardwareController()
        return SimpleHardwareController()

    def post(self, request):
        controller = self.get_controller()
        result = controller.open_cash_drawer()
        response = JsonResponse(result)
        return response

@method_decorator(csrf_exempt, name='dispatch')
class DebugSimulationView(View):
    def post(self, request, mode):
        if not settings.DEBUG:
            return JsonResponse({"status": "error", "message": "Debug mode disabled"})
            
        controller = MockHardwareController()
        controller.simulation_mode = mode
        response = JsonResponse({"status": "success", "mode": mode})
        return response

    def options(self, request, *args, **kwargs):
        response = JsonResponse({})
        return response
    

@method_decorator(csrf_exempt, name='dispatch')
class DrawerStateView(View):
    def get_controller(self):
        if settings.DEBUG or getattr(settings, 'TESTING', False):
            return MockHardwareController()
        return SimpleHardwareController()

    def get(self, request):
        controller = self.get_controller()
        result = controller.get_drawer_state()
        return JsonResponse(result)
    
    def post(self, request):
        controller = self.get_controller()
        action = json.loads(request.body).get('action')
        
        if action == 'close':
            result = controller.close_cash_drawer()
        else:
            result = {"status": "error", "message": "Invalid action"}
            
        return JsonResponse(result)

@method_decorator(csrf_exempt, name='dispatch')
class ReceiptPrinterView(View):
    def get_controller(self):
        if settings.DEBUG or getattr(settings, 'TESTING', False):
            return MockHardwareController()
        return SimpleHardwareController()

    def post(self, request):
        controller = self.get_controller()
        receipt_data = json.loads(request.body)
        result = controller.print_receipt(receipt_data)
        return JsonResponse(result)