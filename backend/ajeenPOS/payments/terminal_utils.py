# payments/terminal_utils.py

import stripe
from django.conf import settings

# Configure Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY

def create_connection_token():
    """
    Create a connection token for Stripe Terminal
    
    Returns:
        str: The connection token secret
    """
    try:
        connection_token = stripe.terminal.ConnectionToken.create()
        return connection_token.secret
    except stripe.error.StripeError as e:
        # Log the error
        print(f"Error creating connection token: {str(e)}")
        raise e

def create_terminal_payment_intent(amount, currency='usd', metadata=None, description=None):
    """
    Create a payment intent for card-present transactions
    
    Args:
        amount: Amount in cents
        currency: Currency code (default: usd)
        metadata: Additional metadata for the payment intent
        description: Description for the payment intent
        
    Returns:
        Payment intent object
    """
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            payment_method_types=['card_present'],
            capture_method='manual',
            metadata=metadata or {},
            description=description
        )
        return intent
    except stripe.error.StripeError as e:
        # Log the error
        print(f"Error creating terminal payment intent: {str(e)}")
        raise e

def capture_payment_intent(payment_intent_id):
    """
    Capture a payment intent
    
    Args:
        payment_intent_id: The ID of the payment intent to capture
        
    Returns:
        Payment intent object
    """
    try:
        intent = stripe.PaymentIntent.capture(payment_intent_id)
        return intent
    except stripe.error.StripeError as e:
        # Log the error
        print(f"Error capturing payment intent: {str(e)}")
        raise e