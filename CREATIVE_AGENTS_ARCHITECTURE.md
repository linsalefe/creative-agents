# 🎨 Creative Agents — Arquitetura do Projeto

## Visão Geral

Pipeline multi-agente para geração automatizada de criativos de marketing.
Cada agente tem uma responsabilidade única e bem definida.

---

## Estrutura de Pastas

```
creative-agents/
├── main.py                        # Entry point FastAPI
├── .env                           # API Keys
├── requirements.txt
│
├── agents/
│   ├── __init__.py
│   ├── orchestrator.py            # Agente maestro — coordena todos
│   ├── strategy_agent.py          # Agente 1: Objetivo e estratégia
│   ├── copy_agent.py              # Agente 2: Redator / copywriter
│   ├── creative_director_agent.py # Agente 3: Direção de arte / conceito visual
│   ├── format_agent.py            # Agente 4: Define formato e dimensões
│   └── image_agent.py             # Agente 5: Gera imagem via Ideogram
│
├── services/
│   ├── ideogram_service.py        # Integração Ideogram API
│   ├── bannerbear_service.py      # Integração Bannerbear API
│   └── claude_service.py          # Wrapper Anthropic API (agentes LLM)
│
├── models/
│   ├── creative_request.py        # Pydantic: input do usuário
│   └── creative_output.py         # Pydantic: output final
│
├── routers/
│   └── criativos.py               # Endpoints REST
│
└── frontend/                      # Next.js (pode ser dentro do EduFlow)
    └── app/criativos/
        └── page.tsx
```

---

## Os 5 Agentes

### Agente 1 — Strategy Agent
**Responsabilidade:** Recebe o briefing bruto e define a estratégia.

**Input:**
```json
{
  "produto": "Formação em Psicologia Clínica",
  "publico": "psicólogos e estudantes de psicologia",
  "contexto": "lançamento de nova turma"
}
```

**Output:**
```json
{
  "objetivo": "conversao",
  "etapa_funil": "fundo",
  "cta": "Garanta sua vaga",
  "tom": "autoridade + urgência",
  "plataforma": "instagram_feed"
}
```

---

### Agente 2 — Copy Agent
**Responsabilidade:** Escreve headline, subheadline e CTA do criativo.

**Input:** Output do Strategy Agent + dados do produto

**Output:**
```json
{
  "headline": "Sua especialização começa aqui.",
  "subheadline": "Formação reconhecida pelo MEC. Turma com vagas limitadas.",
  "cta": "Garanta sua vaga agora",
  "copy_legenda": "texto completo para legenda do post"
}
```

---

### Agente 3 — Creative Director Agent
**Responsabilidade:** Define o conceito visual. NÃO gera imagem — pensa no conceito.

**Input:** Outputs dos agentes 1 e 2

**Output:**
```json
{
  "conceito": "Ambiente clínico moderno, luz natural, sensação de crescimento profissional",
  "cores_dominantes": ["#1A3A5C", "#FFFFFF", "#E8C547"],
  "estilo_visual": "fotorrealista, clean, profissional",
  "elementos_visuais": "pessoa estudando, livros, ambiente iluminado",
  "prompt_ideogram": "Modern clinical psychology office, professional woman studying, warm natural lighting, clean minimalist environment, inspirational atmosphere, no text, photorealistic"
}
```

---

### Agente 4 — Format Agent
**Responsabilidade:** Define dimensões, formato e especificações técnicas.

**Input:** Plataforma (do Strategy Agent)

**Output:**
```json
{
  "formato": "feed_quadrado",
  "dimensoes": "1080x1080",
  "template_bannerbear": "uid_template_feed_cenat",
  "variantes": ["feed_quadrado", "stories_vertical"],
  "especificacoes": {
    "zona_segura": true,
    "logo_posicao": "bottom_right",
    "texto_maximo_chars": 60
  }
}
```

---

### Agente 5 — Image Agent
**Responsabilidade:** Executa a geração da imagem. Único agente que chama APIs externas de imagem.

**Input:** prompt_ideogram do Creative Director + dimensões do Format Agent

**Output:**
```json
{
  "imagem_url": "https://ideogram.ai/...",
  "criativo_final_url": "https://bannerbear.com/...",
  "variantes_urls": ["url_feed", "url_stories"]
}
```

---

## Orquestrador

O `orchestrator.py` é o maestro. Ele:
1. Recebe o briefing inicial
2. Chama cada agente em sequência
3. Passa o output de um como input do próximo
4. Retorna o resultado final consolidado

```python
# Fluxo do orquestrador
briefing → Strategy → Copy → Creative Director → Format → Image → Output Final
```

---

## Endpoints da API

```
POST /criativos/gerar           # Gera criativo completo (pipeline completo)
POST /criativos/gerar/rapido    # Só copy + imagem (sem direção de arte)
GET  /criativos/{id}            # Busca criativo gerado
GET  /criativos/historico       # Lista criativos gerados
POST /criativos/variante        # Gera variante de um criativo existente
```

---

## .env

```env
ANTHROPIC_API_KEY=sk-ant-...
IDEOGRAM_API_KEY=...
BANNERBEAR_API_KEY=...
BANNERBEAR_TEMPLATE_FEED=uid_...
BANNERBEAR_TEMPLATE_STORIES=uid_...
```

---

## requirements.txt

```
fastapi
uvicorn
httpx
anthropic
python-dotenv
pydantic
```

---

## Como usar com Claude Code

1. Abra o terminal na pasta do projeto
2. Rode: `claude`
3. Prompt inicial sugerido:

```
Leia a arquitetura em CREATIVE_AGENTS_ARCHITECTURE.md e implemente 
o projeto completo seguindo a estrutura de pastas definida. 
Comece pelo orchestrator.py e pelos services.
```

---

## Próximas evoluções

- [ ] Salvar criativos no banco (PostgreSQL)
- [ ] Painel no EduFlow pra visualizar e baixar
- [ ] Aprovação humana antes de publicar
- [ ] Integração Meta Ads API (subir criativo como anúncio automaticamente)
- [ ] Geração em lote (múltiplos cursos de uma vez)
