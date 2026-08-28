---
name: resilient-agent-monitoring
description: Production System Resilience & Monitoring pattern with Sentry error tracking, Telegram real-time alerts, exponential backoff retries, and browser process lock recovery.
---

# 🛡️ Resilient Agent Monitoring & Error Recovery Skill

This skill governs the implementation of production-grade monitoring, fault-tolerant retry loops, error alerts, and process recovery for autonomous AI agents and web automation services.

---

## 🛠️ Key Resilience Controls

### 1. Exponential Backoff Retry Loop
When external APIs (OpenAI, Anthropic, Upwork, Telegram) fail or return rate limits (429/503), apply exponential backoff retries:

$$\text{Delay} = \text{BaseDelay} \times 2^{\text{attempt}} + \text{jitter}$$

```typescript
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 4, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

### 2. Browser Process Singleton Lock Recovery
Web scrapers using Playwright/Chromium persistent contexts frequently fail if `SingletonLock` is left behind after ungraceful crashes.

- **Recovery Rule:** Before launching `launchPersistentContext`, check for `/user-data-dir/SingletonLock` and unlink it safely.

### 3. Sentry & Telegram Alert Telemetry
- Catch all unhandled exceptions at top level.
- Format clean HTML error alert and send to dedicated Telegram admin chat with stack trace snippet.
- Log error context to Sentry / local log rotation files.
