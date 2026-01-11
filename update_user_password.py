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

# Update the user's password
try:
    user = User.objects.get(username='operator1')
    user.set_password('operateur2')
    user.save()
    print(f"Password updated successfully for user 'operator1'!")
    
except User.DoesNotExist:
    print("User 'operator1' does not exist. Creating user...")
    user = User.objects.create_user(
        username='operator1',
        password='operateur2'
    )
    user.save()
    print(f"User 'operator1' created successfully!")
    
except Exception as e:
    print(f"Error updating user: {e}")