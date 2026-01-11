import json, time
import paho.mqtt.client as mqtt
from django.conf import settings
from django.core.management.base import BaseCommand
from DHT.models import Dht11

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe(settings.MQTT_TOPIC_DHT, qos=1)
        print("MQTT connecté")
    else:
        print("Erreur MQTT", rc)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        Dht11.objects.create(
            temp=float(data["temperature"]),
            hum=float(data["humidity"])
        )
        print("Donnée enregistrée")
    except Exception as e:
        print("Erreur message:", e)

class Command(BaseCommand):
    help = "Subscriber MQTT pour DHT11"

    def handle(self, *args, **kwargs):
        client = mqtt.Client(client_id="django-dht", callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
        client.on_connect = on_connect
        client.on_message = on_message
        client.connect(settings.MQTT_HOST, settings.MQTT_PORT, 60)

        client.loop_start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        client.loop_stop()
        client.disconnect()
