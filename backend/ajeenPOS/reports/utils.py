# reports/utils.py
from datetime import datetime, timedelta, date
import json
from django.db.models import Sum, Count, Avg, F, Q, ExpressionWrapper, DecimalField, FloatField, Value
from django.db.models.functions import TruncDate, TruncDay, TruncWeek, TruncMonth
from orders.models import Order, OrderItem
from products.models import Product, Category
from payments.models import Payment


def serialize_report_parameters(params):
    """Convert date objects to ISO format strings in a dictionary."""
    serialized = {}
    for key, value in params.items():
        if isinstance(value, (date, datetime)):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized

class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that can handle datetime.date and datetime.datetime objects."""
    
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

def generate_sales_report(start_date, end_date, group_by='day', include_tax=True, include_refunds=True, date_field='updated_at'):
    # Convert string dates to datetime if needed
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        # Make end_date inclusive by setting it to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
    
    # Build the filter based on the date_field parameter
    date_filter = {
        f'{date_field}__gte': start_date,
        f'{date_field}__lte': end_date,
        'status': 'completed'
    }
    
    # Base query - completed orders within date range
    query = Order.objects.filter(**date_filter)
    
    # Handle refunds
    if not include_refunds:
        query = query.exclude(payment_status='refunded')
    
    # Set up grouping function based on group_by parameter
    if group_by == 'day':
        trunc_func = TruncDay(date_field)  # Use the specified date field
        date_format = '%Y-%m-%d'
    elif group_by == 'week':
        trunc_func = TruncWeek(date_field)  # Use the specified date field
        date_format = 'Week of %Y-%m-%d'
    elif group_by == 'month':
        trunc_func = TruncMonth(date_field)  # Use the specified date field
        date_format = '%Y-%m'
    else:
        trunc_func = TruncDate(date_field)  # Use the specified date field
        date_format = '%Y-%m-%d'
    
    # Group by the selected time period and annotate
    sales_data = query.annotate(
        date=trunc_func
    ).values('date').annotate(
        order_count=Count('id'),
        total=Sum('total_price'),
        # Calculate tax as 10% of the total price with explicit output_field
        tax=ExpressionWrapper(
            Sum('total_price') * Value(0.1), 
            output_field=DecimalField(max_digits=10, decimal_places=2)
        ),
        # Calculate subtotal as total / 1.1 with explicit output_field
        subtotal=ExpressionWrapper(
            Sum('total_price') / Value(1.1), 
            output_field=DecimalField(max_digits=10, decimal_places=2)
        ),
        avg_order_value=Avg('total_price')
    ).order_by('date')
    
    # Format dates and calculate metrics
    formatted_data = []
    cumulative_total = 0
    
    for entry in sales_data:
        date_str = entry['date'].strftime(date_format)
        cumulative_total += entry['total'] if entry['total'] is not None else 0
        
        formatted_entry = {
            'date': date_str,
            'order_count': entry['order_count'],
            'subtotal': float(entry['subtotal'] or 0),
            'tax': float(entry['tax'] or 0),
            'total': float(entry['total'] or 0),
            'avg_order_value': float(entry['avg_order_value'] or 0),
            'cumulative_total': float(cumulative_total),
        }
        formatted_data.append(formatted_entry)
    
    # Handle case with no data
    if not formatted_data:
        # Return empty report structure
        return {
            'summary': {
                'period_start': start_date.strftime('%Y-%m-%d'),
                'period_end': end_date.strftime('%Y-%m-%d'),
                'total_orders': 0,
                'total_revenue': 0,
                'avg_daily_orders': 0,
                'avg_order_value': 0,
            },
            'data': []
        }
    
    # Calculate summary metrics
    summary = {
        'period_start': start_date.strftime('%Y-%m-%d'),
        'period_end': end_date.strftime('%Y-%m-%d'),
        'total_orders': sum(entry['order_count'] for entry in formatted_data),
        'total_revenue': float(cumulative_total),
        'avg_daily_orders': sum(entry['order_count'] for entry in formatted_data) / len(formatted_data) if formatted_data else 0,
        'avg_order_value': sum(entry['avg_order_value'] * entry['order_count'] for entry in formatted_data) / sum(entry['order_count'] for entry in formatted_data) if sum(entry['order_count'] for entry in formatted_data) else 0,
    }
    
    return {
        'summary': summary,
        'data': formatted_data
    }

def generate_product_report(start_date, end_date, category=None, limit=10, sort_by='revenue', date_field='updated_at'):
    """
    Generate product performance report
    """
    # Convert string dates to datetime if needed
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        # Make end_date inclusive by setting it to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
    
    # Build the filter based on the date_field parameter
    order_date_filter = {
        f'order__{date_field}__gte': start_date,
        f'order__{date_field}__lte': end_date,
        'order__status': 'completed'  # Only include completed orders
    }
    
    # Base query - order items from completed orders within date range
    query = OrderItem.objects.filter(**order_date_filter)
    
    # Filter by category if provided
    if category:
        query = query.filter(product__category__name=category)
    
    # Annotate each order item with its revenue
    annotated_query = query.annotate(
        item_revenue=ExpressionWrapper(
            F('unit_price') * F('quantity'),
            output_field=DecimalField(max_digits=10, decimal_places=2)
        )
    )
        
    # Calculate total revenue and quantity per product
    product_data = annotated_query.values(
        'product__id', 
        'product__name', 
        'product__category__name'
    ).annotate(
        quantity=Sum('quantity'),
        revenue=Sum('item_revenue'),
        avg_price=Avg('unit_price')
    )
    
    # Sort by the selected metric
    if sort_by == 'quantity':
        product_data = product_data.order_by('-quantity')
    else:  # default to revenue
        product_data = product_data.order_by('-revenue')
    
    # Apply limit
    if limit:
        product_data = product_data[:limit]
    
    # Format the data
    formatted_data = []
    for entry in product_data:
        formatted_entry = {
            'product_id': entry['product__id'],
            'product_name': entry['product__name'],
            'category': entry['product__category__name'] or 'Uncategorized',
            'quantity_sold': entry['quantity'],
            'revenue': float(entry['revenue'] or 0),
            'avg_price': float(entry['avg_price'] or 0)
        }
        formatted_data.append(formatted_entry)
    
    # Apply the same fix to category breakdown
    category_data = annotated_query.values(
        'product__category__name'
    ).annotate(
        quantity=Sum('quantity'),
        revenue=Sum('item_revenue')
    ).order_by('-revenue')
    
    category_breakdown = []
    for entry in category_data:
        category_name = entry['product__category__name'] or 'Uncategorized'
        category_breakdown.append({
            'category': category_name,
            'quantity_sold': entry['quantity'],
            'revenue': float(entry['revenue'] or 0)
        })
    
    # Calculate summary metrics
    total_quantity = sum(entry['quantity_sold'] for entry in formatted_data)
    total_revenue = sum(entry['revenue'] for entry in formatted_data)
    
    summary = {
        'period_start': start_date.strftime('%Y-%m-%d'),
        'period_end': end_date.strftime('%Y-%m-%d'),
        'total_products_sold': total_quantity,
        'total_revenue': total_revenue,
        'top_product': formatted_data[0]['product_name'] if formatted_data else None,
        'top_category': category_breakdown[0]['category'] if category_breakdown else None,
    }
    
    return {
        'summary': summary,
        'products': formatted_data,
        'categories': category_breakdown
    }

def generate_payment_report(start_date, end_date, group_by='payment_method', date_field='updated_at'):
    """
    Generate payment analytics report
    """
    # Convert string dates to datetime if needed
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        # Make end_date inclusive by setting it to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
    
    # Build the filter based on the date_field parameter
    date_filter = {
        f'{date_field}__gte': start_date,
        f'{date_field}__lte': end_date
    }
    
    # Base query - payments within date range
    query = Payment.objects.filter(**date_filter)
    
    # Different report formats based on group_by
    if group_by == 'payment_method':
        # Get non-split payment methods
        non_split_data = query.filter(is_split_payment=False).values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            
            # Count refunded payments (still track these, but don't use in success rate)
            refund_count=Count('id', filter=Q(status='refunded')),
            
            # Count failed payments - ONLY THESE COUNT AS UNSUCCESSFUL
            failed_count=Count('id', filter=Q(status='failed')),
            
            # Count voided orders (still track these, but don't use in success rate)
            void_count=Count('id', filter=Q(order__status='voided')),
            
            # Count successful transactions (anything not failed)
            successful_count=Count('id', filter=~Q(status='failed'))
        )
        
        # Get split payment data
        split_data = query.filter(is_split_payment=True).aggregate(
            count=Count('id'),
            total_amount=Sum('amount'),
            refund_count=Count('id', filter=Q(status='refunded')),
            failed_count=Count('id', filter=Q(status='failed')),
            void_count=Count('id', filter=Q(order__status='voided')),
            successful_count=Count('id', filter=~Q(status='failed'))
        )
        
        # Format the data
        formatted_data = []
        
        # Add non-split payment methods
        for entry in non_split_data:
            payment_method = entry['payment_method'] or 'Unknown'
            
            # MODIFIED: Only consider failed transactions as unsuccessful
            unsuccessful_count = entry['failed_count']
            
            # Calculate success rate based on truly successful transactions
            success_rate = ((entry['count'] - unsuccessful_count) / entry['count']) * 100 if entry['count'] > 0 else 0
            
            formatted_entry = {
                'payment_method': payment_method.replace('_', ' ').title(),
                'transaction_count': entry['count'],
                'total_amount': float(entry['total_amount'] or 0),
                'refund_count': entry['refund_count'],
                'failed_count': entry['failed_count'],
                'void_count': entry['void_count'],
                'success_rate': round(success_rate, 2)
            }
            formatted_data.append(formatted_entry)
        
        # Add split payments if they exist
        if split_data['count'] > 0:
            # MODIFIED: Only consider failed transactions as unsuccessful
            unsuccessful_count = split_data['failed_count']
            
            # Calculate success rate
            success_rate = ((split_data['count'] - unsuccessful_count) / split_data['count']) * 100 if split_data['count'] > 0 else 0
            
            formatted_data.append({
                'payment_method': 'Split Payment',
                'transaction_count': split_data['count'],
                'total_amount': float(split_data['total_amount'] or 0),
                'refund_count': split_data['refund_count'],
                'failed_count': split_data['failed_count'],
                'void_count': split_data['void_count'],
                'success_rate': round(success_rate, 2)
            })
        
        # Sort by total amount
        formatted_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
    else:
        # Group by time period
        if group_by == 'day':
            trunc_func = TruncDay(date_field)
            date_format = '%Y-%m-%d'
        elif group_by == 'week':
            trunc_func = TruncWeek(date_field)
            date_format = 'Week of %Y-%m-%d'
        elif group_by == 'month':
            trunc_func = TruncMonth(date_field)
            date_format = '%Y-%m'
        
        # Get non-split payments grouped by time
        non_split_data = query.filter(is_split_payment=False).annotate(
            date=trunc_func
        ).values('date').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            refund_count=Count('id', filter=Q(status='refunded')),
            failed_count=Count('id', filter=Q(status='failed')),
            void_count=Count('id', filter=Q(order__status='voided')),
            successful_count=Count('id', filter=~Q(status='failed'))
        ).order_by('date')
        
        # Get split payments grouped by time
        split_data = query.filter(is_split_payment=True).annotate(
            date=trunc_func
        ).values('date').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            refund_count=Count('id', filter=Q(status='refunded')),
            failed_count=Count('id', filter=Q(status='failed')),
            void_count=Count('id', filter=Q(order__status='voided')),
            successful_count=Count('id', filter=~Q(status='failed'))
        ).order_by('date')
        
        # Create a dictionary to combine them by date
        combined_data = {}
        
        # Process non-split payments
        for entry in non_split_data:
            date_str = entry['date'].strftime(date_format)
            if date_str not in combined_data:
                combined_data[date_str] = {
                    'date': date_str,
                    'transaction_count': 0,
                    'total_amount': 0,
                    'refund_count': 0,
                    'failed_count': 0,
                    'void_count': 0,
                    'successful_count': 0
                }
            
            combined_data[date_str]['transaction_count'] += entry['count']
            combined_data[date_str]['total_amount'] += float(entry['total_amount'] or 0)
            combined_data[date_str]['refund_count'] += entry['refund_count']
            combined_data[date_str]['failed_count'] += entry['failed_count']
            combined_data[date_str]['void_count'] += entry['void_count']
            combined_data[date_str]['successful_count'] += entry['successful_count']
        
        # Process split payments
        for entry in split_data:
            date_str = entry['date'].strftime(date_format)
            if date_str not in combined_data:
                combined_data[date_str] = {
                    'date': date_str,
                    'transaction_count': 0,
                    'total_amount': 0,
                    'refund_count': 0,
                    'failed_count': 0,
                    'void_count': 0,
                    'successful_count': 0
                }
            
            combined_data[date_str]['transaction_count'] += entry['count']
            combined_data[date_str]['total_amount'] += float(entry['total_amount'] or 0)
            combined_data[date_str]['refund_count'] += entry['refund_count']
            combined_data[date_str]['failed_count'] += entry['failed_count']
            combined_data[date_str]['void_count'] += entry['void_count']
            combined_data[date_str]['successful_count'] += entry['successful_count']
        
        # Convert to list and calculate success rate
        formatted_data = []
        for date_str, data in sorted(combined_data.items()):
            # MODIFIED: Only consider failed transactions as unsuccessful
            unsuccessful_count = data['failed_count']
            
            # Calculate success rate
            success_rate = ((data['transaction_count'] - unsuccessful_count) / data['transaction_count']) * 100 if data['transaction_count'] > 0 else 0
            
            formatted_entry = {
                'date': date_str,
                'transaction_count': data['transaction_count'],
                'total_amount': data['total_amount'],
                'refund_count': data['refund_count'],
                'failed_count': data['failed_count'],
                'void_count': data['void_count'],
                'success_rate': round(success_rate, 2)
            }
            formatted_data.append(formatted_entry)
    
    # Calculate summary metrics
    total_transactions = sum(entry['transaction_count'] for entry in formatted_data)
    total_amount = sum(entry['total_amount'] for entry in formatted_data)
    total_refunds = sum(entry['refund_count'] for entry in formatted_data)
    total_failed = sum(entry.get('failed_count', 0) for entry in formatted_data)
    total_voided = sum(entry.get('void_count', 0) for entry in formatted_data)
    
    # Calculate refund and success rates
    refund_rate = (total_refunds / total_transactions) * 100 if total_transactions > 0 else 0
    
    # MODIFIED: Only consider failed transactions as unsuccessful
    unsuccessful_count = total_failed
    success_rate = ((total_transactions - unsuccessful_count) / total_transactions) * 100 if total_transactions > 0 else 0
    
    summary = {
        'period_start': start_date.strftime('%Y-%m-%d'),
        'period_end': end_date.strftime('%Y-%m-%d'),
        'total_transactions': total_transactions,
        'total_amount': total_amount,
        'total_refunds': total_refunds,
        'total_failed': total_failed,
        'total_voided': total_voided,
        'refund_rate': round(refund_rate, 2),
        'success_rate': round(success_rate, 2),
    }
    
    return {
        'summary': summary,
        'data': formatted_data
    }


def generate_operational_insights(start_date, end_date, date_field='updated_at'):
    """
    Generate operational insights report including hourly trends
    """
    # Convert string dates to datetime if needed
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        # Make end_date inclusive by setting it to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
    
    # Build the filter based on the date_field parameter
    date_filter = {
        f'{date_field}__gte': start_date,
        f'{date_field}__lte': end_date,
        'status': 'completed'  # Only include completed orders
    }
    
    # Base query - completed orders within date range
    query = Order.objects.filter(**date_filter)
    
    # Hourly breakdown - note we still use the specified date field for hour filtering
    hourly_data = []
    for hour in range(24):
        hour_filter = {f'{date_field}__hour': hour}
        hour_orders = query.filter(**hour_filter)
        order_count = hour_orders.count()
        revenue = hour_orders.aggregate(total=Sum('total_price'))['total'] or 0
        
        hourly_data.append({
            'hour': f"{hour:02d}:00",
            'order_count': order_count,
            'revenue': float(revenue),
            'avg_order_value': float(revenue / order_count) if order_count > 0 else 0
        })
    
    # Daily breakdown
    daily_data = query.annotate(
        date=TruncDate(date_field)  # Use the specified date field
    ).values('date').annotate(
        order_count=Count('id'),
        revenue=Sum('total_price')
    ).order_by('date')
    
    formatted_daily_data = []
    for entry in daily_data:
        day_of_week = entry['date'].strftime('%A')
        formatted_daily_data.append({
            'date': entry['date'].strftime('%Y-%m-%d'),
            'day_of_week': day_of_week,
            'order_count': entry['order_count'],
            'revenue': float(entry['revenue'] or 0),
        })
    
    # Aggregate by day of week
    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_of_week_data = {day: {'order_count': 0, 'revenue': 0, 'days': 0} for day in days_of_week}
    
    for entry in formatted_daily_data:
        day = entry['day_of_week']
        day_of_week_data[day]['order_count'] += entry['order_count']
        day_of_week_data[day]['revenue'] += entry['revenue']
        day_of_week_data[day]['days'] += 1
    
    # Calculate averages and format
    day_of_week_summary = []
    for day in days_of_week:
        data = day_of_week_data[day]
        day_count = data['days'] or 1  # Avoid division by zero
        
        day_of_week_summary.append({
            'day_of_week': day,
            'avg_order_count': round(data['order_count'] / day_count, 2),
            'avg_revenue': round(data['revenue'] / day_count, 2),
        })
    
    # Find peak hours (top 3)
    peak_hours = sorted(hourly_data, key=lambda x: x['order_count'], reverse=True)[:3]
    peak_hour_summary = [f"{hour['hour']} ({hour['order_count']} orders)" for hour in peak_hours]
    
    # Find busiest days (top 3)
    busiest_days = sorted(formatted_daily_data, key=lambda x: x['order_count'], reverse=True)[:3]
    busiest_day_summary = [f"{day['date']} ({day['order_count']} orders)" for day in busiest_days]
    
    # Calculate summary metrics
    total_orders = sum(entry['order_count'] for entry in hourly_data)
    total_revenue = sum(entry['revenue'] for entry in hourly_data)
    avg_orders_per_day = total_orders / len(formatted_daily_data) if formatted_daily_data else 0
    
    summary = {
        'period_start': start_date.strftime('%Y-%m-%d'),
        'period_end': end_date.strftime('%Y-%m-%d'),
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'avg_orders_per_day': round(avg_orders_per_day, 2),
        'peak_hours': peak_hour_summary,
        'busiest_days': busiest_day_summary,
    }
    
    return {
        'summary': summary,
        'hourly_data': hourly_data,
        'daily_data': formatted_daily_data,
        'day_of_week_summary': day_of_week_summary
    }