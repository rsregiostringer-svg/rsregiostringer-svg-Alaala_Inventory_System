from django.urls import re_path
from .realtime import AlaalaRealtimeConsumer

websocket_urlpatterns = [
    re_path(r'^ws/realtime/?$', AlaalaRealtimeConsumer.as_asgi()),
    re_path(r'^ws/?$', AlaalaRealtimeConsumer.as_asgi()),
]
