from .models import Dht11, Incident
from .serializers import Dht11serialize, IncidentSerializer

from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from django.utils import timezone

from django.core.mail import send_mail
from django.conf import settings
from .utils import send_telegram

MIN_OK = 15
MAX_OK = 25

@api_view(['GET'])
@permission_classes([AllowAny])
def Dlist(request):
    all_data = Dht11.objects.all().order_by('dt')
    data = Dht11serialize(all_data, many=True).data
    return Response({'data': data})

@permission_classes([AllowAny])
class Dhtviews(generics.CreateAPIView):
    queryset = Dht11.objects.all()
    serializer_class = Dht11serialize
    authentication_classes = []  # Disable authentication for Arduino

    def perform_create(self, serializer):
        obj = serializer.save()

        t = obj.temp
        ph = obj.ph
        cl = obj.chlorine
        turb = obj.turbidity
        
        if t is None:
            return

        # Déterminer si c'est un incident basé sur plusieurs paramètres
        is_incident = (t < MIN_OK or t > MAX_OK)
        
        # Vérifier aussi les autres paramètres
        if ph is not None:
            if ph < 7.2 or ph > 7.6:  # Plage normale de pH
                is_incident = True
        
        if cl is not None:
            if cl < 1.0 or cl > 3.0:  # Plage normale de chlore
                is_incident = True
        
        if turb is not None:
            if turb < 0.0 or turb > 1.0:  # Plage normale de turbidité
                is_incident = True

        # récupérer l'incident ouvert (s'il existe)
        incident = Incident.objects.filter(is_open=True).order_by("-start_at").first()

        if is_incident:
            # si pas d'incident ouvert -> en créer un
            if incident is None:
                incident = Incident.objects.create(is_open=True, counter=0, max_temp=t, start_at=obj.dt or timezone.now())

            incident.counter += 1
            if t > incident.max_temp:
                incident.max_temp = t
            incident.save()

            #Alertes (Email, Telegram, WhatsApp)
            try:
                # Préparer message d'alerte avec tous les paramètres
                alert_message = f"Alerte Pool Olympique:\n"
                if t is not None:
                    alert_message += f"Température: {t:.1f} °C\n"
                if ph is not None:
                    alert_message += f"pH: {ph:.2f}\n"
                if cl is not None:
                    alert_message += f"Chlore: {cl:.2f} ppm\n"
                if turb is not None:
                    alert_message += f"Turbidité: {turb:.2f} NTU\n"
                alert_message += f"Heure: {obj.dt}"
                
                send_mail(
                    subject="⚠️ Alerte Pool Olympique",
                    message=alert_message,
                    from_email={"abibtissame@gmail.com"},
                    recipient_list={"ibtissam.abdoussi.23@ump.ac.ma"},
                    #recipient_list=["elmouss@yahoo.com"],
                    fail_silently=True,
                )
            except Exception:
                pass

            msg = f"⚠️ Alerte Pool Olympique: {alert_message}"
            send_telegram(msg)

            try:
                from twilio.rest import Client
                account_sid = 'AC2b121cb8df368618f1b3573d39cb57e1'
                auth_token = '23020efebc397b980c59e67f32bef1af'
                client = Client(account_sid, auth_token)

                message = client.messages.create(
                    from_='whatsapp:+14155238886',
                    body='Pool Olympique: Une alerte importante détectée',
                    to='whatsapp:+212664520040'
                )
                print(message.sid)
            except Exception:
                pass

        else:
            # Paramètres OK -> si incident ouvert, on le ferme
            if incident is not None:
                incident.is_open = False
                incident.end_at = timezone.now()
                incident.save()


# ---- API incident: état courant ----
class IncidentStatus(APIView):
    def get(self, request):
        incident = Incident.objects.filter(is_open=True).order_by("-start_at").first()
        if not incident:
            return Response({"is_open": False, "counter": 0})
        return Response(IncidentSerializer(incident).data)


# ---- API incident: valider ACK + commentaire (op1/op2/op3) ----
class IncidentUpdateOperator(APIView):
    def post(self, request):
        """
        body:
        {
          "op": 1,  // optional - will be overridden by user's operator number
          "ack": true,
          "comment": "..."
        }
        """
        ack = bool(request.data.get("ack", False))
        comment = request.data.get("comment", "")
        
        # Get operator number from user's profile
        try:
            operator_number = request.user.profile.operator_number
        except AttributeError:
            return Response({"error": "User does not have an operator profile"}, status=400)

        incident = Incident.objects.filter(is_open=True).order_by("-start_at").first()
        if not incident:
            return Response({"error": "no open incident"}, status=400)

        now = timezone.now()

        if operator_number == 1:
            incident.op1_ack = ack
            incident.op1_comment = comment
            incident.op1_saved_at = now
        elif operator_number == 2:
            incident.op2_ack = ack
            incident.op2_comment = comment
            incident.op2_saved_at = now
        elif operator_number == 3:
            incident.op3_ack = ack
            incident.op3_comment = comment
            incident.op3_saved_at = now
        else:
            return Response({"error": "Invalid operator number"}, status=400)

        incident.save()
        return Response(IncidentSerializer(incident).data)


class IncidentListAll(APIView):
    def get(self, request):
        # Récupérer tous les incidents (ouverts et fermés)
        incidents = Incident.objects.all().order_by("-start_at")
        return Response(IncidentSerializer(incidents, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_api(request):
    # Récupérer la dernière mesure
    last = Dht11.objects.order_by('-dt').first()
    if last:
        last_data = {
            "temp": last.temp,
            "hum": last.hum,
            "ph": last.ph,
            "chlorine": last.chlorine,
            "turbidity": last.turbidity,
            "flow_rate": last.flow_rate,
            "water_level": last.water_level,
            "dt": last.dt.isoformat(),
        }
    else:
        last_data = {"temp": None, "hum": None, "ph": None, "chlorine": None, "turbidity": None, "flow_rate": None, "water_level": None, "dt": None}

    # Récupérer l'incident en cours
    incident = Incident.objects.filter(is_open=True).order_by('-start_at').first()
    if incident:
        incident_serializer = IncidentSerializer(incident)
        incident_data = incident_serializer.data
    else:
        incident_data = {"is_open": False, "counter": 0}

    # Retourner les deux jeux de données
    return Response({
        "latest": last_data,
        "incident": incident_data
    })