#!/bin/bash
set -e

REPO_URL="https://github.com/linsalefe/creative-agents.git"
APP_DIR="/root/creative-agents"

echo "========================================="
echo "  Creative Agents — Deploy"
echo "========================================="

# a) Instalar dependências do sistema
echo "[1/9] Instalando dependencias do sistema..."
apt update -qq
apt install -y python3 python3-pip python3-venv nodejs nginx certbot python3-certbot-nginx git

# b) Clonar ou atualizar o repositório
echo "[2/9] Clonando/atualizando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# c) Backend setup
echo "[3/9] Configurando backend..."
cd "$APP_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt
mkdir -p generated_images

# d) Verificar .env
echo "[4/9] Verificando .env..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "ERRO: Arquivo .env nao encontrado!"
    echo "Envie o .env antes de rodar o deploy:"
    echo "  scp .env root@38.242.215.167:/root/creative-agents/.env"
    echo ""
    exit 1
fi
chmod 600 "$APP_DIR/.env"

# e) Frontend setup
echo "[5/9] Configurando frontend..."
cd "$APP_DIR/frontend"
cat > .env.local << 'FENVEOF'
NEXT_PUBLIC_API_URL=
FENVEOF
npm install --legacy-peer-deps
npm run build

# f) Systemd service — Backend API
echo "[6/9] Criando service creative-api..."
cat > /etc/systemd/system/creative-api.service << 'SVCEOF'
[Unit]
Description=Creative Agents API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/creative-agents
Environment=PATH=/root/creative-agents/venv/bin:/usr/bin
EnvironmentFile=/root/creative-agents/.env
ExecStart=/root/creative-agents/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVCEOF

# g) Systemd service — Frontend
echo "[7/9] Criando service creative-frontend..."
cat > /etc/systemd/system/creative-frontend.service << 'SVCEOF'
[Unit]
Description=Creative Agents Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/creative-agents/frontend
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=
ExecStart=/usr/bin/npx next start -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVCEOF

# h) Nginx config
echo "[8/9] Configurando Nginx..."
cat > /etc/nginx/sites-available/creative << 'NGXEOF'
server {
    listen 80;
    server_name creative.cenatdata.online;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /criativos {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /static/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
NGXEOF

ln -sf /etc/nginx/sites-available/creative /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# i) Habilitar e iniciar services
echo "[9/9] Iniciando services..."
systemctl daemon-reload
systemctl enable creative-api creative-frontend
systemctl restart creative-api creative-frontend
systemctl restart nginx

sleep 2
echo ""
echo "--- creative-api ---"
systemctl status creative-api --no-pager -l | head -15
echo ""
echo "--- creative-frontend ---"
systemctl status creative-frontend --no-pager -l | head -15
echo ""
echo "========================================="
echo "  Deploy concluido!"
echo "  Acesse http://creative.cenatdata.online"
echo "========================================="
