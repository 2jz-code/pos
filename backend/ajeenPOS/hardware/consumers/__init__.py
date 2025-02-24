# hardware/consumers/__init__.py
from .cash_drawer import CashDrawerConsumer
from .card_payment import CardPaymentConsumer

__all__ = ['CashDrawerConsumer', 'CardPaymentConsumer']