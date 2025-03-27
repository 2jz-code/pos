# settings/utils.py
import stripe
import logging
from django.conf import settings
from django.utils import timezone
from .models import TerminalLocation, TerminalReader

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

def sync_stripe_locations():
    """
    Synchronize Stripe terminal locations with the local database.
    Fetches all locations from Stripe and creates local records if they don't exist.
    Returns a tuple of (created_count, updated_count, error_count)
    """
    created_count = 0
    updated_count = 0
    error_count = 0
    
    try:
        # Fetch all locations from Stripe
        stripe_locations = stripe.terminal.Location.list(limit=100)
        
        for stripe_location in stripe_locations.data:
            try:
                # Check if location already exists in our database
                location, created = TerminalLocation.objects.get_or_create(
                    stripe_location_id=stripe_location.id,
                    defaults={
                        'display_name': stripe_location.display_name,
                        'address_line1': stripe_location.address.line1,
                        'address_line2': stripe_location.address.get('line2', ''),
                        'city': stripe_location.address.city,
                        'state': stripe_location.address.state,
                        'country': stripe_location.address.country,
                        'postal_code': stripe_location.address.postal_code
                    }
                )
                
                if created:
                    created_count += 1
                    logger.info(f"Created new location record for Stripe location: {stripe_location.id}")
                else:
                    # Update the existing record with latest Stripe data
                    location.display_name = stripe_location.display_name
                    location.address_line1 = stripe_location.address.line1
                    location.address_line2 = stripe_location.address.get('line2', '')
                    location.city = stripe_location.address.city
                    location.state = stripe_location.address.state
                    location.country = stripe_location.address.country
                    location.postal_code = stripe_location.address.postal_code
                    location.updated_at = timezone.now()
                    location.save()
                    updated_count += 1
                    logger.info(f"Updated existing location record for Stripe location: {stripe_location.id}")
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error syncing Stripe location {stripe_location.id}: {str(e)}")
        
        return (created_count, updated_count, error_count)
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error while syncing locations: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while syncing locations: {str(e)}")
        raise

def sync_stripe_readers():
    """
    Synchronize Stripe terminal readers with the local database.
    Fetches all readers from Stripe and creates local records if they don't exist.
    Returns a tuple of (created_count, updated_count, error_count)
    """
    created_count = 0
    updated_count = 0
    error_count = 0
    
    try:
        # Fetch all readers from Stripe
        stripe_readers = stripe.terminal.Reader.list(limit=100)
        
        for stripe_reader in stripe_readers.data:
            try:
                # Find the corresponding location in our database
                if stripe_reader.location:
                    try:
                        location = TerminalLocation.objects.get(stripe_location_id=stripe_reader.location)
                    except TerminalLocation.DoesNotExist:
                        # If location doesn't exist in our DB, sync locations first
                        sync_stripe_locations()
                        try:
                            location = TerminalLocation.objects.get(stripe_location_id=stripe_reader.location)
                        except TerminalLocation.DoesNotExist:
                            # If still doesn't exist, skip this reader
                            logger.warning(f"Could not find location {stripe_reader.location} for reader {stripe_reader.id}")
                            error_count += 1
                            continue
                else:
                    location = None
                
                # Check if reader already exists in our database
                reader, created = TerminalReader.objects.get_or_create(
                    stripe_reader_id=stripe_reader.id,
                    defaults={
                        'label': stripe_reader.label or f"Reader {stripe_reader.id}",
                        'location': location,
                        'device_type': stripe_reader.device_type,
                        'status': stripe_reader.status,
                        'serial_number': getattr(stripe_reader, 'serial_number', None)
                    }
                )
                
                if created:
                    created_count += 1
                    logger.info(f"Created new reader record for Stripe reader: {stripe_reader.id}")
                else:
                    # Update the existing record with latest Stripe data
                    reader.label = stripe_reader.label or f"Reader {stripe_reader.id}"
                    reader.location = location
                    reader.device_type = stripe_reader.device_type
                    reader.status = stripe_reader.status
                    reader.serial_number = getattr(stripe_reader, 'serial_number', None)
                    reader.updated_at = timezone.now()
                    reader.save()
                    updated_count += 1
                    logger.info(f"Updated existing reader record for Stripe reader: {stripe_reader.id}")
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error syncing Stripe reader {stripe_reader.id}: {str(e)}")
        
        return (created_count, updated_count, error_count)
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error while syncing readers: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while syncing readers: {str(e)}")
        raise