import os
import sys
import django

# Add the project directory to Python path
sys.path.append(r'c:\Users\Zommorod\OneDrive\Desktop\projet_iot')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projet.settings')
django.setup()

# Import the User model
from django.contrib.auth.models import User
from DHT.models import OperatorProfile

# Create the user or get existing user
try:
    user, created = User.objects.get_or_create(username='operator1')
    if created:
        user.set_password('operateur2')
        user.save()
        print("User 'operator1' created successfully!")
    else:
        print("User 'operator1' already exists.")
    
    # Create the operator profile if it doesn't exist
    operator_profile, profile_created = OperatorProfile.objects.get_or_create(
        user=user,
        defaults={'operator_number': 1}
    )
    
    if profile_created:
        print("Operator profile created successfully!")
    else:
        print("Operator profile already exists.")
    
    print(f"User 'operator1' is ready with operator profile!")
    
except Exception as e:
    print(f"Error creating user: {e}")