# Deploy Creative Agents para VPS
# Execute no PowerShell: .\deploy-remote.ps1

$SERVER = "root@38.242.215.167"

Write-Host "=== Passo 1: Enviando .env para o servidor ===" -ForegroundColor Cyan
scp .env "${SERVER}:/root/creative-agents/.env"

Write-Host "=== Passo 2: Rodando deploy no servidor ===" -ForegroundColor Cyan
ssh $SERVER "bash /root/creative-agents/deploy.sh"
