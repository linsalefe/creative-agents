#!/bin/bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='generated_images' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.next' \
  --exclude='venv' \
  ./ root@38.242.215.167:/root/creative-agents/
