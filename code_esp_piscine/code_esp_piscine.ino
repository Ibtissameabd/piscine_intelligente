#include <OneWire.h>
#include <DallasTemperature.h>

// Définition des broches
#define TRIG_PIN 5
#define ECHO_PIN 18
#define ONE_WIRE_BUS 4
#define RELAY_PIN 26
#define PH_SENSOR A0      // Broche analogique pour le capteur de pH
#define CHLORINE_SENSOR A1  // Broche analogique pour le capteur de chlore
#define TURBIDITY_SENSOR A2 // Broche analogique pour le capteur de turbidité
#define FLOW_SENSOR 19      // Broche pour le capteur de débit

// Initialisation du capteur de température DS18B20
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Variables
float distance, temperature, ph_level, chlorine_ppm, turbidity_ntu, flow_rate;
const float distanceMin = 7.0;   // Niveau d'eau bas (cm)
const float distanceMax = 25.0;  // Niveau d'eau plein (cm)
const float ph_min = 7.2;        // Niveau minimum de pH normale
const float ph_max = 7.6;        // Niveau maximum de pH normale
const float chlorine_min = 1.0;  // Concentration minimale de chlore normale (ppm)
const float chlorine_max = 3.0;  // Concentration maximale de chlore normale (ppm)
const float turbidity_min = 0.0; // Turbidité minimale normale (NTU)
const float turbidity_max = 1.0; // Turbidité maximale normale (NTU)
volatile unsigned long pulseCount = 0;
unsigned long lastPulseCount = 0;
unsigned long currentTime;
unsigned long lastTime = 0;
const float calibrationFactor = 4.5; // Facteur de calibration pour le capteur de débit

// Compteurs pour les alertes
int temp_alert_counter = 0;
int ph_alert_counter = 0;
int chlorine_alert_counter = 0;
int turbidity_alert_counter = 0;
int level_alert_counter = 0;

// Fonction pour mesurer le niveau d'eau avec filtrage
float getWaterLevel() {
  float sum = 0;
  int validMeasurements = 0;

  for (int i = 0; i < 5; i++) {  // Moyenne sur 5 mesures
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout à 30ms
    float measuredDistance = duration * 0.034 / 2;  // Conversion en cm

    if (measuredDistance > 0 && measuredDistance < 50) {  // Filtrer les valeurs aberrantes
      sum += measuredDistance;
      validMeasurements++;
    }

    delay(10);
  }

  return (validMeasurements > 0) ? sum / validMeasurements : -1;
}

// Fonction pour lire la température
float getTemperature() {
  sensors.requestTemperatures();
  return sensors.getTempCByIndex(0);
}

// Fonction pour lire le niveau de pH
float getPHLevel() {
  int sensorValue = analogRead(PH_SENSOR);
  // Convertir la valeur analogique en pH (approximatif)
  float voltage = sensorValue * (5.0 / 1023.0);
  float ph = 7.0 + ((2.5 - voltage) / 0.18); // Formule approximative pour le capteur de pH
  return ph;
}

// Fonction pour lire la concentration de chlore
float getChlorineLevel() {
  int sensorValue = analogRead(CHLORINE_SENSOR);
  // Convertir la valeur analogique en ppm de chlore (approximatif)
  float voltage = sensorValue * (5.0 / 1023.0);
  float chlorine = voltage * 5.0; // Valeur approximative
  return chlorine;
}

// Fonction pour lire la turbidité
float getTurbidity() {
  int sensorValue = analogRead(TURBIDITY_SENSOR);
  // Convertir la valeur analogique en NTU (approximatif)
  float voltage = sensorValue * (5.0 / 1023.0);
  float turbidity = voltage * 10.0; // Valeur approximative
  return turbidity;
}

// Fonction d'interruption pour le capteur de débit
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// Fonction pour lire le débit d'eau
float getFlowRate() {
  currentTime = millis();
  
  if(currentTime - lastTime >= 1000) { // Calculer chaque seconde
    pulseCount = 0; // Réinitialiser le compteur
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR), pulseCounter, RISING);
    
    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR));
    
    float flowRate = ((pulseCount - lastPulseCount) / calibrationFactor) / 60.0;
    lastPulseCount = pulseCount;
    lastTime = currentTime;
    
    return flowRate;
  }
  return 0.0;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_SENSOR, INPUT_PULLUP); // Configuration du capteur de débit
  digitalWrite(RELAY_PIN, HIGH);  // Pompe éteinte au démarrage

  sensors.begin();
  
  // Initialiser les interruptions pour le capteur de débit
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR), pulseCounter, RISING);
  
  Serial.println("Système de surveillance de piscine olympique démarré");
  Serial.println("Paramètres de référence pour une piscine olympique:");
  Serial.println("- Température: 25-28°C");
  Serial.println("- pH: 7.2-7.8");
  Serial.println("- Chlore: 1.0-3.0 ppm");
  Serial.println("- Turbidité: <1.0 NTU");
  Serial.println("----------------------------------------");
}

