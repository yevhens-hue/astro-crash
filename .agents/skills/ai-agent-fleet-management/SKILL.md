---
name: ai-agent-fleet-management
description: Fleet Management pattern for coordinating 5–50+ specialized AI agents via a central Orchestrator and Shared State object. Implements Fleet Map (role isolation), Shared AgentState (single mutable object passed through all agents), conditional routing (BookingAgent skips non-actionable intents), and trajectory audit trail. Use when building multi-agent systems, AI call center fleets, orchestrated pipelines with 3+ agents, or when asked about Fleet Map, agent role isolation, shared state, LangGraph-style orchestration in Node.js, or how to scale beyond a single AI agent.
---

# AI Agent Fleet Management

## Core idea

One Orchestrator + N Specialists + One Shared State.

```
Orchestrator
  → SecurityAgent   (sanitize input)
  → IntentAgent     (classify, Ollama $0)
  → RagAgent        (enrich with context)
  → ResponseAgent   (generate reply, hybrid routing)
  → BookingAgent    (execute CRM action, skipped if not applicable)
```

## Quick start

```js
import { agentFleet } from './services/AgentFleetService.js';

const finalState = await agentFleet.processCall(
  'call_001',
  callerTranscript,
  callerPhone
);

console.log(finalState.intent);       // 'book_appointment'
console.log(finalState.agentResponse); // final reply text
console.log(finalState.trajectory);   // ['SecurityAgent','IntentAgent','RagAgent','ResponseAgent','BookingAgent']
console.log(finalState.bookingResult); // { confirmationId: 'BK_123...' }
```

## Shared State structure

```js
{
  callId, callerPhone,
  rawTranscript,        // original (unsafe)
  safeTranscript,       // after SecurityAgent
  injectionDetected,    // boolean
  intent,               // 'book_appointment' | 'request_info' | 'complaint' | ...
  ragContext,           // { score, tags, contextSnippet }
  agentResponse,        // final LLM-generated reply
  routedTo,             // 'local' | 'cloud'
  llmCostUsd,           // actual cost of this call
  bookingResult,        // CRM action result (null if skipped)
  trajectory,           // audit trail: which agents ran
  status,               // 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  errors,               // array of error messages
}
```

## 3 Key Patterns

### 1. Fleet Map — role isolation
Each agent has ONE job. Orchestrator does NOT execute business logic.
```js
// Wrong — orchestrator doing work:
async function orchestrate(state) { state.intent = await llm.classify(state.transcript); }

// Correct — delegate to specialist:
state = await IntentAgent(state);  // IntentAgent owns intent classification
```

### 2. Shared State — single mutable object
Pass the same `state` object through every agent. No parameter passing between agents.
```js
state = await SecurityAgent(state);
state = await IntentAgent(state);   // reads safeTranscript, writes intent
state = await RagAgent(state);      // reads intent, writes ragContext
state = await ResponseAgent(state); // reads intent + ragContext, writes agentResponse
```

### 3. Conditional routing — agents self-skip
```js
async function BookingAgent(state) {
  if (!['book_appointment','cancel_appointment'].includes(state.intent)) return state; // skip
  // ... execute booking
}
```

## Trajectory audit
Every agent appends its name to `state.trajectory`:
```
SecurityAgent → IntentAgent → RagAgent → ResponseAgent → BookingAgent
```
Use for debugging, billing, and compliance logging.

## Scaling to 20+ agents (fleet map)

```
                    Orchestrator
                   /     |      \
          Intent  RAG  Security  ...
               |    |
          Response  Booking
               |
          Telegram  CRM  SMS
```

Add agents without touching existing ones — Shared State is the contract.

## Reference implementation
- [`AgentFleetService.js`](file:///Users/yevhen/Cursor/AI%20Voices/src/services/AgentFleetService.js)
- Uses: `HybridLlmRouterService`, `PromptInjectionGuardService`
- Pattern based on: LangGraph StateGraph, Google Antigravity SDK multi-agent topology
