# payments/stripe_utils.py

import stripe
from django.conf import settings

# Configure Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY

def create_payment_intent(amount, currency='usd', metadata=None):
    """
    Create a payment intent with the given amount
    
    Args:
        amount: Amount in cents
        currency: Currency code (default: usd)
        metadata: Additional metadata for the payment intent
        
    Returns:
        Payment intent object
    """
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata=metadata or {},
            # Optional automatic payment methods
            automatic_payment_methods={
                'enabled': True,
            },
        )
        return intent
    except stripe.error.StripeError as e:
        # Handle Stripe errors
        raise e