void loop() {
  // Lecture des valeurs
  distance = getWaterLevel();
  temperature = getTemperature();
  ph_level = getPHLevel();
  chlorine_ppm = getChlorineLevel();
  turbidity_ntu = getTurbidity();
  flow_rate = getFlowRate();

  // Vérification que la mesure du niveau d'eau est valide
  if (distance == -1) {
    Serial.println("⚠ Erreur de mesure du niveau d'eau !");
  } else {
    Serial.print("Niveau d'eau: ");
    Serial.print(distance);
    Serial.println(" cm");
  }

  // Affichage de la température
  Serial.print("Température: ");
  Serial.print(temperature);
  Serial.println(" °C");

  // Affichage du pH
  Serial.print("pH: ");
  Serial.println(ph_level, 2);

  // Affichage de la concentration de chlore
  Serial.print("Chlore: ");
  Serial.print(chlorine_ppm, 2);
  Serial.println(" ppm");

  // Affichage de la turbidité
  Serial.print("Turbidité: ");
  Serial.print(turbidity_ntu, 2);
  Serial.println(" NTU");

  // Affichage du débit
  Serial.print("Débit: ");
  Serial.print(flow_rate, 2);
  Serial.println(" L/min");

  // Gestion de la pompe en fonction du niveau d'eau
  if (distance != -1 && distance > distanceMin) {
    Serial.println("⚠ Baisse du niveau d'eau, activation de la pompe !");
    digitalWrite(RELAY_PIN, LOW);  // Allumer la pompe
    delay(1000);  // Pompe activée pendant 1 seconde
    digitalWrite(RELAY_PIN, HIGH); // Éteindre la pompe
    Serial.println("Pompe désactivée !");
    level_alert_counter++; // Incrémenter le compteur d'alerte de niveau
  } else {
    Serial.println("✅ Niveau d'eau normal, pompe éteinte.");
    digitalWrite(RELAY_PIN, HIGH);
    if (level_alert_counter > 0) level_alert_counter--; // Réduire le compteur si le niveau est normal
  }

  // Analyse et alerte température
  if (temperature < 15 || temperature > 25) {
    Serial.println("⚠ Température hors plage normale (15-25°C) !");
    temp_alert_counter++;
  } else {
    Serial.println("✅ Température normale.");
    if (temp_alert_counter > 0) temp_alert_counter--; // Réduire le compteur si la température est normale
  }

  // Analyse et alerte pH
  if (ph_level < 7.2 || ph_level > 7.6) {
    Serial.println("⚠ Niveau de pH hors plage normale (7.2-7.6) !");
    ph_alert_counter++;
  } else {
    Serial.println("✅ Niveau de pH normal.");
    if (ph_alert_counter > 0) ph_alert_counter--; // Réduire le compteur si le pH est normal
  }

  // Analyse et alerte chlore
  if (chlorine_ppm < 1.0 || chlorine_ppm > 3.0) {
    Serial.println("⚠ Concentration de chlore hors plage normale (1.0-3.0 ppm) !");
    chlorine_alert_counter++;
  } else {
    Serial.println("✅ Concentration de chlore normale.");
    if (chlorine_alert_counter > 0) chlorine_alert_counter--; // Réduire le compteur si le chlore est normal
  }

  // Analyse et alerte turbidité
  if (turbidity_ntu < 0 || turbidity_ntu > 1.0) {
    Serial.println("⚠ Turbidité hors plage normale (0-1.0 NTU) !");
    turbidity_alert_counter++;
  } else {
    Serial.println("✅ Turbidité normale.");
    if (turbidity_alert_counter > 0) turbidity_alert_counter--; // Réduire le compteur si la turbidité est normale
  }

  // Affichage des compteurs d'alerte
  Serial.print("Compteurs d'alerte - Temp:");
  Serial.print(temp_alert_counter);
  Serial.print(" pH:");
  Serial.print(ph_alert_counter);
  Serial.print(" Cl:");
  Serial.print(chlorine_alert_counter);
  Serial.print(" Turb:");
  Serial.print(turbidity_alert_counter);
  Serial.print(" Niv:");
  Serial.println(level_alert_counter);

  // Calculer et afficher les statistiques
  calculatePoolStatistics();

  delay(2000);
}

