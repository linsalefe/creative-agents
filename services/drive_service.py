"""Google Drive Service via Composio — upload e organização de criativos."""
import os
import logging
from typing import Optional

from composio import Composio

logger = logging.getLogger(__name__)


class DriveService:
    def __init__(self):
        api_key = os.getenv("COMPOSIO_API_KEY")
        if not api_key:
            logger.warning("COMPOSIO_API_KEY não configurada")
        self.composio = Composio(api_key=api_key) if api_key else None

    def _user_id(self, user_id: int) -> str:
        """Mapeia user.id do app → user_id do Composio."""
        return f"creative_user_{user_id}"

    # ── Auth ──

    def get_auth_url(self, user_id: int) -> str:
        """Retorna URL OAuth para conectar Google Drive."""
        connection = self.composio.connected_accounts.initiate(
            user_id=self._user_id(user_id),
            toolkit="googledrive",
            redirect_url="https://creative.cenatdata.online/configuracoes?drive=connected",
        )
        return connection.redirect_url

    def is_connected(self, user_id: int) -> bool:
        """Verifica se o Drive está conectado para este usuário."""
        try:
            accounts = self.composio.connected_accounts.list(
                user_id=self._user_id(user_id),
                toolkit="googledrive",
            )
            return any(a.status == "ACTIVE" for a in accounts)
        except Exception as e:
            logger.error(f"Erro ao checar conexão Drive: {e}")
            return False

    def disconnect(self, user_id: int) -> bool:
        """Desconecta o Google Drive do usuário."""
        try:
            accounts = self.composio.connected_accounts.list(
                user_id=self._user_id(user_id),
                toolkit="googledrive",
            )
            for account in accounts:
                self.composio.connected_accounts.delete(account.id)
            return True
        except Exception as e:
            logger.error(f"Erro ao desconectar Drive: {e}")
            return False

    # ── Operações de pasta ──

    def _create_folder(self, user_id: int, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Cria pasta no Drive. Retorna folder_id."""
        try:
            args = {"name": name}
            if parent_id:
                args["parent_folder_id"] = parent_id

            result = self.composio.tools.execute(
                "GOOGLEDRIVE_CREATE_A_FOLDER",
                user_id=self._user_id(user_id),
                arguments=args,
            )

            if result and result.data:
                return result.data.get("id")
            return None
        except Exception as e:
            logger.error(f"Erro ao criar pasta '{name}': {e}")
            return None

    def _find_folder(self, user_id: int, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Busca pasta pelo nome. Retorna folder_id ou None."""
        try:
            query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            if parent_id:
                query += f" and '{parent_id}' in parents"

            result = self.composio.tools.execute(
                "GOOGLEDRIVE_FIND_FILE",
                user_id=self._user_id(user_id),
                arguments={"query": query},
            )

            if result and result.data:
                files = result.data.get("files", [])
                if files:
                    return files[0].get("id")
            return None
        except Exception as e:
            logger.error(f"Erro ao buscar pasta '{name}': {e}")
            return None

    def _find_or_create_folder(self, user_id: int, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Encontra ou cria pasta. Retorna folder_id."""
        folder_id = self._find_folder(user_id, name, parent_id)
        if folder_id:
            return folder_id
        return self._create_folder(user_id, name, parent_id)

    # ── Upload ──

    def _upload_file(self, user_id: int, local_path: str, folder_id: str) -> dict:
        """Faz upload de arquivo para pasta no Drive."""
        result = self.composio.tools.execute(
            "GOOGLEDRIVE_UPLOAD_FILE",
            user_id=self._user_id(user_id),
            arguments={
                "file_to_upload": local_path,
                "folder_id": folder_id,
            },
        )
        return result.data if result and result.data else {}

    # ── Operações de alto nível ──

    def export_criativo(
        self,
        user_id: int,
        produto_nome: str,
        criativo_numero: int,
        files: list[dict],
    ) -> dict:
        """
        Exporta criativo para Drive com estrutura:
        Creative Machine / {produto} / Criativo {N} / arquivos
        """
        if not self.composio:
            raise Exception("Composio não configurado")

        root_id = self._find_or_create_folder(user_id, "Creative Machine")
        if not root_id:
            raise Exception("Falha ao criar pasta raiz")

        produto_id = self._find_or_create_folder(user_id, produto_nome, root_id)
        if not produto_id:
            raise Exception(f"Falha ao criar pasta do produto: {produto_nome}")

        criativo_folder = f"Criativo {criativo_numero:02d}"
        criativo_id = self._find_or_create_folder(user_id, criativo_folder, produto_id)
        if not criativo_id:
            raise Exception(f"Falha ao criar pasta: {criativo_folder}")

        uploaded = []
        for f in files:
            try:
                result = self._upload_file(user_id, f["local_path"], criativo_id)
                uploaded.append({
                    "filename": f.get("filename", os.path.basename(f["local_path"])),
                    "status": "ok",
                    "drive_data": result,
                })
            except Exception as e:
                logger.error(f"Upload falhou: {e}")
                uploaded.append({
                    "filename": f.get("filename", ""),
                    "status": "error",
                    "error": str(e),
                })

        return {
            "produto": produto_nome,
            "pasta": criativo_folder,
            "path": f"Creative Machine/{produto_nome}/{criativo_folder}",
            "arquivos": uploaded,
            "exportados": sum(1 for u in uploaded if u["status"] == "ok"),
            "falhas": sum(1 for u in uploaded if u["status"] == "error"),
        }

    def export_video(
        self,
        user_id: int,
        produto_nome: str,
        video_numero: int,
        local_path: str,
    ) -> dict:
        """
        Exporta vídeo para Drive:
        Creative Machine / {produto} / Video {N} / arquivo.mp4
        """
        if not self.composio:
            raise Exception("Composio não configurado")

        root_id = self._find_or_create_folder(user_id, "Creative Machine")
        produto_id = self._find_or_create_folder(user_id, produto_nome, root_id)
        video_folder = f"Video {video_numero:02d}"
        video_id = self._find_or_create_folder(user_id, video_folder, produto_id)

        result = self._upload_file(user_id, local_path, video_id)

        return {
            "produto": produto_nome,
            "pasta": video_folder,
            "path": f"Creative Machine/{produto_nome}/{video_folder}",
            "drive_data": result,
        }

    def list_produtos(self, user_id: int) -> list[str]:
        """Lista pastas de produtos no Drive."""
        try:
            root_id = self._find_folder(user_id, "Creative Machine")
            if not root_id:
                return []

            result = self.composio.tools.execute(
                "GOOGLEDRIVE_FIND_FILE",
                user_id=self._user_id(user_id),
                arguments={
                    "query": f"'{root_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                },
            )

            if result and result.data:
                return [f["name"] for f in result.data.get("files", [])]
            return []
        except Exception as e:
            logger.error(f"Erro ao listar produtos: {e}")
            return []

    def count_criativos(self, user_id: int, produto_nome: str) -> int:
        """Conta quantos criativos já existem para um produto."""
        try:
            root_id = self._find_folder(user_id, "Creative Machine")
            if not root_id:
                return 0
            produto_id = self._find_folder(user_id, produto_nome, root_id)
            if not produto_id:
                return 0

            result = self.composio.tools.execute(
                "GOOGLEDRIVE_FIND_FILE",
                user_id=self._user_id(user_id),
                arguments={
                    "query": f"'{produto_id}' in parents and mimeType='application/vnd.google-apps.folder' and name contains 'Criativo' and trashed=false",
                },
            )

            if result and result.data:
                return len(result.data.get("files", []))
            return 0
        except Exception:
            return 0
