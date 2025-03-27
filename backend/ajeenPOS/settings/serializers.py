# settings/serializers.py
from rest_framework import serializers
from .models import SecuritySettings, TerminalLocation, TerminalReader

class SecuritySettingsSerializer(serializers.ModelSerializer):
    allowed_ips_list = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = SecuritySettings
        fields = [
            'id', 'two_factor_auth', 'session_timeout', 'password_expiry_days',
            'ip_restriction_enabled', 'allowed_ips', 'allowed_ips_list',
            'last_updated', 'updated_by'
        ]
        read_only_fields = ['id', 'last_updated', 'updated_by']
    
    def to_representation(self, instance):
        """Add allowed_ips_list to the output"""
        data = super().to_representation(instance)
        data['allowed_ips_list'] = instance.get_allowed_ips_list()
        return data
    
    def create(self, validated_data):
        """Handle creating or updating the singleton instance"""
        ip_list = validated_data.pop('allowed_ips_list', None)
        instance = SecuritySettings.get_settings()
        
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle IP list if provided
        if ip_list is not None:
            instance.set_allowed_ips_list(ip_list)
        
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Handle update with allowed_ips_list"""
        ip_list = validated_data.pop('allowed_ips_list', None)
        
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle IP list if provided
        if ip_list is not None:
            instance.set_allowed_ips_list(ip_list)
        
        instance.save()
        return instance


class TerminalLocationSerializer(serializers.ModelSerializer):
    address = serializers.SerializerMethodField()
    
    class Meta:
        model = TerminalLocation
        fields = [
            'id', 'display_name', 'stripe_location_id', 
            'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
            'address', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'stripe_location_id', 'created_at', 'updated_at']
    
    def get_address(self, obj):
        """Return formatted address for display"""
        return obj.get_address_dict()


class TerminalReaderSerializer(serializers.ModelSerializer):
    location_display = serializers.CharField(source='location.display_name', read_only=True)
    registration_code = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = TerminalReader
        fields = [
            'id', 'label', 'stripe_reader_id', 'location', 'location_display',
            'device_type', 'status', 'serial_number', 'last_seen', 'registration_code'
        ]
        read_only_fields = ['id', 'stripe_reader_id', 'status', 'last_seen']