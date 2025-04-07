# Generated by Django 5.1.5 on 2025-04-06 20:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('discounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='discount',
            name='discount_category',
            field=models.CharField(choices=[('promotional', 'Promotional Discount'), ('permanent', 'Permanent Discount')], default='promotional', help_text='Whether this is a time-limited promotion or a permanent discount', max_length=15),
        ),
    ]
