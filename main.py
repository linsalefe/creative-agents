from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.criativos import router as criativos_router

app = FastAPI(
    title="Creative Agents API",
    description="Pipeline multi-agente para geração automatizada de criativos de marketing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(criativos_router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Creative Agents API"}
