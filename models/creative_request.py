from pydantic import BaseModel
from typing import Optional


class CreativeRequest(BaseModel):
    produto: str
    publico: str
    contexto: str
    plataforma: Optional[str] = None
