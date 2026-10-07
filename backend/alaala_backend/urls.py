from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    LoginView, CurrentUserView, UserProfileView, ChangePasswordView,
    UserViewSet, LocationViewSet, AuditLogViewSet, DashboardStatsView,
    SettingsView, AnalyticsView, ExportCSVView
)

from inventory.views import CategoryViewSet, InventoryItemViewSet, InventoryTransactionViewSet
from laundry.views import LaundryViewSet
from caskets.views import (
    CasketViewSet, CasketSaleViewSet, ChapelViewSet,
    LamayRecordViewSet, BuyerViewSet, DeceasedViewSet
)
from maintenance.views import MaintenanceViewSet
from utilities.views import WaterBillViewSet, ElectricityBillViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'locations', LocationViewSet, basename='locations')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'inventory/items', InventoryItemViewSet, basename='inventory-items')
router.register(r'inventory/transactions', InventoryTransactionViewSet, basename='inventory-transactions')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')  # aliases /api/inventory/
router.register(r'laundry', LaundryViewSet, basename='laundry')
router.register(r'caskets', CasketViewSet, basename='caskets')
router.register(r'casket-sales', CasketSaleViewSet, basename='casket-sales')
router.register(r'chapels', ChapelViewSet, basename='chapels')
router.register(r'lamay', LamayRecordViewSet, basename='lamay')
router.register(r'buyers', BuyerViewSet, basename='buyers')
router.register(r'deceased', DeceasedViewSet, basename='deceased')
router.register(r'maintenance', MaintenanceViewSet, basename='maintenance')
router.register(r'water', WaterBillViewSet, basename='water')
router.register(r'electricity', ElectricityBillViewSet, basename='electricity')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('api/auth/profile/', UserProfileView.as_view(), name='auth-profile'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Dashboard & Analytics
    path('api/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/analytics/', AnalyticsView.as_view(), name='analytics-stats'),

    # Settings
    path('api/settings/', SettingsView.as_view(), name='system-settings'),

    # Reports
    path('api/reports/export-csv/', ExportCSVView.as_view(), name='export-csv'),

    # ViewSet Router
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
