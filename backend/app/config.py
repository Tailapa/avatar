import os
from dotenv import load_dotenv

# Load .env from parent directory (project root)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'), override=True)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("MODEL", "openai/gpt-5.4-nano")
OWNER_NAME = os.getenv("OWNER_NAME", "Digital Twin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
PUSHOVER_USER = os.getenv("PUSHOVER_USER", "")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", f"avatar::{ADMIN_PASSWORD}")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"
