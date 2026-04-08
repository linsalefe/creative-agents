import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.criativos import router as criativos_router
from routers.auth import router as auth_router
from routers.artes import router as artes_router
from routers.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed admin
    from services.database import init_db
    await init_db()
    await seed_admin()
    yield


async def seed_admin():
    """Create default admin user if not exists."""
    from sqlalchemy import select
    from passlib.context import CryptContext
    from services.database import SessionLocal
    from models.db_models import User

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@cenat.com.br"))
        if not result.scalar_one_or_none():
            admin = User(
                name="Admin CENAT",
                email="admin@cenat.com.br",
                password_hash=pwd_context.hash("cenat2026"),
                role="admin",
                credits=999999,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print("Admin user created: admin@cenat.com.br")


app = FastAPI(
    title="Creative Machine API",
    description="Pipeline multi-agente para geracao automatizada de criativos de marketing — by CENAT",
    version="2.0.0",
    lifespan=lifespan,
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

app.include_router(auth_router, prefix="/api")
app.include_router(criativos_router, prefix="/api")
app.include_router(artes_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

# Serve generated images
images_dir = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(images_dir, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=images_dir), name="images")

# Serve uploaded artes
artes_dir = os.path.join(os.path.dirname(__file__), "uploaded_artes")
os.makedirs(artes_dir, exist_ok=True)
app.mount("/static/artes", StaticFiles(directory=artes_dir), name="artes")


@app.get("/")
async def root():
    return {"status": "ok", "message": "Creative Machine API — by CENAT"}
