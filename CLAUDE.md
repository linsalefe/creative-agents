# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-agent pipeline for automated marketing creative generation. Five specialized AI agents process a briefing through a sequential pipeline to produce final ad creatives. Written in Python with FastAPI.

## Architecture

The pipeline flow is: **Briefing → Strategy → Copy → Creative Director → Format → Image → Final Output**

- **Orchestrator** (`agents/orchestrator.py`): Coordinates the sequential agent pipeline, passing each agent's output as input to the next.
- **Strategy Agent**: Defines campaign objective, funnel stage, CTA, tone, and platform from raw briefing.
- **Copy Agent**: Writes headline, subheadline, CTA text, and post caption.
- **Creative Director Agent**: Defines visual concept, color palette, style, and generates the Ideogram prompt. Does NOT generate images.
- **Format Agent**: Determines dimensions, template IDs, and technical specs based on target platform.
- **Image Agent**: Only agent that calls external image APIs (Ideogram for generation, Bannerbear for compositing).

## Key Services

- `services/claude_service.py` — Wrapper for Anthropic API (powers all LLM agents)
- `services/ideogram_service.py` — Image generation via Ideogram API
- `services/bannerbear_service.py` — Image compositing/templating via Bannerbear API

## Build & Run Commands

```bash
pip install -r requirements.txt
uvicorn main:app --reload          # Run dev server
```

## API Endpoints

```
POST /criativos/gerar           # Full pipeline
POST /criativos/gerar/rapido    # Copy + image only (skips creative direction)
GET  /criativos/{id}            # Fetch generated creative
GET  /criativos/historico       # List generated creatives
POST /criativos/variante        # Generate variant of existing creative
```

## Required Environment Variables

Set in `.env`: `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `BANNERBEAR_API_KEY`, `BANNERBEAR_TEMPLATE_FEED`, `BANNERBEAR_TEMPLATE_STORIES`.

## Language

Project documentation is in Brazilian Portuguese. Code (variable names, comments) may mix Portuguese and English.
