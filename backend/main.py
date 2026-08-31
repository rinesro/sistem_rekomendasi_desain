from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .gemini_service import GeminiServiceError, generate_design_recommendation
from .schemas import DesignRecommendation, RecommendationRequest

app = FastAPI(
    title="Sistem Rekomendasi Desain UI/UX",
    description=(
        "Merekomendasikan bentuk, ukuran, dan warna UI (web/mobile/desktop) "
        "berdasarkan kebutuhan sistem dan target user, memakai Gemini sebagai "
        "mesin riset otomatis dan basis teori UI/UX tervalidasi."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/recommend", response_model=DesignRecommendation)
def recommend(req: RecommendationRequest) -> DesignRecommendation:
    try:
        return generate_design_recommendation(req)
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "index.html")
