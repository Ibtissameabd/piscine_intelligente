import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projet.settings')
import django
django.setup()

from django.urls import reverse

try:
    url = reverse('dlist')
    print('SUCCESS: dlist URL resolves to:', url)
except Exception as e:
    print('ERROR: dlist URL not found:', str(e))

try:
    url = reverse('admin:index')
    print('SUCCESS: admin URL resolves to:', url)
except Exception as e:
    print('ERROR: admin URL not found:', str(e))

try:
    url = reverse('dashboard')
    print('SUCCESS: dashboard URL resolves to:', url)
except Exception as e:
    print('ERROR: dashboard URL not found:', str(e))