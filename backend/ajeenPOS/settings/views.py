# settings/views.py
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminUser
from .models import SecuritySettings, TerminalLocation, TerminalReader
from .serializers import SecuritySettingsSerializer, TerminalLocationSerializer, TerminalReaderSerializer
from .utils import sync_stripe_locations, sync_stripe_readers
import stripe
from django.conf import settings
import logging

# Configure Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)

class SecuritySettingsView(APIView):
    """
    View for managing security settings
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get the current security settings"""
        settings_obj = SecuritySettings.get_settings()
        serializer = SecuritySettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    def post(self, request):
        """Update security settings"""
        settings_obj = SecuritySettings.get_settings()
        serializer = SecuritySettingsSerializer(settings_obj, data=request.data)
        
        if serializer.is_valid():
            # Set the updated_by field to the current user
            serializer.save(updated_by=request.user)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TerminalLocationListView(APIView):
    """
    View for listing and creating terminal locations
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """List all terminal locations, optionally syncing with Stripe first"""
        # Check if we should sync with Stripe first
        sync_with_stripe = request.query_params.get('sync', 'false').lower() == 'true'
        
        if sync_with_stripe:
            try:
                sync_stripe_locations()
            except Exception as e:
                # Log the error but continue to return local data
                logger.error(f"Error syncing with Stripe: {str(e)}")
        
        locations = TerminalLocation.objects.all().order_by('display_name')
        serializer = TerminalLocationSerializer(locations, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new terminal location in Stripe and locally"""
        serializer = TerminalLocationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Create location in Stripe
                stripe_location = stripe.terminal.Location.create(
                    display_name=serializer.validated_data['display_name'],
                    address={
                        'line1': serializer.validated_data['address_line1'],
                        # 'line2': serializer.validated_data.get('address_line2', ''),
                        'city': serializer.validated_data['city'],
                        'state': serializer.validated_data['state'],
                        'country': serializer.validated_data['country'],
                        'postal_code': serializer.validated_data['postal_code'],
                    }
                )
                
                # Save to database with Stripe ID
                location = serializer.save(stripe_location_id=stripe_location.id)
                
                return Response(TerminalLocationSerializer(location).data, status=status.HTTP_201_CREATED)
            
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error creating location: {str(e)}")
                return Response(
                    {'error': f"Stripe error: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Error creating location: {str(e)}")
                return Response(
                    {'error': f"Error creating location: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TerminalLocationDetailView(APIView):
    """
    View for retrieving, updating and deleting terminal locations
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_object(self, pk):
        try:
            return TerminalLocation.objects.get(pk=pk)
        except TerminalLocation.DoesNotExist:
            return None
    
    def get(self, request, pk):
        """Get a terminal location"""
        location = self.get_object(pk)
        if location is None:
            return Response({'error': 'Location not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TerminalLocationSerializer(location)
        return Response(serializer.data)
    
    def put(self, request, pk):
        """Update a terminal location"""
        location = self.get_object(pk)
        if location is None:
            return Response({'error': 'Location not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TerminalLocationSerializer(location, data=request.data)
        
        if serializer.is_valid():
            try:
                # Update location in Stripe if we have a Stripe ID
                if location.stripe_location_id:
                    stripe.terminal.Location.modify(
                        location.stripe_location_id,
                        display_name=serializer.validated_data['display_name'],
                        address={
                            'line1': serializer.validated_data['address_line1'],
                            'line2': serializer.validated_data.get('address_line2', ''),
                            'city': serializer.validated_data['city'],
                            'state': serializer.validated_data['state'],
                            'country': serializer.validated_data['country'],
                            'postal_code': serializer.validated_data['postal_code'],
                        }
                    )
                
                # Save to database
                serializer.save()
                
                return Response(serializer.data)
            
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error updating location: {str(e)}")
                return Response(
                    {'error': f"Stripe error: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Error updating location: {str(e)}")
                return Response(
                    {'error': f"Error updating location: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete a terminal location"""
        location = self.get_object(pk)
        if location is None:
            return Response({'error': 'Location not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Delete location in Stripe if we have a Stripe ID
            if location.stripe_location_id:
                stripe.terminal.Location.delete(location.stripe_location_id)
            
            # Delete from database
            location.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error deleting location: {str(e)}")
            return Response(
                {'error': f"Stripe error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error deleting location: {str(e)}")
            return Response(
                {'error': f"Error deleting location: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TerminalReaderListView(APIView):
    """
    View for listing and registering terminal readers
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """List all terminal readers, optionally syncing with Stripe first"""
        # Check if we should sync with Stripe first
        sync_with_stripe = request.query_params.get('sync', 'false').lower() == 'true'
        
        if sync_with_stripe:
            try:
                sync_stripe_readers()
            except Exception as e:
                # Log the error but continue to return local data
                logger.error(f"Error syncing with Stripe: {str(e)}")
        
        readers = TerminalReader.objects.all().order_by('label')
        serializer = TerminalReaderSerializer(readers, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Register a new terminal reader"""
        serializer = TerminalReaderSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                location = serializer.validated_data['location']
                label = serializer.validated_data['label']
                registration_code = serializer.validated_data['registration_code']
                
                # Check if location has a Stripe ID
                if not location.stripe_location_id:
                    return Response(
                        {'error': 'Location does not have a Stripe ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Register reader in Stripe
                stripe_reader = stripe.terminal.Reader.create(
                    registration_code=registration_code,
                    location=location.stripe_location_id,
                    label=label
                )
                
                # Save to database with Stripe ID
                reader = TerminalReader.objects.create(
                    label=label,
                    location=location,
                    stripe_reader_id=stripe_reader.id,
                    device_type=stripe_reader.device_type,
                    status=stripe_reader.status,
                    serial_number=getattr(stripe_reader, 'serial_number', None)
                )
                
                return Response(TerminalReaderSerializer(reader).data, status=status.HTTP_201_CREATED)
            
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error registering reader: {str(e)}")
                return Response(
                    {'error': f"Stripe error: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Error registering reader: {str(e)}")
                return Response(
                    {'error': f"Error registering reader: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class StripeLocationSyncView(APIView):
    """
    View for synchronizing Stripe terminal locations with local database
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Sync locations from Stripe to local database"""
        try:
            created, updated, errors = sync_stripe_locations()
            
            return Response({
                'status': 'success',
                'message': f'Synced locations from Stripe: {created} created, {updated} updated, {errors} errors',
                'created': created,
                'updated': updated,
                'errors': errors
            })
        except Exception as e:
            logger.error(f"Error syncing locations: {str(e)}")
            return Response(
                {'error': f"Failed to sync locations: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StripeReaderSyncView(APIView):
    """
    View for synchronizing Stripe terminal readers with local database
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Sync readers from Stripe to local database"""
        try:
            created, updated, errors = sync_stripe_readers()
            
            return Response({
                'status': 'success',
                'message': f'Synced readers from Stripe: {created} created, {updated} updated, {errors} errors',
                'created': created,
                'updated': updated,
                'errors': errors
            })
        except Exception as e:
            logger.error(f"Error syncing readers: {str(e)}")
            return Response(
                {'error': f"Failed to sync readers: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )