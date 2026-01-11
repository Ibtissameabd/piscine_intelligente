import threading
import time
from django.utils import timezone
from DHT.models import Incident
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class AutoIncrementThread(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True

    def run(self):
        """Run the auto incrementation in the background"""
        logger.info("Starting auto-incrementation thread")
        while self.running:
            try:
                # Get all active incidents
                active_incidents = Incident.objects.filter(is_open=True)
                
                for incident in active_incidents:
                    # Calculate how much time has passed since the incident started
                    time_diff = timezone.now() - incident.start_at
                    
                    # Calculate how many intervals have passed (every 3 seconds)
                    interval_seconds = 3  # Increment every 3 seconds
                    intervals_passed = int(time_diff.total_seconds() / interval_seconds)
                    
                    # Only increment if more intervals have passed than current counter
                    if intervals_passed > incident.counter:
                        increment_amount = intervals_passed - incident.counter
                        incident.counter += increment_amount
                        incident.save()
                        logger.info(
                            f"Auto-incremented counter for incident {incident.id}: "
                            f"was {incident.counter - increment_amount}, now {incident.counter}"
                        )
                
                # Sleep for 3 seconds before next check
                time.sleep(3)
            except Exception as e:
                logger.error(f"Error in auto-incrementation: {e}")
                time.sleep(3)  # Still sleep to avoid busy loop
    
    def stop(self):
        self.running = False

# Global instance of the thread
auto_increment_thread = None

def start_auto_increment():
    """Start the auto incrementation thread"""
    global auto_increment_thread
    if auto_increment_thread is None or not auto_increment_thread.is_alive():
        auto_increment_thread = AutoIncrementThread()
        auto_increment_thread.start()
        logger.info("Auto-incrementation started")

def stop_auto_increment():
    """Stop the auto incrementation thread"""
    global auto_increment_thread
    if auto_increment_thread:
        auto_increment_thread.stop()
        auto_increment_thread = None
        logger.info("Auto-incrementation stopped")