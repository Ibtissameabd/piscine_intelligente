from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from DHT.models import OperatorProfile

class Command(BaseCommand):
    help = 'Create operator profiles for existing users or create sample operator users'

    def add_arguments(self, parser):
        parser.add_argument('--create-users', action='store_true', help='Create sample operator users')
        parser.add_argument('--assign-existing', action='store_true', help='Assign operator numbers to existing users')

    def handle(self, *args, **options):
        if options['create_users']:
            self.create_sample_operators()
        elif options['assign_existing']:
            self.assign_operator_numbers()
        else:
            self.stdout.write(
                self.style.WARNING(
                    'Please specify either --create-users or --assign-existing'
                )
            )

    def create_sample_operators(self):
        """Create sample operator users with different operator numbers"""
        operators = [
            {'username': 'operator1', 'password': 'op1pass', 'operator_number': 1},
            {'username': 'operator2', 'password': 'op2pass', 'operator_number': 2},
            {'username': 'operator3', 'password': 'op3pass', 'operator_number': 3},
        ]

        for op_data in operators:
            user, created = User.objects.get_or_create(
                username=op_data['username'],
                defaults={'is_staff': True}
            )
            if created:
                user.set_password(op_data['password'])
                user.save()
                profile, profile_created = OperatorProfile.objects.get_or_create(
                    user=user,
                    defaults={'operator_number': op_data['operator_number']}
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created user {op_data["username"]} as Operator {op_data["operator_number"]}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'User {op_data["username"]} already exists'
                    )
                )

    def assign_operator_numbers(self):
        """Assign operator numbers to existing users"""
        users = User.objects.all()
        for i, user in enumerate(users, 1):
            profile, created = OperatorProfile.objects.get_or_create(
                user=user,
                defaults={'operator_number': ((i - 1) % 3) + 1}  # Cycle through 1, 2, 3
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Assigned operator number {profile.operator_number} to user {user.username}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'User {user.username} already has an operator profile (number {profile.operator_number})'
                    )
                )