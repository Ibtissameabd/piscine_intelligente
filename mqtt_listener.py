import paho.mqtt.client as mqtt
import json
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projet.settings')
django.setup()

from DHT.models import Dht11
from django.utils import timezone

# Variables de configuration
MIN_OK = 5
MAX_OK = 25


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✓ Connecté au broker MQTT avec succès")
        client.subscribe("dht11/data")
        print("✓ Abonné au topic 'dht11/data'")
    else:
        print(f"✗ Échec de connexion, code: {rc}")


def on_message(client, userdata, msg):
    try:
        # Décoder le message JSON
        payload = msg.payload.decode()
        print(f"\n📨 Message reçu: {payload}")

        data = json.loads(payload)
        temp = data.get('temp')
        hum = data.get('hum')

        if temp is None or hum is None:
            print("✗ Données invalides (temp ou hum manquant)")
            return

        # Sauvegarder dans la base de données
        dht_obj = Dht11.objects.create(temp=temp, hum=hum)
        print(f"✓ Données sauvegardées: {temp}°C, {hum}% (ID: {dht_obj.id})")

        # Vérifier si c'est un incident
        is_incident = (temp < MIN_OK or temp > MAX_OK)

        if is_incident:
            print(f"⚠️  ALERTE ! Température hors limites: {temp}°C")
        else:
            print(f"✅ Température normale: {temp}°C")

    except json.JSONDecodeError as e:
        print(f"✗ Erreur de décodage JSON: {e}")
    except Exception as e:
        print(f"✗ Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️  Déconnexion inattendue. Tentative de reconnexion...")


# Configuration du client MQTT
client = mqtt.Client(client_id="django_dht11_listener")
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# Connexion au broker MQTT
print("🔄 Tentative de connexion au broker MQTT...")
try:
    client.connect("localhost", 1883, 60)
    print("✓ Connecté à localhost:1883")
except Exception as e:
    print(f"✗ Impossible de se connecter au broker MQTT: {e}")
    print("Assurez-vous que Mosquitto est installé et démarré.")
    exit(1)

# Boucle infinie pour écouter les messages
print("👂 En écoute des messages MQTT...\n")
try:
    client.loop_forever()
except KeyboardInterrupt:
    print("\n🛑 Arrêt du listener MQTT...")
    client.disconnect()
    print("✓ Déconnecté proprement")