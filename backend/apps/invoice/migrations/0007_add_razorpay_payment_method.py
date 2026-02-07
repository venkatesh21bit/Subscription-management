from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoice', '0006_invoicepayment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoicepayment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('CASH', 'Cash'),
                    ('UPI', 'UPI'),
                    ('BANK_TRANSFER', 'Bank Transfer'),
                    ('CARD', 'Card'),
                    ('CHEQUE', 'Cheque'),
                    ('RAZORPAY', 'Razorpay (Online)'),
                    ('OTHER', 'Other'),
                ],
                default='CASH',
                help_text='Payment method',
                max_length=50,
            ),
        ),
    ]
