# Generated by Django 5.1.5 on 2025-03-30 02:03

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rewards', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='rewardsprofile',
            name='guest_email',
        ),
        migrations.RemoveField(
            model_name='rewardsprofile',
            name='guest_id',
        ),
    ]
