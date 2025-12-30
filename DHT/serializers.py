from rest_framework import serializers

from .models import Dht11, Incident

class Dht11serialize(serializers.ModelSerializer):
    class Meta:
        model = Dht11
        fields = ["id", "temp", "hum", "dt"]

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = "__all__"
