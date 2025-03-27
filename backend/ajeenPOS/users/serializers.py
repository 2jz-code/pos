from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import CustomUser

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'role', 'is_pos_user', 'is_website_user', 'password', 
                 'confirm_password', 'date_joined', 'last_login', 'is_active']
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def validate(self, data):
        # When creating a new user (not updating)
        if self.instance is None and 'password' in data:
            # Check if confirm_password exists in the data
            if 'confirm_password' in data:
                if data.get('password') != data.get('confirm_password'):
                    raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
                # Remove confirm_password from validated data after validation
                data.pop('confirm_password')
            # For API calls that don't include confirm_password (like from other systems)
            # We can skip this validation
        return data
    
    def create(self, validated_data):
        # Extract password
        password = validated_data.pop('password', None)
        
        # Create user instance
        user = User(**validated_data)
        
        # Set password if provided
        if password:
            user.set_password(password)
        
        user.save()
        return user
    
    def update(self, instance, validated_data):
        # Handle password separately
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

class WebsiteUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'phone_number', 'password']
        
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user
        
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance