from django.db import models
from django.contrib.auth.models import User


class Dht11(models.Model):
    temp = models.FloatField(null=True, blank=True)
    hum = models.FloatField(null=True, blank=True)
    dt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-dt"]

    def __str__(self):
        return f"{self.dt} -> T={self.temp}°C, H={self.hum}%"

class Incident(models.Model):
    start_at = models.DateTimeField(auto_now_add=True)         # début incident
    end_at   = models.DateTimeField(null=True, blank=True)     # fin incident
    is_open  = models.BooleanField(default=True)

    counter  = models.IntegerField(default=0)                  # nb mesures hors plage
    max_temp = models.FloatField(default=0)

    # opérateurs
    op1_ack = models.BooleanField(default=False)
    op2_ack = models.BooleanField(default=False)
    op3_ack = models.BooleanField(default=False)

    op1_comment = models.TextField(blank=True)
    op2_comment = models.TextField(blank=True)
    op3_comment = models.TextField(blank=True)

    op1_saved_at = models.DateTimeField(null=True, blank=True)
    op2_saved_at = models.DateTimeField(null=True, blank=True)
    op3_saved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-start_at"]

    def __str__(self):
        return f"Incident #{self.id} ({'OPEN' if self.is_open else 'CLOSED'}) counter={self.counter}"

    def get_niveau_requis(self):
        """
        Détermine le niveau d'opérateur requis selon le compteur
        Règles :
        - Compteur > 6 : Opérateur 3
        - Compteur > 3 : Opérateur 2
        - Compteur > 0 : Opérateur 1
        """
        if self.counter > 6:
            return 3
        elif self.counter > 3:
            return 2
        elif self.counter > 0:
            return 1
        return 0

    def get_niveau_max(self):
        """
        Retourne le niveau maximum atteint pour cet incident
        """
        if self.counter > 6:
            return 3
        elif self.counter > 3:
            return 2
        elif self.counter > 0:
            return 1
        return 0

    def get_operator_data(self, operator_num):
        """
        Retourne les données d'un opérateur spécifique
        """
        if operator_num == 1:
            return {
                'acknowledged': self.op1_ack,
                'comment': self.op1_comment,
                'ack_date': self.op1_saved_at.isoformat() if self.op1_saved_at else None
            }
        elif operator_num == 2:
            return {
                'acknowledged': self.op2_ack,
                'comment': self.op2_comment,
                'ack_date': self.op2_saved_at.isoformat() if self.op2_saved_at else None
            }
        elif operator_num == 3:
            return {
                'acknowledged': self.op3_ack,
                'comment': self.op3_comment,
                'ack_date': self.op3_saved_at.isoformat() if self.op3_saved_at else None
            }
        return None


class OperatorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    operator_number = models.IntegerField(default=1)  # 1, 2, or 3
    phone_number = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    def __str__(self):
        return f"{self.user.username} - Operator {self.operator_number}"

    class Meta:
        verbose_name = "Operator Profile"
        verbose_name_plural = "Operator Profiles"