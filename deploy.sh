#!/bin/bash
set -e

REPO_URL="https://github.com/linsalefe/creative-agents.git"
APP_DIR="/root/creative-agents"

echo "========================================="
echo "  Creative Machine — Deploy v2.0"
echo "========================================="

# a) Instalar dependencias do sistema
echo "[1/11] Instalando dependencias do sistema..."
apt update -qq
apt install -y python3 python3-pip python3-venv nodejs nginx certbot python3-certbot-nginx git

# b) Instalar PostgreSQL + pgvector
echo "[2/11] Configurando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
fi

# Instalar pgvector
if ! dpkg -l | grep -q postgresql-16-pgvector; then
    apt install -y postgresql-16-pgvector 2>/dev/null || {
        # Fallback: compilar pgvector do source
        apt install -y postgresql-server-dev-all build-essential git
        cd /tmp
        git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
        cd pgvector
        make
        make install
        cd /root
    }
fi

# Criar banco e usuario
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='creative'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER creative WITH PASSWORD 'creative';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='creative_db'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE DATABASE creative_db OWNER creative;"
    sudo -u postgres psql -d creative_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
}

sudo -u postgres psql -c "ALTER USER creative CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -d creative_db -c "GRANT ALL ON SCHEMA public TO creative;" 2>/dev/null || true

# c) Clonar ou atualizar o repositorio
echo "[3/11] Clonando/atualizando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# d) Backend setup
echo "[4/11] Configurando backend..."
cd "$APP_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt
mkdir -p generated_images uploaded_artes

# e) Verificar .env
echo "[5/11] Verificando .env..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "ERRO: Arquivo .env nao encontrado!"
    echo "Envie o .env antes de rodar o deploy:"
    echo "  scp .env root@38.242.215.167:/root/creative-agents/.env"
    echo ""
    echo "Variaveis necessarias:"
    echo "  GOOGLE_API_KEY, IDEOGRAM_API_KEY, BANNERBEAR_API_KEY"
    echo "  DATABASE_URL=postgresql+asyncpg://creative:creative@localhost:5432/creative_db"
    echo "  JWT_SECRET=creative-machine-secret-2026"
    echo ""
    exit 1
fi

# Garantir que DATABASE_URL e JWT_SECRET estao no .env
grep -q "DATABASE_URL" "$APP_DIR/.env" || \
    echo "DATABASE_URL=postgresql+asyncpg://creative:creative@localhost:5432/creative_db" >> "$APP_DIR/.env"
grep -q "JWT_SECRET" "$APP_DIR/.env" || \
    echo "JWT_SECRET=creative-machine-secret-2026" >> "$APP_DIR/.env"

chmod 600 "$APP_DIR/.env"

# f) Frontend setup
echo "[6/11] Configurando frontend..."
cd "$APP_DIR/frontend"
cat > .env.local << 'FENVEOF'
NEXT_PUBLIC_API_URL=
FENVEOF
npm install --legacy-peer-deps
npm run build

# g) Systemd service — Backend API
echo "[7/11] Criando service creative-api..."
cat > /etc/systemd/system/creative-api.service << 'SVCEOF'
[Unit]
Description=Creative Machine API
After=network.target postgresql.service
Requires=postgresql.service

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

# h) Systemd service — Frontend
echo "[8/11] Criando service creative-frontend..."
cat > /etc/systemd/system/creative-frontend.service << 'SVCEOF'
[Unit]
Description=Creative Machine Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/creative-agents/frontend
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PORT=3003
Environment=NEXT_PUBLIC_API_URL=
ExecStart=/usr/bin/npx next start -p 3003
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVCEOF

# i) Nginx config
echo "[9/11] Configurando Nginx..."
cat > /etc/nginx/sites-available/creative << 'NGXEOF'
server {
    listen 80;
    server_name creative.cenatdata.online;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API routes — regex to avoid conflict with frontend /chat page
    location ~ ^/(criativos|auth|artes|static)(/|$) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Chat API endpoints (specific, avoids conflict with /chat frontend page)
    location ~ ^/chat/(message|history|upload-image) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
NGXEOF

ln -sf /etc/nginx/sites-available/creative /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# j) Habilitar e iniciar services
echo "[10/11] Iniciando services..."
systemctl daemon-reload
systemctl enable creative-api creative-frontend postgresql
systemctl restart postgresql
systemctl restart creative-api creative-frontend
systemctl restart nginx

sleep 2

# k) Status
echo "[11/11] Verificando status..."
echo ""
echo "--- postgresql ---"
systemctl is-active postgresql
echo ""
echo "--- creative-api ---"
systemctl status creative-api --no-pager -l | head -15
echo ""
echo "--- creative-frontend ---"
systemctl status creative-frontend --no-pager -l | head -15
echo ""
echo "========================================="
echo "  Creative Machine — Deploy concluido!"
echo "  Acesse http://creative.cenatdata.online"
echo ""
echo "  Admin: admin@cenat.com.br / cenat2026"
echo "========================================="
