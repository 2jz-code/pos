# hardware/views.py
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import json

# Import the new controllers
from .controllers.cash_drawer import CashDrawerController
from .testing.mock_cash_drawer import MockCashDrawerController

@method_decorator(csrf_exempt, name='dispatch')
class CashDrawerView(View):
    def get_controller(self):
        """Get the appropriate controller based on environment"""
        return CashDrawerController()

    def post(self, request):
        controller = self.get_controller()
        result = controller.open_cash_drawer()
        return JsonResponse(result)

@method_decorator(csrf_exempt, name='dispatch')
class DebugSimulationView(View):
    def post(self, request, mode):
        if not settings.DEBUG:
            return JsonResponse({
                "status": "error", 
                "message": "Debug mode disabled"
            })
            
        # Use MockCashDrawerController directly for simulation
        controller = MockCashDrawerController()
        try:
            controller.set_simulation_mode(mode)
            return JsonResponse({
                "status": "success", 
                "mode": mode
            })
        except ValueError as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

    def options(self, request, *args, **kwargs):
        response = JsonResponse({})
        return response

@method_decorator(csrf_exempt, name='dispatch')
class DrawerStateView(View):
    def get_controller(self):
        """Get the appropriate controller based on environment"""
        return CashDrawerController()

    def get(self, request):
        controller = self.get_controller()
        result = controller.get_drawer_state()
        return JsonResponse(result)
    
    def post(self, request):
        controller = self.get_controller()
        try:
            action = json.loads(request.body).get('action')
            
            if action == 'close':
                result = controller.close_cash_drawer()
            else:
                result = {
                    "status": "error", 
                    "message": "Invalid action"
                }
                
            return JsonResponse(result)
        except json.JSONDecodeError:
            return JsonResponse({
                "status": "error",
                "message": "Invalid JSON data"
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

@method_decorator(csrf_exempt, name='dispatch')
class ReceiptPrinterView(View):
    def get_controller(self):
        """Get the appropriate controller based on environment"""
        return CashDrawerController()  # Cash drawer controller handles printing

    def post(self, request):
        controller = self.get_controller()
        try:
            receipt_data = json.loads(request.body)
            result = controller.print_receipt(receipt_data)
            return JsonResponse(result)
        except json.JSONDecodeError:
            return JsonResponse({
                "status": "error",
                "message": "Invalid JSON data"
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })