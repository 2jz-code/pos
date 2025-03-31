# rewards/views.py
from rest_framework import status, viewsets, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from users.models import CustomUser
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import (
    RewardsProfile, PointTransaction, Reward, 
    RewardRedemption, PointsRule
)
from .serializers import (
    RewardsProfileSerializer, PointTransactionSerializer,
    RewardSerializer, RewardRedemptionSerializer,
    PointsRuleSerializer
)
from users.permissions import IsWebsiteUser, IsAdminUser

# In rewards/views.py

class RewardsProfileView(APIView):
    """
    Get the rewards profile for the current user
    """
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    def get(self, request):
        # Check if user has opted in
        if not request.user.is_rewards_opted_in:
            return Response({
                'error': 'You have not opted into the rewards program',
                'opt_in_required': True
            }, status=status.HTTP_403_FORBIDDEN)
            
        try:
            profile = request.user.rewards_profile
            serializer = RewardsProfileSerializer(profile)
            return Response(serializer.data)
        except RewardsProfile.DoesNotExist:
            # Create profile if user has opted in but profile doesn't exist
            profile = RewardsProfile.objects.create(user=request.user)
            serializer = RewardsProfileSerializer(profile)
            return Response(serializer.data)

class PointTransactionListView(generics.ListAPIView):
    """
    List all point transactions for the current user
    """
    serializer_class = PointTransactionSerializer
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    def get_queryset(self):
        try:
            profile = self.request.user.rewards_profile
            return PointTransaction.objects.filter(profile=profile).order_by('-created_at')
        except RewardsProfile.DoesNotExist:
            return PointTransaction.objects.none()

class RewardListView(generics.ListAPIView):
    """
    List all available rewards
    """
    serializer_class = RewardSerializer
    
    def get_queryset(self):
        return Reward.objects.filter(is_active=True)

