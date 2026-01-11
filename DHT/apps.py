from django.apps import AppConfig


class DhtConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'DHT'

    def ready(self):
        from .tasks import start_auto_increment
        start_auto_increment()
