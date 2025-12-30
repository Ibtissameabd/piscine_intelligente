
# views.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Dht11, Incident

def dashboard(request):
    # Rend juste la page; les données sont chargées via JS
    return render(request, "dashboard.html")

def latest_json(request):
    # Fournit la dernière mesure en JSON (sans passer par api.py)
    last = Dht11.objects.order_by('-dt').values('temp', 'hum', 'dt').first()
    if not last:
        return JsonResponse({"detail": "no data"}, status=404)
    return JsonResponse({
        "temperature": last["temp"],
        "humidity":    last["hum"],
        "timestamp":   last["dt"].isoformat()
    })
def graph_temp(request):
    return render(request, "graph_temp.html")


def graph_hum(request):
    return render(request, "graph_hum.html")

def incident_archive(request):
    # Incidents fermés uniquement
    incidents = Incident.objects.filter(is_open=False).order_by("-end_at")
    return render(request, "incident_archive.html", {"incidents": incidents})

def incident_detail(request, pk):
    # Détails d’un incident précis
    incident = get_object_or_404(Incident, pk=pk)
    return render(request, "incident_detail.html", {"incident": incident})

def incident_history(request):
    incidents = Incident.objects.filter(is_open=False).order_by("-end_at")
    return render(request, "incident_history.html", {"incidents": incidents})

def acknowledge_incident(request):
    # This function can be handled by the API, or implement custom logic
    return JsonResponse({"message": "Use the incident/update/ API endpoint"})

def save_acknowledgment(request):
    # This function can be removed or redirect to API
    return JsonResponse({"message": "Use the incident/update/ API endpoint"})