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

# Create the three operator users
operators = [
    {'username': 'operator1', 'password': 'operateur1', 'operator_number': 1},
    {'username': 'operator2', 'password': 'operateur2', 'operator_number': 2},
    {'username': 'operator3', 'password': 'operateur3', 'operator_number': 3}
]

for op_data in operators:
    try:
        user, created = User.objects.get_or_create(username=op_data['username'])
        if created:
            user.set_password(op_data['password'])
            user.save()
            print(f"User '{op_data['username']}' created successfully!")
        else:
            user.set_password(op_data['password'])
            user.save()
            print(f"User '{op_data['username']}' password updated successfully!")
        
        # Create the operator profile if it doesn't exist
        operator_profile, profile_created = OperatorProfile.objects.get_or_create(
            user=user,
            defaults={'operator_number': op_data['operator_number']}
        )
        
        if profile_created:
            print(f"Operator profile for '{op_data['username']}' created successfully as operator {op_data['operator_number']}!")
        else:
            # Update the operator number if it's different
            if operator_profile.operator_number != op_data['operator_number']:
                operator_profile.operator_number = op_data['operator_number']
                operator_profile.save()
                print(f"Operator profile for '{op_data['username']}' updated to operator {op_data['operator_number']}!")
            else:
                print(f"Operator profile for '{op_data['username']}' already exists as operator {op_data['operator_number']}.")
        
    except Exception as e:
        print(f"Error creating user {op_data['username']}: {e}")
        
print("\nAll operators have been created/updated successfully!")