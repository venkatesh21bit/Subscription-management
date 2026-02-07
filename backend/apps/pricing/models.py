from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import CompanyScopedModel


class ComputationType(models.TextChoices):
    """Tax computation type"""
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    FIXED = 'FIXED', 'Fixed Amount'


class Tax(CompanyScopedModel):
    """
    Tax configuration model.
    
    Defines tax rates and computation methods for products and services.
    """
    name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Tax name (e.g., 'GST 18%', 'Service Tax')"
    )
    computation = models.CharField(
        max_length=20,
        choices=ComputationType.choices,
        default=ComputationType.PERCENTAGE,
        help_text="Percentage or fixed amount computation"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Tax rate percentage or fixed amount"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Is this tax currently active?"
    )
    
    class Meta:
        verbose_name = "Tax"
        verbose_name_plural = "Taxes"
        unique_together = [("company", "name")]
        ordering = ['name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]
    
    def __str__(self):
        if self.computation == ComputationType.PERCENTAGE:
            return f"{self.name} ({self.amount}%)"
        return f"{self.name} (${self.amount})"
    
    def calculate_tax(self, base_amount):
        """Calculate tax amount for a given base amount"""
        if self.computation == ComputationType.FIXED:
            return self.amount
        else:  # PERCENTAGE
            return base_amount * (self.amount / Decimal('100'))

# Pricing models are handled by products app (ItemPrice, PriceList)
# This app provides selector functions and APIs only
