# 🚀 Astro Crash — Real-Time Event-Driven Telegram Mini App & Game Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![WebSocket](https://img.shields.io/badge/WebSockets-Real--Time-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Telegram Mini App](https://img.shields.io/badge/Telegram_Mini_App-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

A high-performance, server-authoritative real-time web application and Telegram Mini App (TMA). Built for sub-50ms state synchronization, continuous event streaming, and resilient client-side animation pipelines.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (React / Vite / TMA SDK)"]
        UI["UI & Canvas Renderer (60 FPS)"]
        WS_Client["Socket.IO / WS Client"]
        TG["Telegram WebApp Context"]
    end

    subgraph Server ["Server-Authoritative Backend"]
        WS_Server["WebSocket Event Dispatcher"]
        Engine["Game Loop & Curve Engine"]
        State["In-Memory State Store (Redis)"]
        DB[(PostgreSQL / Audit Logs)]
    end

    TG --> UI
    UI <-->|Bidirectional Stream| WS_Client
    WS_Client <-->|Sub-50ms Heartbeat| WS_Server
    WS_Server <--> Engine
    Engine <--> State
    Engine -->|Async Persistence| DB
```

---

## ✨ Key Features

- **Server-Authoritative Game Loop:** Zero client-side manipulation. Multipliers, crash curves, and round states are calculated and verified exclusively on the server.
- **Low-Latency Event Streaming:** Bidirectional WebSocket pipelines broadcasting round lifecycle (Waiting, Active, Crashed) to thousands of concurrent users.
- **Telegram Mini App Integration:** Seamless authentication via Telegram initData HMAC validation, native viewport resizing, and haptic feedback.
- **Smooth 60 FPS Visuals:** Canvas and CSS animation pipelines designed for zero stutter across both mobile and desktop browsers.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, TypeScript, Vite, Tailwind CSS, Telegram WebApp SDK
- **Backend & Real-Time:** Node.js, Express, Socket.IO / WebSockets, TypeScript
- **State & Database:** Redis (active game state), PostgreSQL (user history & transactions)
- **Deployment:** Docker, Nginx reverse proxy

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone git@github.com:yevhens-hue/astro-crash.git
cd astro-crash

# Install dependencies
npm install

# Start local development server
npm run dev
```

---

## 👨‍💻 Author & Architecture
- **Author:** [Yevhen Shaforostov](https://github.com/yevhens-hue)
- **Role:** AI Product Manager & Full-Stack AI Engineer at [Adsy.com](https://adsy.com)


<!-- activity-sync: 2026-08-28 -->
