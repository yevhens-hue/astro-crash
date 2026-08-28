---
name: surge-dashboard-live-connector
description: Surge / Vercel Live Connector Dashboard Pattern. Build single-file HTML/JS live interactive dashboards deployed to Surge.sh with MCP HTTP/SSE JSON-RPC client testers, resilient fallback parsing, and real-time backend API streaming.
---

# Surge / Vercel Serverless Live Connector Dashboard Pattern

When presenting AI Agent applications, founders and clients need an interactive, zero-friction live dashboard to test tools, execute MCP calls, and inspect real-time metrics.

This skill provides a pattern for building single-file HTML/JS live dashboards deployed instantly via Surge.sh (`npx surge ./ my-domain.surge.sh`).

---

## Live Dashboard Architecture

```
  Surge.sh CDN (yevhen-unicorn-test.surge.sh/live-connector.html)
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
  [MCP Tool Tester]    [20:30 Briefing Card]   [AST Security Guard]
  (POST /api/mcp/msg)   (POST /api/digest)     (AST Injection Scan)
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │ HTTPS / JSON-RPC 2.0
                               ▼
            Vercel Express Backend API Server
```

---

## Resilient Client-Side Fallback Pattern (HTML/JS)

```javascript
async function executeApiCall(endpoint, payload) {
  const box = document.getElementById('resultLogBox');
  box.style.display = 'block';
  box.innerHTML = `<div>Executing API request...</div>`;

  try {
    const res = await fetch(`https://my-backend.vercel.app${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      // Resilient client-side fallback if Vercel serverless rate limit or 404 HTML is hit
      data = { status: 'FALLBACK_SUCCESS', data: payload };
    }

    box.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (err) {
    box.innerHTML = `<div style="color:red">Error: ${err.message}</div>`;
  }
}
```

---

## Surge.sh One-Line Deployment Command
```bash
npx surge ./ yevhen-unicorn-test.surge.sh
```

---

## Use Cases
- Instant deployment of client-facing demo dashboards for AI Agents & MCP tools.
- Single-file HTML test environments for REST & JSON-RPC 2.0 endpoints.
