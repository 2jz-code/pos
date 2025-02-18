# hardware/middleware.py
import logging

logger = logging.getLogger(__name__)

class HardwareDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log incoming request details
        if request.path.startswith('/api/hardware/'):
            logger.debug(f"Hardware API Request: {request.method} {request.path}")
            logger.debug(f"Headers: {dict(request.headers)}")

        response = self.get_response(request)

        # Log response details
        if request.path.startswith('/api/hardware/'):
            logger.debug(f"Response Status: {response.status_code}")
            logger.debug(f"Response Headers: {dict(response.headers)}")

        return response