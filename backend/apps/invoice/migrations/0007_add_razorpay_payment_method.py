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
                    ('BANK_TRANSFER', 'Bank Transfer'),
                    ('RAZORPAY', 'Razorpay (Online)'),
                ],
                default='CASH',
                help_text='Payment method',
                max_length=50,
            ),
        ),
    ]
