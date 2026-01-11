import os
import sys
import django

# Add the project directory to Python path
sys.path.append(r'c:\Users\Zommorod\OneDrive\Desktop\projet_iot')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projet.settings')
django.setup()

# Import the models
from DHT.models import Dht11

# Check the database
print(f'Total DHT11 records: {Dht11.objects.count()}')
latest_record = Dht11.objects.order_by('-dt').first()
if latest_record:
    print(f'Latest record: Temperature={latest_record.temp}, Humidity={latest_record.hum}, Date={latest_record.dt}')
else:
    print('No records found in the database.')