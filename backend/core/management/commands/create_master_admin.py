import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a Master Admin user with full access. Prompts for Username, Email, and Password.'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Master Admin username')
        parser.add_argument('--email', type=str, help='Master Admin email')
        parser.add_argument('--password', type=str, help='Master Admin password (for non-interactive/scripted setup)')
        parser.add_argument('--noinput', action='store_true', help='Do not prompt for input')

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')
        noinput = options.get('noinput')

        if not username:
            if noinput:
                raise CommandError("Username must be provided with --username in non-interactive mode.")
            username = input("Enter Master Admin Username: ").strip()

        if not username:
            raise CommandError("Username cannot be blank.")

        if not email:
            if noinput:
                email = f"{username}@alaalafuneralhomes.com"
            else:
                email = input("Enter Master Admin Email: ").strip()

        if not password:
            if noinput:
                raise CommandError("Password must be provided with --password in non-interactive mode.")
            password = getpass.getpass("Enter Master Admin Password: ").strip()
            confirm_password = getpass.getpass("Confirm Master Admin Password: ").strip()
            if password != confirm_password:
                raise CommandError("Passwords do not match.")

        if len(password) < 6:
            raise CommandError("Password must be at least 6 characters long.")

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': User.Role.MASTER_ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )

        user.email = email
        user.role = User.Role.MASTER_ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action_str = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"[OK] Successfully {action_str} Master Admin user '{username}' ({email})!"))
