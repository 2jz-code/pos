# Generated by Django 5.1.5 on 2025-03-30 12:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_alter_customuser_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='is_rewards_opted_in',
            field=models.BooleanField(default=False, help_text='Whether the user has opted into the rewards program'),
        ),
    ]
