
# views.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Dht11, Incident, OperatorProfile

@login_required
def dashboard(request):
    # Rend juste la page; les données sont chargées via JS
    try:
        operator_number = request.user.profile.operator_number
    except AttributeError:
        # Create a default operator profile if it doesn't exist
        from .models import OperatorProfile
        profile, created = OperatorProfile.objects.get_or_create(
            user=request.user,
            defaults={'operator_number': 1}
        )
        operator_number = profile.operator_number
    
    return render(request, "dashboard.html", {'operator_number': operator_number})

def latest_json(request):
    # Fournit la dernière mesure en JSON (sans passer par api.py)
    last = Dht11.objects.order_by('-dt').values('temp', 'hum', 'ph', 'chlorine', 'turbidity', 'flow_rate', 'water_level', 'dt').first()
    if not last:
        return JsonResponse({"detail": "no data"}, status=404)
    return JsonResponse({
        "temperature": last["temp"],
        "humidity":    last["hum"],
        "ph":          last["ph"],
        "chlorine":    last["chlorine"],
        "turbidity":   last["turbidity"],
        "flow_rate":   last["flow_rate"],
        "water_level": last["water_level"],
        "timestamp":   last["dt"].isoformat()
    })
@login_required
def graph_temp(request):
    return render(request, "graph_temp.html")


@login_required
def graph_hum(request):
    return render(request, "graph_hum.html")

@login_required
def turbidity_history(request):
    # Get turbidity data with timestamps
    from .models import Dht11
    turbidity_data = Dht11.objects.filter(turbidity__isnull=False).order_by('-dt')
    return render(request, "turbidity_history.html", {"turbidity_data": turbidity_data})

@login_required
def incident_archive(request):
    # Incidents fermés uniquement
    incidents = Incident.objects.filter(is_open=False).order_by("-end_at")
    return render(request, "incident_archive.html", {"incidents": incidents})

@login_required
def incident_detail(request, pk):
    # Détails d'un incident précis
    incident = get_object_or_404(Incident, pk=pk)
    return render(request, "incident_detail.html", {"incident": incident})

@login_required
def incident_history(request):
    incidents = Incident.objects.filter(is_open=False).order_by("-end_at")
    return render(request, "incident_history.html", {"incidents": incidents})

def acknowledge_incident(request):
    # This function can be handled by the API, or implement custom logic
    return JsonResponse({"message": "Use the incident/update/ API endpoint"})

def save_acknowledgment(request):
    # This function can be removed or redirect to API
    return JsonResponse({"message": "Use the incident/update/ API endpoint"})