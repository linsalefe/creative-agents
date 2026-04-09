"""Google Drive Service via Composio — upload e organização de criativos."""
import hashlib
import mimetypes
import os
import logging
from typing import Optional

import requests
from composio import Composio
from composio.client.enums import Action

logger = logging.getLogger(__name__)

# Integration ID criada no Composio para Google Drive
GOOGLEDRIVE_INTEGRATION_ID = os.getenv(
    "COMPOSIO_GOOGLEDRIVE_INTEGRATION_ID",
    "c1a06652-ab89-4555-9557-dd0bbcfa3a1c",
)


class DriveService:
    def __init__(self):
        api_key = os.getenv("COMPOSIO_API_KEY")
        if not api_key:
            logger.warning("COMPOSIO_API_KEY não configurada")
        self.composio = Composio(api_key=api_key) if api_key else None

    def _entity_id(self, user_id: int) -> str:
        """Mapeia user.id do app → entity_id do Composio."""
        return f"creative_user_{user_id}"

    def _get_connected_account_id(self, user_id: int) -> Optional[str]:
        """Retorna o ID da connected account ativa do Drive para o usuário."""
        try:
            accounts = self.composio.connected_accounts.get(
                entity_ids=[self._entity_id(user_id)],
                active=True,
            )
            if isinstance(accounts, list):
                for a in accounts:
                    if a.appName == "googledrive" and a.status == "ACTIVE":
                        return a.id
            return None
        except Exception as e:
            logger.error(f"Erro ao buscar connected account: {e}")
            return None

    # ── Auth ──

    def get_auth_url(self, user_id: int) -> str:
        """Retorna URL OAuth para conectar Google Drive."""
        connection = self.composio.connected_accounts.initiate(
            integration_id=GOOGLEDRIVE_INTEGRATION_ID,
            entity_id=self._entity_id(user_id),
            redirect_url="https://creative.cenatdata.online/configuracoes?drive=connected",
        )
        return connection.redirectUrl

    def is_connected(self, user_id: int) -> bool:
        """Verifica se o Drive está conectado para este usuário."""
        if not self.composio:
            return False
        return self._get_connected_account_id(user_id) is not None

    def disconnect(self, user_id: int) -> bool:
        """Desconecta o Google Drive do usuário."""
        try:
            accounts = self.composio.connected_accounts.get(
                entity_ids=[self._entity_id(user_id)],
            )
            if isinstance(accounts, list):
                for a in accounts:
                    if a.appName == "googledrive":
                        # Delete via HTTP since SDK may not have delete method
                        self.composio.http.delete(f"/v1/connected_accounts/{a.id}")
            return True
        except Exception as e:
            logger.error(f"Erro ao desconectar Drive: {e}")
            return False

    # ── Operações de pasta ──

    def _execute(self, user_id: int, action: Action, params: dict) -> dict:
        """Executa uma action do Composio para o usuário."""
        result = self.composio.actions.execute(
            action=action,
            params=params,
            entity_id=self._entity_id(user_id),
        )
        return result if isinstance(result, dict) else {}

    def _create_folder(self, user_id: int, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Cria pasta no Drive. Retorna folder_id."""
        try:
            params = {"folder_name": name}
            if parent_id:
                params["parent_id"] = parent_id

            result = self._execute(user_id, Action.GOOGLEDRIVE_CREATE_FOLDER, params)

            # Extrair folder_id do resultado
            data = result.get("data", result)
            if isinstance(data, dict):
                return data.get("id") or data.get("folderId") or data.get("folder_id")
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

            result = self._execute(
                user_id,
                Action.GOOGLEDRIVE_LIST_FILES,
                {"q": query, "fields": "files(id,name)", "pageSize": 1},
            )

            data = result.get("data", result)
            if isinstance(data, dict):
                files = data.get("files", [])
                if files and isinstance(files, list):
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
        """Faz upload de arquivo para pasta no Drive via Composio S3 intermediário."""
        filename = os.path.basename(local_path)
        mime = mimetypes.guess_type(local_path)[0] or "application/octet-stream"

        # Calcular MD5
        with open(local_path, "rb") as f:
            file_bytes = f.read()
        md5 = hashlib.md5(file_bytes).hexdigest()

        # 1. Criar upload URL no Composio
        upload_info = self.composio.actions.create_file_upload(
            app="googledrive",
            action="GOOGLEDRIVE_UPLOAD_FILE",
            filename=filename,
            mimetype=mime,
            md5=md5,
        )

        # 2. Upload para S3
        if not upload_info.exists:
            requests.put(
                upload_info.url,
                data=file_bytes,
                headers={"Content-Type": mime},
                timeout=120,
            )

        # 3. Executar action com a s3key
        result = self._execute(
            user_id,
            Action.GOOGLEDRIVE_UPLOAD_FILE,
            {
                "file_to_upload": {
                    "name": filename,
                    "mimetype": mime,
                    "s3key": upload_info.key,
                },
                "folder_to_upload_to": folder_id,
            },
        )
        return result.get("data", result) if isinstance(result, dict) else {}

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

            result = self._execute(
                user_id,
                Action.GOOGLEDRIVE_LIST_FILES,
                {
                    "q": f"'{root_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                    "fields": "files(id,name)",
                },
            )

            data = result.get("data", result)
            if isinstance(data, dict):
                return [f["name"] for f in data.get("files", [])]
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

            result = self._execute(
                user_id,
                Action.GOOGLEDRIVE_LIST_FILES,
                {
                    "q": f"'{produto_id}' in parents and mimeType='application/vnd.google-apps.folder' and name contains 'Criativo' and trashed=false",
                    "fields": "files(id,name)",
                },
            )

            data = result.get("data", result)
            if isinstance(data, dict):
                return len(data.get("files", []))
            return 0
        except Exception:
            return 0
