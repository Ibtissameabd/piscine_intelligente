import time
import os
import sys
from django.core.management import execute_from_command_line

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projet.settings')

import django
django.setup()

def run_auto_increment():
    """Run the increment command every 3 seconds"""
    print("Starting automatic incident counter incrementation every 3 seconds...")
    print("Press Ctrl+C to stop")
    
    try:
        while True:
            # Run the Django management command
            execute_from_command_line(['manage.py', 'increment_incident_counter'])
            print("Waiting 3 seconds...")
            time.sleep(3)
    except KeyboardInterrupt:
        print("\nAuto incrementation stopped by user.")

if __name__ == "__main__":
    run_auto_increment()