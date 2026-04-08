# Creative Agents

Pipeline multi-agente para geracao automatizada de criativos de marketing. Sete agentes de IA trabalham em sequencia para transformar um briefing de texto em pecas visuais prontas para publicacao.

## Arquitetura

```
Briefing -> Strategy -> Copy -> Creative Director -> Format -> Image -> Criativo Final
```

### Os 7 Agentes

| Agente | Responsabilidade |
|---|---|
| **Strategy Agent** | Recebe o briefing e define objetivo, etapa do funil, CTA, tom e plataforma |
| **Copy Agent** | Escreve headline, subheadline, CTA e legenda do post |
| **Creative Director Agent** | Define conceito visual, paleta de cores, estilo e gera o prompt de imagem |
| **Format Agent** | Define dimensoes, template Bannerbear e especificacoes tecnicas por plataforma |
| **Image Agent** | Gera a imagem de fundo (Imagen ou Ideogram) e compoe o criativo final (Bannerbear) |
| **Vision Agent** | Analisa um criativo existente com GPT-4o Vision e extrai copy, tom, estilo e descricao do fundo |
| **Variation Agent** | Gera 5 variacoes completas (copy + prompt de fundo) a partir da analise do Vision Agent |

### Pipeline de Variacoes

```
Upload de imagem -> Vision (GPT-4o) -> Variation (5x copy + prompt) -> Imagen/Ideogram + Bannerbear (em paralelo) -> 5 criativos prontos
```

## Stack

- **Backend:** Python 3.11+ / FastAPI / Uvicorn
- **Frontend:** Next.js 14 / React 18 / Tailwind CSS
- **LLM:** OpenAI GPT-4o (copy, estrategia, direcao criativa, analise visual)
- **Geracao de imagem:** Google Imagen 3 (`gemini-2.0-flash-preview-image-generation`) ou Ideogram V2
- **Composicao:** Bannerbear (monta texto sobre imagem com templates)

## Estrutura do Projeto

```
creative-agents/
├── main.py                          # Entry point FastAPI + CORS
├── requirements.txt
├── .env                             # Variaveis de ambiente (nao commitado)
│
├── agents/
│   ├── orchestrator.py              # Coordena o pipeline sequencial
│   ├── strategy_agent.py            # Objetivo, funil, CTA, tom
│   ├── copy_agent.py                # Headline, subheadline, legenda
│   ├── creative_director_agent.py   # Conceito visual, prompt de imagem
│   ├── format_agent.py              # Dimensoes e specs por plataforma
│   ├── image_agent.py               # Imagen/Ideogram + Bannerbear
│   ├── vision_agent.py              # GPT-4o Vision para analise
│   └── variation_agent.py           # 5 variacoes de copy + prompt
│
├── services/
│   ├── claude_service.py            # Wrapper OpenAI GPT-4o (text + vision)
│   ├── imagen_service.py            # Google Imagen 3
│   ├── ideogram_service.py          # Ideogram API
│   └── bannerbear_service.py        # Composicao de imagem
│
├── models/
│   ├── creative_request.py          # Input: produto, publico, contexto
│   ├── creative_output.py           # Output de cada agente
│   └── variation.py                 # Models de variacao
│
├── routers/
│   └── criativos.py                 # Endpoints REST
│
└── frontend/                        # Next.js app
    ├── app/criativos/page.tsx       # Dashboard principal
    └── components/
        ├── criativos/
        │   ├── AgentProgress.tsx     # Barra de progresso dos agentes
        │   ├── CopyPreview.tsx       # Preview de copy com botao copiar
        │   └── CriativoCard.tsx      # Card com imagem + copy + download
        └── ui/                       # Componentes base (shadcn-style)
```

## Instalacao

### Pre-requisitos

- Python 3.11+
- Node.js 18+
- Contas com API keys: OpenAI, Google AI (Imagen), Bannerbear

### Backend

```bash
# Clone o repositorio
git clone https://github.com/linsalefe/creative-agents.git
cd creative-agents

# Instale as dependencias
pip install -r requirements.txt

# Configure as variaveis de ambiente
cp .env.example .env
# Edite o .env com suas chaves
```

### Frontend

```bash
cd frontend
npm install
```

## Variaveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# LLM
OPENAI_API_KEY=sk-proj-...

# Geracao de imagem (escolha um provider)
IMAGE_PROVIDER=imagen          # "imagen" ou "ideogram"
GOOGLE_API_KEY=AIzaSy...       # Para Imagen 3
IDEOGRAM_API_KEY=...           # Para Ideogram (alternativo)

# Composicao de imagem
BANNERBEAR_API_KEY=bb_pr_...
BANNERBEAR_PROJECT_ID=...
BANNERBEAR_TEMPLATE_FEED=...
BANNERBEAR_TEMPLATE_STORIES=...
```

> O pipeline funciona sem Bannerbear configurado — nesse caso retorna apenas a imagem de fundo gerada.

## Como Rodar

### Backend (porta 8000)

```bash
uvicorn main:app --reload
```

### Frontend (porta 3000)

```bash
cd frontend
npm run dev
```

Acesse http://localhost:3000 para abrir o dashboard.

## Endpoints da API

| Metodo | Endpoint | Descricao |
|---|---|---|
| `POST` | `/criativos/gerar` | Pipeline completo (5 agentes) |
| `POST` | `/criativos/gerar/rapido` | Pipeline rapido (sem direcao criativa) |
| `POST` | `/criativos/variacoes` | Upload de imagem + gera 5 variacoes (multipart/form-data) |
| `GET` | `/criativos/historico/` | Lista criativos gerados |
| `GET` | `/criativos/{id}` | Busca criativo por ID |
| `POST` | `/criativos/variante` | Gera variante de criativo existente |

### Exemplo: Gerar Criativo

```bash
curl -X POST http://localhost:8000/criativos/gerar \
  -H "Content-Type: application/json" \
  -d '{
    "produto": "Formacao em Psicologia Clinica",
    "publico": "psicologos e estudantes de psicologia",
    "contexto": "lancamento de nova turma"
  }'
```

### Exemplo: Gerar Variacoes

```bash
curl -X POST http://localhost:8000/criativos/variacoes \
  -F "file=@criativo-original.png"
```

## Screenshots

> Em breve: screenshots do dashboard, formulario, resultado e grid de variacoes.

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Resultado](docs/screenshots/resultado.png) -->
<!-- ![Variacoes](docs/screenshots/variacoes.png) -->

## Proximas Evolucoes

- Persistencia em banco de dados (PostgreSQL)
- Painel de aprovacao humana antes de publicar
- Integracao Meta Ads API (subir criativo como anuncio)
- Geracao em lote (multiplos produtos de uma vez)
