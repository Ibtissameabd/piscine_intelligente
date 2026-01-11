#include <DHT.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "ZTE_81EF12";
const char* password = "6AG624A3HF";

// 🔧 CORRECTION: Vérifiez que cette IP correspond à votre serveur Django
const char* serverName = "http://192.168.0.13:8000/api/post";

// 🔧 CORRECTION: MQTT - Mettre à nullptr pour désactiver si non utilisé
//const char* mqtt_server = nullptr;  // Désactivé car rc=-2 indique problème de connexion
// Si vous voulez utiliser MQTT, assurez-vous que le broker est accessible
const char* mqtt_server = "100.96.186.113";
const int mqtt_port = 1883;

// Topics
const char* topic_pub = "sensors/esp8266-001/dht11";
const char* topic_led = "devices/esp8266-001/cmd/led";

/* ================================================= */

#define DHTTYPE DHT11
#define dht_dpin 5
DHT dht(dht_dpin, DHTTYPE);

// LED intégrée (NodeMCU)
#define LED_PIN LED_BUILTIN

/* ================================================= */

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 5000; // 5 secondes

// 🔧 AJOUT: Délai entre les envois HTTP pour éviter de surcharger
const unsigned long HTTP_SEND_INTERVAL_MS = 8000; // 8 secondes (même que dashboard.js)
unsigned long lastHttpSend = 0;

/* =============== WiFi ================= */

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connexion WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    tries++;
    if (tries > 60) {
      Serial.println("\nWiFi timeout -> reboot");
      ESP.restart();
    }
  }

  Serial.println("\nWiFi connecté");
  Serial.print("IP ESP8266 : ");
  Serial.println(WiFi.localIP());

  // 🔧 AJOUT: Test de connectivité vers le serveur HTTP
  Serial.print("Test connexion vers serveur Django... ");
  WiFiClient testClient;
  
  // Extraire l'IP et le port de serverName
  String serverStr = String(serverName);
  int startIP = serverStr.indexOf("://") + 3;
  int endIP = serverStr.indexOf(":", startIP);
  String serverIP = serverStr.substring(startIP, endIP);
  int port = serverStr.substring(endIP + 1, serverStr.indexOf("/", endIP)).toInt();
  
  if (testClient.connect(serverIP.c_str(), port)) {
    Serial.println("OK");
    testClient.stop();
  } else {
    Serial.println("ECHEC - Vérifiez l'IP du serveur Django");
  }
}

/* =============== Callback MQTT ================= */

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  message.reserve(length);

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("MQTT reçu | Topic: ");
  Serial.print(topic);
  Serial.print(" | Msg: ");
  Serial.println(message);

  if (String(topic) == topic_led) {
    message.trim();
    message.toUpperCase();

    if (message == "ON") {
      digitalWrite(LED_PIN, LOW);
      Serial.println("=> LED ALLUMÉE");
    } else if (message == "OFF") {
      digitalWrite(LED_PIN, HIGH);
      Serial.println("=> LED ÉTEINTE");
    } else {
      Serial.println("=> Commande inconnue (utiliser ON/OFF)");
    }
  }
}

/* =============== Reconnexion MQTT ================= */

void reconnect_mqtt() {
  if (!client.connected() && mqtt_server != nullptr && strlen(mqtt_server) > 0) {
    Serial.print("Connexion MQTT... ");

    String clientId = "ESP8266-DHT-";
    clientId += String(ESP.getChipId(), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("OK");

      if (client.subscribe(topic_led)) {
        Serial.print("Abonné au topic LED: ");
        Serial.println(topic_led);
      } else {
        Serial.println("ERREUR subscribe !");
      }
    } else {
      Serial.print("ECHEC rc=");
      Serial.print(client.state());
      Serial.println(" (Vérifiez que Mosquitto est actif)");
    }
  }
}

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  dht.begin();
  
  setup_wifi();

  // 🔧 CORRECTION: Ne configurer MQTT que s'il est activé
  if (mqtt_server != nullptr && strlen(mqtt_server) > 0) {
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
    reconnect_mqtt();
  } else {
    Serial.println("MQTT désactivé");
  }
}

/* ================= LOOP ================= */

void loop() {
  unsigned long now = millis();
  
  // 🔧 CORRECTION: Lire les capteurs une seule fois
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Erreur lecture DHT11");
    delay(2000);
    return;
  }

  Serial.print("Température: ");
  Serial.print(temperature);
  Serial.print("°C | Humidité: ");
  Serial.print(humidity);
  Serial.println("%");

  // 🔧 CORRECTION: Envoi HTTP avec intervalle contrôlé
  if (now - lastHttpSend >= HTTP_SEND_INTERVAL_MS) {
    lastHttpSend = now;
    
    if (serverName != nullptr && strlen(serverName) > 0) {
      WiFiClient http_client;
      HTTPClient http;
      
      // 🔧 AJOUT: Configuration timeout
      http_client.setTimeout(5000); // 5 secondes timeout
      
      DynamicJsonDocument jsonDoc(200);
      jsonDoc["temp"] = temperature;
      jsonDoc["hum"] = humidity;
      
      String jsonStr;
      serializeJson(jsonDoc, jsonStr);
      
      Serial.print("Envoi HTTP: ");
      Serial.println(jsonStr);
      
      // 🔧 CORRECTION: Vérifier la connexion avant d'envoyer
      if (http.begin(http_client, serverName)) {
        http.addHeader("Content-Type", "application/json");
        
        int httpResponseCode = http.POST(jsonStr);
        
        if (httpResponseCode > 0) {
          Serial.print("✓ HTTP Response: ");
          Serial.println(httpResponseCode);
          
          // 🔧 AJOUT: Afficher la réponse du serveur
          String response = http.getString();
          if (response.length() > 0) {
            Serial.print("Réponse serveur: ");
            Serial.println(response);
          }
        } else {
          Serial.print("✗ Erreur HTTP: ");
          Serial.print(httpResponseCode);
          
          // 🔧 AJOUT: Messages d'erreur détaillés
          switch(httpResponseCode) {
            case -1:
              Serial.println(" - Connexion refusée (serveur inaccessible)");
              break;
            case -2:
              Serial.println(" - Envoi échoué");
              break;
            case -3:
              Serial.println(" - Connexion perdue");
              break;
            case -4:
              Serial.println(" - Pas de stream");
              break;
            case -11:
              Serial.println(" - Timeout de lecture");
              break;
            default:
              Serial.println();
          }
        }
        
        http.end();
      } else {
        Serial.println("✗ Impossible de se connecter au serveur");
      }
    }
  }

  // WiFi reconnect si besoin
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi perdu -> reconnexion...");
    setup_wifi();
  }

  // 🔧 CORRECTION: MQTT seulement si activé
  if (mqtt_server != nullptr && strlen(mqtt_server) > 0) {
    if (!client.connected()) {
      reconnect_mqtt();
    }
    client.loop();

    // Envoi MQTT toutes les 5s
    if (now - lastSend >= SEND_INTERVAL_MS) {
      lastSend = now;

      char payload[80];
      snprintf(payload, sizeof(payload),
               "{\"temperature\":%.1f,\"humidity\":%.1f}", temperature, humidity);

      bool ok = client.publish(topic_pub, payload);
      Serial.print("MQTT publié: ");
      Serial.print(payload);
      Serial.println(ok ? " ✓" : " ✗");
    }
  }

  yield();
  delay(2000);
}