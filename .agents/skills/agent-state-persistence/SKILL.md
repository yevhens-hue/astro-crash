---
name: agent-state-persistence
description: PostgreSQL DDL pattern for persisting AI agent Shared State to a transactional database (Supabase/Postgres), replacing in-memory or .md/JSON file storage. Includes table schema with TEXT[] arrays for trajectory and tags, UPSERT conflict resolution, indexed queries by status/intent, loadAgentState() for crash recovery, and getAgentStates() for analytics. Use when building stateful AI agents that need crash recovery, audit trails, multi-agent coordination, or analytics dashboards. Use when asked about "agent state persistence", "saving LLM conversation state", "PostgreSQL for AI agents", or "replacing JSON files with a database".
---

# Agent State Persistence (PostgreSQL / Supabase)

## Why DB instead of .md / JSON files

| Problem with files | Solution with PostgreSQL |
|--------------------|--------------------------|
| Parallel agents overwrite each other | ACID transactions / UPSERT |
| Data lost on process crash | State in DB before return |
| No analytics queries | `SELECT WHERE status='FAILED'` |
| No audit trail | `trajectory TEXT[]` column |

## DDL — agent_states table

```sql
CREATE TABLE IF NOT EXISTS ai_voices.agent_states (
    id              VARCHAR(64) PRIMARY KEY,  -- callId / sessionId
    caller_phone    VARCHAR(32),
    raw_transcript  TEXT,
    safe_transcript TEXT,
    injection_detected BOOLEAN DEFAULT FALSE,
    intent          VARCHAR(64),
    rag_score       INT,
    rag_tags        TEXT[],          -- PostgreSQL native array
    rag_snippet     TEXT,
    agent_response  TEXT,
    routed_to       VARCHAR(8),      -- 'local' | 'cloud'
    llm_cost_usd    NUMERIC(10,6) DEFAULT 0,
    booking_action  VARCHAR(64),
    booking_confirm_id VARCHAR(64),
    trajectory      TEXT[],          -- ['SecurityAgent','IntentAgent',...]
    errors          TEXT[],
    status          VARCHAR(16) DEFAULT 'PENDING',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP WITH TIME ZONE,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_states_status  ON ai_voices.agent_states(status);
CREATE INDEX IF NOT EXISTS idx_agent_states_intent  ON ai_voices.agent_states(intent);
CREATE INDEX IF NOT EXISTS idx_agent_states_created ON ai_voices.agent_states(created_at DESC);
```

## Key operations

```js
// Auto-persist after every agent run
await dbManager.saveAgentState(state);   // UPSERT — safe to call repeatedly

// Crash recovery — reload state and resume
const state = await dbManager.loadAgentState(callId);

// Analytics queries
const failures = await dbManager.getAgentStates({ status: 'FAILED' });
const bookings = await dbManager.getAgentStates({ intent: 'book_appointment', limit: 100 });
```

## UPSERT pattern (conflict-safe)
```sql
INSERT INTO agent_states (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  trajectory = EXCLUDED.trajectory,
  updated_at = CURRENT_TIMESTAMP;
```
Safe to call multiple times — idempotent. No duplicates.

## Integration — wire into Orchestrator
```js
// In AgentFleetService.processCall() — AFTER try/catch:
await dbManager.saveAgentState(state);  // always runs, even on FAILED
return state;
```

## Analytics API routes
```
GET /api/agent-states                         → last 20 calls
GET /api/agent-states?status=FAILED           → all failures
GET /api/agent-states?intent=book_appointment → all bookings
GET /api/agent-states/:callId                 → single call (debug)
POST /api/agent-fleet/process                 → trigger fleet via HTTP
```

## Reference implementation
- [`database/index.js`](file:///Users/yevhen/Cursor/AI%20Voices/src/database/index.js) — `saveAgentState`, `loadAgentState`, `getAgentStates`
- [`database/schema.sql`](file:///Users/yevhen/Cursor/AI%20Voices/src/database/schema.sql) — full DDL
- [`routes/api.js`](file:///Users/yevhen/Cursor/AI%20Voices/src/routes/api.js) — `/agent-states` endpoints
