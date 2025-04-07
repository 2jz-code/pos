# discounts/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from users.permissions import IsAdminUser
from .models import Discount
from .serializers import DiscountSerializer
from django.utils import timezone

class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        """
        Override get_queryset to update expired discounts before returning the list.
        This ensures expired discounts are automatically deactivated when the list is fetched.
        """
        queryset = super().get_queryset()
        
        # First, update any expired promotional discounts to inactive
        now = timezone.now()
        expired_discounts = queryset.filter(
            discount_category='promotional',
            end_date__lt=now,
            is_active=True
        )
        
        # Bulk update to improve performance
        if expired_discounts.exists():
            # Log how many discounts are being deactivated
            count = expired_discounts.count()
            print(f"Deactivating {count} expired discounts")
            
            # Perform the bulk update
            expired_discounts.update(is_active=False)
        
        # Return the queryset (which will now reflect the updated active statuses)
        return queryset
    
    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        """Validate a discount code for an order"""
        code = request.data.get('code')
        order_amount = request.data.get('order_amount')
        
        if not code:
            return Response({'error': 'Discount code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            discount = Discount.objects.get(code=code, is_active=True)
            
            if discount.discount_category == 'permanent':
                # Permanent discounts don't check for dates, just if they're active
                if not discount.is_active:
                    return Response({'valid': False, 'message': 'This discount is not active'})
            else:
                # For promotional discounts, check dates
                now = timezone.now()
                if discount.start_date and now < discount.start_date:
                    return Response({'valid': False, 'message': 'This discount is not yet active'})
                if discount.end_date and now > discount.end_date:
                    return Response({'valid': False, 'message': 'This discount has expired'})
            
            # Calculate discount amount
            discount_amount = 0
            if discount.apply_to == 'order':
                discount_amount = discount.calculate_discount_amount(order_amount)
            else:
                # For product/category specific discounts, this would need cart details
                # This is a simplified version
                return Response({'valid': True, 'message': 'Please add qualifying items to your cart'})
            
            return Response({
                'valid': True,
                'discount': DiscountSerializer(discount).data,
                'discount_amount': discount_amount
            })
        except Discount.DoesNotExist:
            return Response({'valid': False, 'message': 'Invalid discount code'})