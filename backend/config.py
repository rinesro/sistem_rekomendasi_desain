import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_RESEARCH_MODEL = os.getenv("GEMINI_RESEARCH_MODEL", "gemini-2.5-flash")
GEMINI_SYNTHESIS_MODEL = os.getenv("GEMINI_SYNTHESIS_MODEL", "gemini-2.5-pro")
