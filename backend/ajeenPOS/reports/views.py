# reports/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import SavedReport, ReportType
from .serializers import (
    SavedReportSerializer, 
    SalesReportSerializer, 
    ProductReportSerializer,
    PaymentReportSerializer
)
from .utils import (
    generate_sales_report,
    generate_product_report,
    generate_payment_report,
    generate_operational_insights,
    serialize_report_parameters
)
from products.models import Category
import datetime

class SavedReportListView(APIView):
    """List all saved reports or create a new one"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        reports = SavedReport.objects.all()
        serializer = SavedReportSerializer(reports, many=True)
        return Response(serializer.data)

class SavedReportDetailView(APIView):
    """Retrieve, update or delete a saved report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            report = SavedReport.objects.get(pk=pk)
            serializer = SavedReportSerializer(report)
            return Response(serializer.data)
        except SavedReport.DoesNotExist:
            return Response(
                {"error": "Report not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, pk):
        try:
            report = SavedReport.objects.get(pk=pk)
            report.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SavedReport.DoesNotExist:
            return Response(
                {"error": "Report not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SalesReportView(APIView):
    """Generate sales reports"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SalesReportSerializer(data=request.data)
        if serializer.is_valid():
            # Extract parameters from the validated data
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            group_by = serializer.validated_data['group_by']
            include_tax = serializer.validated_data['include_tax']
            include_refunds = serializer.validated_data['include_refunds']
            save_report = serializer.validated_data['save_report']
            
            # Generate the report
            report_data = generate_sales_report(
                start_date, end_date, group_by, include_tax, include_refunds
            )
            
            # Save the report if requested
            if save_report:
                report_name = serializer.validated_data.get('report_name', 'Sales Report')
                if not report_name:
                    report_name = f"Sales Report {start_date} to {end_date}"
                
                # Serialize parameters before saving
                serialized_params = serialize_report_parameters(serializer.validated_data)
                
                SavedReport.objects.create(
                    name=report_name,
                    report_type=ReportType.DAILY_SALES if group_by == 'day' else 
                              ReportType.WEEKLY_SALES if group_by == 'week' else
                              ReportType.MONTHLY_SALES,
                    date_range_start=start_date,
                    date_range_end=end_date,
                    parameters=serialized_params,  # Use serialized parameters
                    result_data=report_data
                )
            
            return Response(report_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductReportView(APIView):
    """Generate product performance reports"""
    permission_classes = [IsAuthenticated]
    
    def get_categories(self, request):
        """Helper method to return all product categories"""
        categories = Category.objects.all().values_list('name', flat=True)
        return Response(list(categories))
    
    def get(self, request):
        # If 'categories' query param is present, return list of categories
        if request.query_params.get('categories') == 'true':
            return self.get_categories(request)
        
        return Response(
            {"error": "Use POST method to generate product reports"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def post(self, request):
        serializer = ProductReportSerializer(data=request.data)
        if serializer.is_valid():
            # Extract parameters from the validated data
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            category = serializer.validated_data.get('category')
            limit = serializer.validated_data['limit']
            sort_by = serializer.validated_data['sort_by']
            save_report = serializer.validated_data['save_report']
            
            # Generate the report - pass date_field parameter
            report_data = generate_product_report(
                start_date, end_date, category, limit, sort_by, date_field='updated_at'
            )
            
            # Save the report if requested
            if save_report:
                report_name = serializer.validated_data.get('report_name', 'Product Report')
                if not report_name:
                    report_name = f"Product Report {start_date} to {end_date}"
                
                # Serialize parameters before saving
                serialized_params = serialize_report_parameters(serializer.validated_data)
                
                SavedReport.objects.create(
                    name=report_name,
                    report_type=ReportType.PRODUCT_PERFORMANCE,
                    date_range_start=start_date,
                    date_range_end=end_date,
                    parameters=serialized_params,  # Use serialized parameters
                    result_data=report_data
                )
            
            return Response(report_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PaymentReportView(APIView):
    """Generate payment analytics reports"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PaymentReportSerializer(data=request.data)
        if serializer.is_valid():
            # Extract parameters from the validated data
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            group_by = serializer.validated_data['group_by']
            save_report = serializer.validated_data['save_report']
            
            # Generate the report - pass date_field parameter
            report_data = generate_payment_report(
                start_date, end_date, group_by, date_field='updated_at'
            )
            # Save the report if requested
            if save_report:
                report_name = serializer.validated_data.get('report_name', 'Payment Report')
                if not report_name:
                    report_name = f"Payment Report {start_date} to {end_date}"
                
                # Serialize parameters before saving
                serialized_params = serialize_report_parameters(serializer.validated_data)
                
                SavedReport.objects.create(
                    name=report_name,
                    report_type=ReportType.PAYMENT_ANALYTICS,
                    date_range_start=start_date,
                    date_range_end=end_date,
                    parameters=serialized_params,  # Use serialized parameters
                    result_data=report_data
                )
            
            return Response(report_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OperationalInsightsView(APIView):
    """Generate operational insights reports"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Validate date parameters
        try:
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            save_report = request.data.get('save_report', False)
            report_name = request.data.get('report_name', '')
            
            if not start_date or not end_date:
                return Response(
                    {"error": "start_date and end_date are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate the report - pass date_field parameter
            report_data = generate_operational_insights(start_date, end_date, date_field='updated_at')
            
            # Save the report if requested
            if save_report:
                if not report_name:
                    report_name = f"Operational Insights {start_date} to {end_date}"
                
                # Serialize parameters before saving
                serialized_params = serialize_report_parameters(request.data)
                
                SavedReport.objects.create(
                    name=report_name,
                    report_type=ReportType.OPERATIONAL_INSIGHTS,
                    date_range_start=start_date,
                    date_range_end=end_date,
                    parameters=serialized_params,  # Use serialized parameters
                    result_data=report_data
                )
            
            return Response(report_data)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class DashboardSummaryView(APIView):
    """Generate a summary for the dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get today's date
            today = timezone.now().date()
            
            # Get yesterday's date
            yesterday = today - datetime.timedelta(days=1)
            
            # Get first day of current month
            first_day_of_month = today.replace(day=1)
            
            # Get first day of previous month
            if today.month == 1:
                previous_month = today.replace(year=today.year-1, month=12, day=1)
            else:
                previous_month = today.replace(month=today.month-1, day=1)
            
            # Get first day of current year
            first_day_of_year = today.replace(month=1, day=1)
            
            # Calculate date ranges
            today_range = (
                datetime.datetime.combine(today, datetime.time.min),
                datetime.datetime.combine(today, datetime.time.max)
            )
            
            yesterday_range = (
                datetime.datetime.combine(yesterday, datetime.time.min),
                datetime.datetime.combine(yesterday, datetime.time.max)
            )
            
            this_month_range = (
                datetime.datetime.combine(first_day_of_month, datetime.time.min),
                datetime.datetime.combine(today, datetime.time.max)
            )
            
            last_month_range = (
                datetime.datetime.combine(previous_month, datetime.time.min),
                datetime.datetime.combine(first_day_of_month - datetime.timedelta(days=1), datetime.time.max)
            )
            
            this_year_range = (
                datetime.datetime.combine(first_day_of_year, datetime.time.min),
                datetime.datetime.combine(today, datetime.time.max)
            )
            
            # Get sales data for different periods
            today_sales = generate_sales_report(today_range[0], today_range[1], date_field='updated_at')
            yesterday_sales = generate_sales_report(yesterday_range[0], yesterday_range[1], date_field='updated_at')
            this_month_sales = generate_sales_report(this_month_range[0], this_month_range[1], date_field='updated_at')
            last_month_sales = generate_sales_report(last_month_range[0], last_month_range[1], date_field='updated_at')
            this_year_sales = generate_sales_report(this_year_range[0], this_year_range[1], date_field='updated_at')

            # Get product data for this month - specify date_field
            product_data = generate_product_report(
                this_month_range[0], 
                this_month_range[1], 
                limit=5,
                date_field='updated_at'
            )

            # Get payment data for this month - specify date_field
            payment_data = generate_payment_report(
                this_month_range[0],
                this_month_range[1],
                date_field='updated_at'
            )
            
            # Calculate growth rates - handle case where there's no data
            if yesterday_sales['summary']['total_revenue'] > 0:
                daily_growth = ((today_sales['summary']['total_revenue'] - yesterday_sales['summary']['total_revenue']) / 
                               yesterday_sales['summary']['total_revenue']) * 100
            else:
                daily_growth = 100 if today_sales['summary']['total_revenue'] > 0 else 0
            
            if last_month_sales['summary']['total_revenue'] > 0:
                monthly_growth = ((this_month_sales['summary']['total_revenue'] - last_month_sales['summary']['total_revenue']) / 
                                 last_month_sales['summary']['total_revenue']) * 100
            else:
                monthly_growth = 100 if this_month_sales['summary']['total_revenue'] > 0 else 0
            
            # Ensure we have product data, or provide empty defaults
            products = product_data.get('products', [])
            if not products:
                products = []
            
            # Ensure we have payment method data, or provide empty defaults
            payment_methods = payment_data.get('data', [])
            if not payment_methods:
                payment_methods = []
            
            # Compile dashboard summary
            summary = {
                'today': {
                    'date': today.strftime('%Y-%m-%d'),
                    'sales': today_sales['summary']['total_revenue'],
                    'orders': today_sales['summary']['total_orders'],
                    'growth': round(daily_growth, 2)
                },
                'this_month': {
                    'month': today.strftime('%B %Y'),
                    'sales': this_month_sales['summary']['total_revenue'],
                    'orders': this_month_sales['summary']['total_orders'],
                    'growth': round(monthly_growth, 2)
                },
                'this_year': {
                    'year': today.strftime('%Y'),
                    'sales': this_year_sales['summary']['total_revenue'],
                    'orders': this_year_sales['summary']['total_orders'],
                },
                'top_products': products[:5],
                'payment_methods': payment_methods,
            }
            
            return Response(summary)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )