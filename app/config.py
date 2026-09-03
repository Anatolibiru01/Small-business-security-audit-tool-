"""
Application Configuration and Constants.
"""

import os

APP_TITLE = "Small-Business Security Audit Tool"
APP_SUBTITLE = "Automated Linux System Hardening & Lynis Audit Dashboard"
VERSION = "1.0.0"

# Server Host & Port Defaults
DEFAULT_HOST = os.environ.get("HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("PORT", 8000))

# Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "app", "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "app", "templates")
