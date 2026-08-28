---
name: dockerized-agent-microservices
description: Containerization patterns for AI agents, scrapers, and RAG pipelines using Docker, Docker Compose, and persistent volume mounts for 30-second single-command deployment.
---

# 🐳 Dockerized Agent Microservices Skill

This skill defines the containerization architecture for packaging AI agents, Playwright web scrapers, and RAG backends into production-ready Docker microservices.

---

## 🛠️ Dockerfile Blueprint (Node.js + Playwright)

```dockerfile
FROM mcr.microsoft.com/playwright/node:20-jammy

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm ci --production

# Copy application source
COPY . .

# Environment variables
ENV NODE_ENV=production

# Run background service
CMD ["npm", "start"]
```

---

## 🛠️ Docker Compose Blueprint

```yaml
version: "3.8"

services:
  agent-service:
    build: .
    restart: always
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    volumes:
      - ./data:/app/data
      - ./upwork-session:/app/upwork-session

  qdrant-vector-db:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_storage:/qdrant/storage
```
