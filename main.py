import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.criativos import router as criativos_router

app = FastAPI(
    title="Creative Agents API",
    description="Pipeline multi-agente para geração automatizada de criativos de marketing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://creative.cenatdata.online",
        "http://creative.cenatdata.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(criativos_router)

# Servir imagens geradas como arquivos estáticos
images_dir = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=images_dir), name="images")


@app.get("/")
async def root():
    return {"status": "ok", "message": "Creative Agents API"}
