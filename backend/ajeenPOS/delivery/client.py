# combined-project/backend/delivery_integrations/client.py

import jwt
import requests
import time
import uuid
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

# DoorDash Drive API endpoint (use sandbox first!)
# DOORDASH_API_BASE_URL = "https://openapi.doordash.com" # Production URL
DOORDASH_API_BASE_URL = "https://openapi.doordash.com/sandbox" # Sandbox URL - Use this for testing!


def get_doordash_drive_jwt():
    """Generates a JWT for DoorDash Drive API authentication."""
    try:
        # Retrieve credentials securely from Django settings (loaded from environment variables)
        access_key_id = settings.DOORDASH_DRIVE_ACCESS_KEY_ID
        signing_secret = settings.DOORDASH_DRIVE_SIGNING_SECRET

        if not access_key_id or not signing_secret:
            logger.error("DoorDash Drive API credentials missing in settings.")
            return None

        headers = {"kid": access_key_id}
        payload = {
            "aud": "doordash",
            "iss": access_key_id,
            "kid": access_key_id,
            "exp": timezone.now() + timedelta(minutes=30), # Token valid for 30 mins
            "iat": timezone.now(),
        }

        token = jwt.encode(
            payload,
            jwt.utils.base64url_decode(signing_secret), # Decode secret as per DoorDash docs
            algorithm="HS256",
            headers=headers,
        )
        return token

    except Exception as e:
        logger.error(f"Error generating DoorDash Drive JWT: {e}")
        return None

def create_drive_delivery(order_details):
    """
    Sends a request to the DoorDash Drive API to create a new delivery.

    Args:
        order_details (dict): A dictionary containing delivery information
                              formatted according to DoorDash Drive API spec.
                              Example keys: external_delivery_id, pickup_address,
                              dropoff_address, pickup_phone_number, dropoff_phone_number,
                              dropoff_contact_given_name, dropoff_contact_family_name,
                              order_value, items, tip, etc.

    Returns:
        dict: The JSON response from DoorDash API if successful, None otherwise.
    """
    jwt_token = get_doordash_drive_jwt()
    if not jwt_token:
        return None

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json",
    }

    # Ensure a unique external_delivery_id is provided in order_details
    if 'external_delivery_id' not in order_details:
         logger.error("external_delivery_id missing in order_details for DoorDash Drive request.")
         return None

    api_url = f"{DOORDASH_API_BASE_URL}/drive/v2/deliveries"

    try:
        logger.info(f"Sending DoorDash Drive delivery request for external_id: {order_details.get('external_delivery_id')}")
        response = requests.post(api_url, headers=headers, json=order_details, timeout=15) # 15 second timeout
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        response_data = response.json()
        logger.info(f"DoorDash Drive delivery created successfully: {response_data.get('external_delivery_id')}")
        return response_data

    except requests.exceptions.RequestException as e:
        logger.error(f"Error requesting DoorDash Drive delivery: {e}")
        # Log response body if available for more details on API errors
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"DoorDash API Response Status: {e.response.status_code}")
            logger.error(f"DoorDash API Response Body: {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during DoorDash Drive request: {e}")
        return None

# --- You might add other client functions here later ---
# def get_drive_delivery_status(doordash_delivery_id): ...
# def cancel_drive_delivery(doordash_delivery_id): ...