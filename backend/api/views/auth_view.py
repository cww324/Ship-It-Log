from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Register a new user account"""
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email", "")

    # Validation
    if not username:
        return Response(
            {"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not password:
        return Response(
            {"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {"error": "Password must be at least 6 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST
        )

    # Check if email already exists (if provided)
    if email and User.objects.filter(email=email).exists():
        return Response(
            {"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create user
        user = User.objects.create_user(
            username=username, password=password, email=email
        )

        # Create token for immediate login
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Account created successfully",
                "token": token.key,
                "user": {"id": user.id, "username": user.username, "email": user.email},
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": "Failed to create account"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def user_profile(request):
    """Get current user profile"""
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED
        )

    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "date_joined": request.user.date_joined,
        }
    )
