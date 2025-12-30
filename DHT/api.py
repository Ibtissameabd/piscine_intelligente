from .models import Dht11, Incident
from .serializers import Dht11serialize, IncidentSerializer

from rest_framework.decorators import api_view
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from django.core.mail import send_mail
from django.conf import settings
from .utils import send_telegram

MIN_OK = 2
MAX_OK = 8

@api_view(['GET'])
def Dlist(request):
    all_data = Dht11.objects.all().order_by('dt')
    data = Dht11serialize(all_data, many=True).data
    return Response({'data': data})

class Dhtviews(generics.CreateAPIView):
    queryset = Dht11.objects.all()
    serializer_class = Dht11serialize

    def perform_create(self, serializer):
        obj = serializer.save()

        t = obj.temp
        if t is None:
            return

        is_incident = (t < MIN_OK or t > MAX_OK)

        # récupérer l'incident ouvert (s'il existe)
        incident = Incident.objects.filter(is_open=True).order_by("-start_at").first()

        if is_incident:
            # si pas d'incident ouvert -> en créer un
            if incident is None:
                incident = Incident.objects.create(is_open=True, counter=0, max_temp=t)

            incident.counter += 1
            if t > incident.max_temp:
                incident.max_temp = t
            incident.save()

            # Alertes (Email, Telegram, WhatsApp)
            try:
                send_mail(
                    subject="⚠️ Alerte Température",
                    message=f"Température: {t:.1f} °C à {obj.dt}.",
                    from_email=settings.EMAIL_HOST_USER,
                    #recipient_list=["elmouss@yahoo.com"],
                    fail_silently=True,
                )
            except Exception:
                pass

            msg = f"⚠️ Alerte DHT11: {t:.1f} °C à {obj.dt}"
            send_telegram(msg)

            try:
                from twilio.rest import Client
                account_sid = 'AC2b121cb8df368618f1b3573d39cb57e1'
                auth_token = '23020efebc397b980c59e67f32bef1af'
                client = Client(account_sid, auth_token)

                message = client.messages.create(
                    from_='whatsapp:+14155238886',
                    body='Il y a une alerte importante sur votre Capteur',
                    to='whatsapp:+212664520040'
                )
                print(message.sid)
            except Exception:
                pass

        else:
            # température OK -> si incident ouvert, on le ferme
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
          "op": 1,
          "ack": true,
          "comment": "..."
        }
        """
        op = int(request.data.get("op", 1))
        ack = bool(request.data.get("ack", False))
        comment = request.data.get("comment", "")

        incident = Incident.objects.filter(is_open=True).order_by("-start_at").first()
        if not incident:
            return Response({"error": "no open incident"}, status=400)

        now = timezone.now()

        if op == 1:
            incident.op1_ack = ack
            incident.op1_comment = comment
            incident.op1_saved_at = now
        elif op == 2:
            incident.op2_ack = ack
            incident.op2_comment = comment
            incident.op2_saved_at = now
        else:
            incident.op3_ack = ack
            incident.op3_comment = comment
            incident.op3_saved_at = now

        incident.save()
        return Response(IncidentSerializer(incident).data)


class IncidentListAll(APIView):
    def get(self, request):
        # Récupérer tous les incidents (ouverts et fermés)
        incidents = Incident.objects.all().order_by("-start_at")
        return Response(IncidentSerializer(incidents, many=True).data)