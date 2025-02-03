from django.db import models
from orders.models import Order

class SalesReport(models.Model):
    date = models.DateField(auto_now_add=True)
    total_sales = models.IntegerField()
    revenue = models.DecimalField(max_digits=10, decimal_places=2)
