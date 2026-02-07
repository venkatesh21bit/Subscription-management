from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create a superuser if none exists'

    def handle(self, *args, **options):
        User = get_user_model()
        
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.SUCCESS('Superuser already exists. Skipping creation.'))
            return

        try:
            User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin*123'
            )
            self.stdout.write(self.style.SUCCESS('Successfully created superuser: admin'))
            self.stdout.write(self.style.WARNING('Username: admin'))
            self.stdout.write(self.style.WARNING('Password: admin*123'))
            self.stdout.write(self.style.WARNING('Please change the password after first login!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to create superuser: {str(e)}'))
