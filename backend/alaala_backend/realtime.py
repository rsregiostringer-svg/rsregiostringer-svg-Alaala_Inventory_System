import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

GROUP_NAME = 'alaala_realtime'


class AlaalaRealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join broadcast group
        await self.channel_layer.group_add(GROUP_NAME, self.channel_name)
        await self.accept()
        # Send initial connection acknowledgment
        await self.send(text_data=json.dumps({
            'type': 'system.connected',
            'message': 'Connected to Alaala Realtime Stream'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(GROUP_NAME, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Client ping / message
        if text_data:
            try:
                data = json.loads(text_data)
                action = data.get('action')
                if action == 'ping':
                    await self.send(text_data=json.dumps({'type': 'pong'}))
            except Exception as e:
                logger.error(f"Error parsing WebSocket incoming message: {e}")

    async def realtime_event(self, event):
        """
        Handler for messages dispatched to the group
        """
        payload = event.get('payload', {})
        event_type = event.get('event_type', 'update')
        await self.send(text_data=json.dumps({
            'type': event_type,
            'data': payload
        }))


def broadcast_event(event_type: str, payload: dict):
    """
    Synchronously broadcast an event to all connected clients.
    Safe: will not crash caller if channel layer is unreachable.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                GROUP_NAME,
                {
                    'type': 'realtime_event',
                    'event_type': event_type,
                    'payload': payload
                }
            )
    except Exception as e:
        logger.warning(f"Failed to broadcast realtime event '{event_type}': {e}")
