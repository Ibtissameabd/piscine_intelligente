from django.core.management.base import BaseCommand
from django.utils import timezone
from DHT.models import Incident
from datetime import timedelta


class Command(BaseCommand):
    help = 'Increment counter for active incidents based on duration'

    def handle(self, *args, **options):
        # Get all active incidents
        active_incidents = Incident.objects.filter(is_open=True)
        
        for incident in active_incidents:
            # Calculate how much time has passed since the incident started
            time_diff = timezone.now() - incident.start_at
            
            # Calculate how many "intervals" have passed (e.g., every 3 seconds)
            # This will determine how much to increment the counter
            interval_seconds = 3  # Increment every 3 seconds
            intervals_passed = int(time_diff.total_seconds() / interval_seconds)
            
            # Only increment if more intervals have passed than current counter
            if intervals_passed > incident.counter:
                increment_amount = intervals_passed - incident.counter
                incident.counter += increment_amount
                incident.save()
                self.stdout.write(
                    f"Incremented counter for incident {incident.id}: "
                    f"was {incident.counter - increment_amount}, now {incident.counter}"
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully checked {len(active_incidents)} active incidents')
        )