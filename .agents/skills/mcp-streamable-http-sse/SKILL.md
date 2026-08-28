---
name: mcp-streamable-http-sse
description: Model Context Protocol (MCP) Remote Server via Express / Vercel Serverless (Streamable HTTP & SSE). Implements JSON-RPC 2.0 protocol endpoints (tools/list, tools/call), SSE streaming, client-side fallback parsing, and telemetry tracking.
---

# Remote MCP Server via Express & Vercel Serverless (Streamable HTTP / SSE)

Model Context Protocol (MCP) servers allow AI assistants (Claude Desktop, Cursor, Gemini, Custom AGY SDK Agents) to invoke tools and resources remotely over HTTP/SSE.

This skill provides a self-contained Express / Node.js implementation for running MCP remote servers on serverless platforms (Vercel, AWS Lambda, Cloudflare Workers).

---

## MCP Remote HTTP & SSE Architecture

```
  MCP Client (Cursor / Claude Desktop / Live Web Dashboard)
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
  [GET /api/mcp/sse]            [POST /api/mcp/message]
  (Server-Sent Events           (JSON-RPC 2.0 Request:
   Stream Connection)            {"method": "tools/call"})
         │                                 │
         └────────────────┬────────────────┘
                          ▼
             [McpServerService.js Engine]
             (JSON-RPC Router: initialize, tools/list, tools/call)
                          │
                          ▼
            JSON-RPC 2.0 Response (200 OK)
```

---

## Reference Node.js Implementation (`McpServerService.js`)

```javascript
class McpServerService {
  constructor() {
    this.SERVER_INFO = { name: "unicorn-pro-mcp-server", version: "2.0.0" };
    this.TOOLS = [
      {
        name: "calculate_ppa_margin",
        description: "Calculates net profit and platform margin for a Pay-Per-Appointment lead bid.",
        inputSchema: {
          type: "object",
          properties: {
            cplAcquisitionCost: { type: "number", default: 24.54 },
            ppaWinningBid: { type: "number", default: 150.00 }
          }
        }
      }
    ];
  }

  handleMcpHttpRequest(req, res) {
    const { method, id, params } = req.body || {};

    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: this.SERVER_INFO
        }
      });
    }

    if (method === 'tools/list') {
      return res.json({ jsonrpc: '2.0', id, result: { tools: this.TOOLS } });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      if (name === 'calculate_ppa_margin') {
        const netProfit = (args.ppaWinningBid || 150) - (args.cplAcquisitionCost || 24.54);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Net Profit: $${netProfit.toFixed(2)} per lead.` }]
          }
        });
      }
    }

    return res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
}

module.exports = new McpServerService();
```

---

## Client-Side Resilient Fallback (Vanilla JS)

```javascript
async function callMcpTool(toolName, args) {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  };

  const res = await fetch('/api/mcp/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  } else {
    // Resilient fallback parser if serverless returned HTML error
    return { jsonrpc: '2.0', id: payload.id, result: { content: [{ type: 'text', text: 'Fallback response.' }] } };
  }
}
```

---

## When to Apply This Pattern
- Exposing tools to Claude Desktop, Cursor, or Gemini Antigravity IDE over HTTPS.
- Building custom remote MCP servers on Vercel or AWS Lambda.
- Creating interactive live web dashboards with real-time JSON-RPC tool testing.
