"""
Django settings for ajeenPOS project.

Generated by 'django-admin startproject' using Django 5.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-p(z*7*h-%edr6kgk(l_8fhju&@r$y+l&q7b6&7*8g*ugku5nob'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '3d60-74-33-197-86.ngrok-free.app']


# Application definition

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "users",
    "products",
    "orders",
    'payments',
    "reports",
    'channels',
    'hardware.apps.HardwareConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "users.middleware.JWTMiddleware",
    'hardware.middleware.HardwareDebugMiddleware',
]

ROOT_URLCONF = 'ajeenPOS.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Hardware configurations
# HARDWARE_CONFIG = {
#     'CASH_DRAWER_PORT': '/dev/ttyUSB0',  # or COM3 on Windows
#     'CARD_TERMINAL_IP': '192.168.1.100',
#     'CARD_TERMINAL_PORT': 8000,
#     'RECEIPT_PRINTERS': [
#         {'ip': '192.168.1.201', 'port': 9100},
#         {'ip': '192.168.1.202', 'port': 9100},
#     ],
# }

WSGI_APPLICATION = 'ajeenPOS.wsgi.application'
ASGI_APPLICATION = 'ajeenPOS.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)]
        }
    }
}

AUTH_USER_MODEL = 'users.CustomUser'
CORS_ALLOW_ALL_ORIGINS = True  # Enable for development only
CORS_ALLOW_CREDENTIALS = True
CSRF_COOKIE_HTTPONLY = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://3d60-74-33-197-86.ngrok-free.app"
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://3d60-74-33-197-86.ngrok-free.app"
]
from datetime import timedelta

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        'users.authentication.WebsiteCookieJWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / "static"

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        '': {  # Root logger
            'handlers': ['console'],
            'level': 'INFO',
        },
        'ajeenPOS': {  # Replace with your project name
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'ajeenPOS.hardware': {  # Replace with your actual path
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}



## payment configs
STRIPE_PUBLISHABLE_KEY = 'pk_test_51QwDbDGG2WaWxpBvik8mLyk1eddCCU706eL4oq3HH1fGY7rTbtqD42ixuMo7bbeht7ixp3X8H7h1Qd3j2mZF7pEi0006NR8YVR'
STRIPE_SECRET_KEY = 'sk_test_51QwDbDGG2WaWxpBvDWzQT1lfmoz4rOICsqF7Gs7TOtanbAKEUIoWMNfvJYIy82D3aCsTApADim38GL5UpXpUxA1p00W8tbQ5bi'
STRIPE_WEBHOOK_SECRET = 'whsec_1192047b9069f0c07fea922217324a87f1651a27fda96947940e7d2588754ce0'

CSP_DEFAULT_SRC = ("'self'", "*.stripe.com")
CSP_SCRIPT_SRC = ("'self'", "*.stripe.com", "https://js.stripe.com")
CSP_FRAME_SRC = ("'self'", "*.stripe.com")
CSP_CONNECT_SRC = ("'self'", "*.stripe.com", "api.stripe.com")

FRONTEND_URL = 'http://localhost:3000'