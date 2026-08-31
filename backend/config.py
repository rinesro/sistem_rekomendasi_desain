import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Satu model dipakai untuk semua pemanggilan Gemini (riset & sintesis).
# ID resmi Gemini 3 Flash per dokumentasi Google (masih berstatus "preview" di sisi
# Google walau sudah stabil dipakai). Bisa diganti lewat env var GEMINI_MODEL kalau
# suatu saat ingin pindah ke versi lain (mis. gemini-3.5-flash).
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
