from rest_framework.views import APIView
from rest_framework.response import Response
from orders.models import Order
from django.db.models import Sum

class SalesReport(APIView):
    def get(self, request):
        total_sales = Order.objects.filter(status="completed").count()
        revenue = Order.objects.filter(status="completed").aggregate(Sum("items__product__price"))
        return Response({"total_sales": total_sales, "revenue": revenue["items__product__price__sum"]})
