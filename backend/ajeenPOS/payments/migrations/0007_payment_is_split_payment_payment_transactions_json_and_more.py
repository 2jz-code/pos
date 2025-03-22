# Generated by Django 5.1.5 on 2025-03-20 07:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_alter_payment_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='is_split_payment',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='payment',
            name='transactions_json',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(blank=True, choices=[('cash', 'Cash'), ('credit', 'Credit Card'), ('split', 'Split Payment')], max_length=255, null=True),
        ),
    ]
