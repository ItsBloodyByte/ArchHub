"""Application configuration and constants."""
import os
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'archhub_default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRY_MINUTES = int(os.environ.get('JWT_EXPIRY_MINUTES', '1440'))

# Anti-Bot Rate Limiting (in-memory)
registration_attempts = defaultdict(list)  # ip -> [timestamps]
REGISTRATION_RATE_LIMIT = 3
REGISTRATION_RATE_WINDOW = 3600  # 1 hour
MIN_REGISTRATION_TIME_MS = 2000  # minimum 2 seconds to fill form

# Media
MEDIA_DIR = Path("uploads/media")
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
MAX_MEDIA_SIZE = 5 * 1024 * 1024  # 5 MB