// Fonction pour calculer et afficher les statistiques de la piscine
void calculatePoolStatistics() {
  Serial.println("--- ANALYSE STATISTIQUE DE LA PISCINE OLYMPIQUE ---");
  
  // Calculer l'indice de qualité global
  float quality_index = calculateQualityIndex();
  Serial.print("Indice de qualité de l'eau: ");
  Serial.print(quality_index, 2);
  Serial.print("/10 (" );
  if (quality_index >= 8.0) {
    Serial.print("Excellent");
  } else if (quality_index >= 6.0) {
    Serial.print("Bon");
  } else if (quality_index >= 4.0) {
    Serial.print("Moyen");
  } else {
    Serial.print("Mauvais");
  }
  Serial.println(")");
  
  // Calculer la tendance de la température
  static float prev_temperature = 0;
  if (prev_temperature != 0) {
    float temp_trend = temperature - prev_temperature;
    Serial.print("Tendance de température: ");
    if (temp_trend > 0.5) {
      Serial.println("En augmentation");
    } else if (temp_trend < -0.5) {
      Serial.println("En diminution");
    } else {
      Serial.println("Stable");
    }
  }
  prev_temperature = temperature;
  
  // Calculer la tendance du pH
  static float prev_ph = 0;
  if (prev_ph != 0) {
    float ph_trend = ph_level - prev_ph;
    Serial.print("Tendance de pH: ");
    if (ph_trend > 0.1) {
      Serial.println("En augmentation");
    } else if (ph_trend < -0.1) {
      Serial.println("En diminution");
    } else {
      Serial.println("Stable");
    }
  }
  prev_ph = ph_level;
  
  // Calculer la tendance du chlore
  static float prev_chlorine = 0;
  if (prev_chlorine != 0) {
    float cl_trend = chlorine_ppm - prev_chlorine;
    Serial.print("Tendance de chlore: ");
    if (cl_trend > 0.2) {
      Serial.println("En augmentation");
    } else if (cl_trend < -0.2) {
      Serial.println("En diminution");
    } else {
      Serial.println("Stable");
    }
  }
  prev_chlorine = chlorine_ppm;
  
  Serial.println("-------------------------------------------------");
}

// Fonction pour calculer l'indice de qualité de l'eau
float calculateQualityIndex() {
  float score = 0.0;
  
  // Score de température (sur 2 points)
  if (temperature >= 15 && temperature <= 25) {
    score += 2.0;
  } else {
    // Calculer le score basé sur la proximité de la plage normale
    float temp_deviation = min(abs(temperature - 15), abs(temperature - 25));
    score += max(0.0, 2.0 - temp_deviation * 0.1);
  }
  
  // Score de pH (sur 2 points)
  if (ph_level >= 7.2 && ph_level <= 7.6) {
    score += 2.0;
  } else {
    float ph_deviation = min(abs(ph_level - 7.2), abs(ph_level - 7.6));
    score += max(0.0, 2.0 - ph_deviation * 0.5);
  }
  
  // Score de chlore (sur 2 points)
  if (chlorine_ppm >= 1.0 && chlorine_ppm <= 3.0) {
    score += 2.0;
  } else {
    float cl_deviation = min(abs(chlorine_ppm - 1.0), abs(chlorine_ppm - 3.0));
    score += max(0.0, 2.0 - cl_deviation * 0.2);
  }
  
  // Score de turbidité (sur 2 points)
  if (turbidity_ntu >= 0.0 && turbidity_ntu <= 1.0) {
    score += 2.0;
  } else {
    float turb_deviation = min(abs(turbidity_ntu - 0.0), abs(turbidity_ntu - 1.0));
    score += max(0.0, 2.0 - turb_deviation);
  }
  
  // Score de niveau d'eau (sur 2 points)
  if (distance != -1 && distance <= distanceMin) {
    score += 2.0;
  } else {
    score += 1.0; // Moins critique que les autres paramètres
  }
  
  return min(10.0, max(0.0, score));
}
