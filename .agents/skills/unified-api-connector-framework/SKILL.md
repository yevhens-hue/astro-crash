---
name: unified-api-connector-framework
description: Extensible API connector framework providing abstract base classes, rate-limiting, OAuth/API Key authentication, and unified error handling across third-party SaaS APIs.
---

# 🔌 Unified API Connector Framework Skill

This skill defines the abstract base connector pattern for integrating third-party SaaS APIs (Telegram, Notion, HubSpot, Intercom, Google Sheets) into Python and TypeScript automation pipelines.

---

## 🛠️ Abstract Base Class Pattern (TypeScript)

```typescript
export abstract class BaseApiConnector {
  protected abstract baseUrl: string;
  protected abstract apiKey: string;

  protected async fetchWithRetry(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`API Error [${response.status}]: ${response.statusText}`);
    }
    return await response.json();
  }
}
```
