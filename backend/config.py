import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Satu model dipakai untuk semua pemanggilan Gemini (riset & sintesis).
# Default dipilih model stabil (GA, bukan preview) karena model preview seperti
# gemini-3-flash-preview punya kuota gratis yang jauh lebih ketat dan mudah kena
# error 429 RESOURCE_EXHAUSTED. Bisa diganti lewat env var GEMINI_MODEL kapan saja,
# termasuk balik ke gemini-3-flash-preview kalau kuotanya sudah cukup.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