class RewardRedemptionView(APIView):
    """
    Redeem a reward
    """
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    @transaction.atomic
    def post(self, request):
        reward_id = request.data.get('reward_id')
        
        if not reward_id:
            return Response(
                {'error': 'Reward ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the reward
        try:
            reward = Reward.objects.get(id=reward_id, is_active=True)
        except Reward.DoesNotExist:
            return Response(
                {'error': 'Reward not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the user's profile
        try:
            profile = request.user.rewards_profile
        except RewardsProfile.DoesNotExist:
            return Response(
                {'error': 'Rewards profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has enough points
        if profile.points_balance < reward.points_required:
            return Response(
                {'error': 'Not enough points to redeem this reward'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Redeem the points
        try:
            profile.redeem_points(
                points=reward.points_required,
                source='reward',
                reference=f"Redeemed {reward.name}"
            )
            
            # Create redemption record
            redemption = RewardRedemption.objects.create(
                profile=profile,
                reward=reward,
                points_used=reward.points_required
            )
            
            # Generate a unique code
            redemption.generate_code()
            
            # Return the redemption details
            serializer = RewardRedemptionSerializer(redemption)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RewardRedemptionListView(generics.ListAPIView):
    """
    List all reward redemptions for the current user
    """
    serializer_class = RewardRedemptionSerializer
    permission_classes = [IsAuthenticated, IsWebsiteUser]
    
    def get_queryset(self):
        try:
            profile = self.request.user.rewards_profile
            return RewardRedemption.objects.filter(profile=profile).order_by('-redeemed_at')
        except RewardsProfile.DoesNotExist:
            return RewardRedemption.objects.none()

class VerifyRedemptionCodeView(APIView):
    """
    Verify and mark a redemption code as used (for POS system)
    """
    permission_classes = [IsAuthenticated]  # POS users
    
    def post(self, request):
        code = request.data.get('code')
        
        if not code:
            return Response(
                {'error': 'Redemption code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the redemption
        try:
            redemption = RewardRedemption.objects.get(redemption_code=code, is_used=False)
        except RewardRedemption.DoesNotExist:
            return Response(
                {'error': 'Invalid or already used redemption code'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark as used
        redemption.mark_as_used()
        
        # Return reward details
        return Response({
            'reward': RewardSerializer(redemption.reward).data,
            'redemption': RewardRedemptionSerializer(redemption).data
        })

# Admin-only views for managing the rewards system
class AdminPointsRuleViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for points rules (admin only)
    """
    queryset = PointsRule.objects.all()
    serializer_class = PointsRuleSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

class AdminRewardViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for rewards (admin only)
    """
    queryset = Reward.objects.all()
    serializer_class = RewardSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

class AdminRewardsProfileViewSet(viewsets.ModelViewSet):
    """
    Manage rewards profiles (admin only)
    """
    queryset = RewardsProfile.objects.all()
    serializer_class = RewardsProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @action(detail=True, methods=['post'])
    def adjust_points(self, request, pk=None):
        profile = self.get_object()
        points = request.data.get('points')
        reason = request.data.get('reason', 'Manual adjustment')
        
        if not points:
            return Response(
                {'error': 'Points amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            points = int(points)
        except ValueError:
            return Response(
                {'error': 'Points must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add or subtract points
        if points > 0:
            profile.add_points(points, source='manual', reference=reason)
        else:
            try:
                profile.redeem_points(abs(points), source='manual', reference=reason)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(RewardsProfileSerializer(profile).data)
    
    @action(detail=False, methods=['get'], url_path='by-user/(?P<user_id>[^/.]+)')
    def by_user(self, request, user_id=None):
        """Get rewards profile for a specific user"""
        try:
            user = CustomUser.objects.get(id=user_id)
            profile = RewardsProfile.objects.get(user=user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except RewardsProfile.DoesNotExist:
            return Response({"error": "Rewards profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """Get transactions for a rewards profile"""
        profile = self.get_object()
        transactions = PointTransaction.objects.filter(profile=profile).order_by('-created_at')
        serializer = PointTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def redemptions(self, request, pk=None):
        """Get redemptions for a rewards profile"""
        profile = self.get_object()
        redemptions = RewardRedemption.objects.filter(profile=profile).order_by('-redeemed_at')
        serializer = RewardRedemptionSerializer(redemptions, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=['get'], url_path='by-phone/(?P<phone>[^/.]+)')
    def by_phone(self, request, phone=None):
        """Get rewards profile for a specific phone number"""
        try:
            # Remove any non-digit characters
            phone = ''.join(filter(str.isdigit, phone))
            
            # Find the user with this phone number
            user = CustomUser.objects.filter(phone_number=phone).first()  # Change 'phone' to 'phone_number'
            if user:
                profile = RewardsProfile.objects.get(user=user)
                serializer = self.get_serializer(profile)
                return Response(serializer.data)
            
            return Response({"error": "No rewards profile found with this phone number"}, 
                            status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new rewards member"""
        try:
            # Extract data from request
            first_name = request.data.get('first_name')
            last_name = request.data.get('last_name')
            phone = request.data.get('phone')
            email = request.data.get('email')
            
            # Validate required fields
            if not all([first_name, last_name, phone]):
                return Response(
                    {"error": "First name, last name, and phone are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user with this phone already exists
            existing_user = CustomUser.objects.filter(phone=phone).first()
            if existing_user:
                # If user exists but hasn't opted in, opt them in
                if not existing_user.is_rewards_opted_in:
                    existing_user.is_rewards_opted_in = True
                    existing_user.save()
                    # The signal will create the rewards profile
                    profile = RewardsProfile.objects.get(user=existing_user)
                    serializer = self.get_serializer(profile)
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {"error": "A user with this phone number is already in the rewards program"},
                        status=status.HTTP_409_CONFLICT
                    )
            
            # Create new user
            user = CustomUser.objects.create(
                username=f"{first_name.lower()}.{last_name.lower()}.{phone[-4:]}",
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                email=email,
                is_website_user=True,
                is_rewards_opted_in=True  # Set opt-in to true
            )
            
            # Set a random password
            import random
            import string
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            user.set_password(password)
            user.save()
            
            # Get the automatically created rewards profile
            profile = RewardsProfile.objects.get(user=user)
            
            # Return the profile
            serializer = self.get_serializer(profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)