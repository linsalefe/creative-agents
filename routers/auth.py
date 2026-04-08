import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import User
from services.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "creative-machine-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


# --- Schemas ---


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    avatar_url: str | None = None
    credits: int = 1000
    is_active: bool = True
    created_at: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateCreditsRequest(BaseModel):
    credits: int


class ToggleActiveRequest(BaseModel):
    is_active: bool


# --- Helpers ---


def _user_to_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        avatar_url=u.avatar_url,
        credits=u.credits,
        is_active=u.is_active,
        created_at=u.created_at.isoformat() if u.created_at else None,
    )


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token nao fornecido")
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Token invalido")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


# --- Auth Endpoints ---


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=pwd_context.hash(req.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_token(user.id),
        user=_user_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Conta desativada. Entre em contato com o administrador.",
        )

    return TokenResponse(
        access_token=create_token(user.id),
        user=_user_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return _user_to_response(user)


# --- Profile Endpoints ---


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.name is not None:
        user.name = req.name
    if req.email is not None:
        existing = await db.execute(
            select(User).where(User.email == req.email, User.id != user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email ja em uso")
        user.email = req.email
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not pwd_context.verify(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.password_hash = pwd_context.hash(req.new_password)
    await db.commit()
    return {"message": "Senha alterada com sucesso"}


# --- Admin: User Management ---


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(
    req: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=pwd_context.hash(req.password),
        role=req.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    req: UpdateUserRoleRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user.role = req.role
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.patch("/users/{user_id}/credits", response_model=UserResponse)
async def update_user_credits(
    user_id: int,
    req: UpdateCreditsRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if req.credits < 0:
        raise HTTPException(status_code=400, detail="Creditos nao podem ser negativos")
    user.credits = req.credits
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.patch("/users/{user_id}/active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    req: ToggleActiveRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user.is_active = req.is_active
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Nao e possivel deletar um admin")
    await db.delete(user)
    await db.commit()
    return {"message": "Usuario deletado com sucesso"}


@router.get("/admin/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func as sqlfunc
    from models.db_models import Arte, Variacao

    total_users = await db.execute(select(sqlfunc.count(User.id)))
    active_users = await db.execute(
        select(sqlfunc.count(User.id)).where(User.is_active == True)
    )
    total_artes = await db.execute(select(sqlfunc.count(Arte.id)))
    total_variacoes = await db.execute(select(sqlfunc.count(Variacao.id)))

    return {
        "total_users": total_users.scalar(),
        "active_users": active_users.scalar(),
        "total_artes": total_artes.scalar(),
        "total_variacoes": total_variacoes.scalar(),
    }
