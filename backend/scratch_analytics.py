from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from caskets.models import Deceased, LamayRecord, Chapel
from core.permissions import CanViewAnalytics

class AnalyticsView(APIView):
    """
    Analytics Dashboard View focused on Funeral/Deceased tracking.
    Available to users with 'CanViewAnalytics' permission or Master Admins.
    """
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        date_filter = request.query_params.get('date_filter', 'this_month')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        now = timezone.now()
        today = now.date()
        start_date = None
        end_date = today

        if date_filter == 'this_week':
            start_date = today - timedelta(days=today.weekday())
        elif date_filter == 'this_month':
            start_date = today.replace(day=1)
        elif date_filter == 'last_month':
            first_day_this_month = today.replace(day=1)
            end_date = first_day_this_month - timedelta(days=1)
            start_date = end_date.replace(day=1)
        elif date_filter == 'this_year':
            start_date = today.replace(month=1, day=1)
        elif date_filter == 'last_year':
            end_date = today.replace(month=1, day=1) - timedelta(days=1)
            start_date = end_date.replace(month=1, day=1)
        elif date_filter == 'custom':
            if start_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass
            if end_date_str:
                try:
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

        # If no valid date range determined, default to all-time or this month
        
        # Deceased queries
        deceased_qs = Deceased.objects.all()
        if start_date:
            deceased_period_qs = deceased_qs.filter(date_of_death__gte=start_date, date_of_death__lte=end_date)
        else:
            deceased_period_qs = deceased_qs

        total_deceased = deceased_qs.count()
        period_deceased = deceased_period_qs.count()

        # Lamay and Chapel counts (current active state)
        active_lamay = LamayRecord.objects.filter(status='ACTIVE').count()
        completed_lamay = LamayRecord.objects.filter(status='COMPLETED').count() # we could filter this by date if needed, but total completed is fine. Let's filter by period if possible? "Completed Lamay" usually implies all-time or within period. Let's do within period based on created_at or end_date. LamayRecord might have 'end_date' or 'completed_at'. Since we don't know, let's just do all completed.
        chapel_occupancy = Chapel.objects.filter(is_active=True, status='OCCUPIED').count()
        total_chapels = Chapel.objects.filter(is_active=True).count()

        # Trends
        # For line chart: deaths this week/month etc
        if date_filter in ['this_year', 'last_year']:
            # Group by month
            trend_data = list(deceased_period_qs.annotate(
                period=TruncMonth('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            # format period to string
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%b %Y')
        elif date_filter in ['this_week']:
            # Group by day
            trend_data = list(deceased_period_qs.annotate(
                period=TruncDay('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%a, %b %d')
        else:
            # this month, last month -> group by week or day? day is fine
            trend_data = list(deceased_period_qs.annotate(
                period=TruncDay('date_of_death')
            ).values('period').annotate(count=Count('id')).order_by('period'))
            for t in trend_data:
                if t['period']:
                    t['period'] = t['period'].strftime('%b %d')

        # Additional Charts
        lamay_status = list(LamayRecord.objects.values('status').annotate(count=Count('id')).order_by('-count'))
        
        chapel_list = Chapel.objects.filter(is_active=True).values('name', 'status', 'capacity')
        
        location_data = list(LamayRecord.objects.values('wake_location').annotate(count=Count('id')).order_by('-count'))

        return Response({
            'summary_cards': {
                'total_deceased': total_deceased,
                'period_deceased': period_deceased,
                'active_lamay': active_lamay,
                'completed_lamay': completed_lamay,
                'chapel_occupancy': chapel_occupancy,
                'total_chapels': total_chapels,
            },
            'trend_data': trend_data,
            'lamay_status': lamay_status,
            'chapel_list': list(chapel_list),
            'location_data': location_data,
            'filter_info': {
                'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
                'end_date': end_date.strftime('%Y-%m-%d') if end_date else None,
                'label': date_filter.replace('_', ' ').title()
            }
        })
