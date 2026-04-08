from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from services.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    avatar_url = Column(String(500), nullable=True)
    credits = Column(Integer, default=1000, nullable=False, server_default="1000")
    is_active = Column(Boolean, default=True, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    artes = relationship("Arte", back_populates="user", cascade="all, delete-orphan")
    variacoes = relationship("Variacao", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class Arte(Base):
    __tablename__ = "artes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    analise_json = Column(JSON, nullable=True)
    embedding = Column(Vector(768), nullable=True)
    tags = Column(JSON, default=list)
    favorito = Column(Boolean, default=False)
    pasta = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="artes")
    variacoes = relationship("Variacao", back_populates="arte", cascade="all, delete-orphan")


class Variacao(Base):
    __tablename__ = "variacoes"

    id = Column(Integer, primary_key=True, index=True)
    arte_id = Column(Integer, ForeignKey("artes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    headline = Column(String(255))
    subheadline = Column(String(500))
    cta = Column(String(100))
    imagem_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    arte = relationship("Arte", back_populates="variacoes")
    user = relationship("User", back_populates="variacoes")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    imagem_url = Column(String(500), nullable=True)
    arte_ref_id = Column(Integer, ForeignKey("artes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="messages")
    arte_ref = relationship("Arte")
