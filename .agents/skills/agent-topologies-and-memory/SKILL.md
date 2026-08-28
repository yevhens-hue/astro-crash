---
name: agent-topologies-and-memory
description: Advanced Agent Topologies (LangGraph State Machines) & Hierarchical Memory Compaction pattern. Implements state graph routing (Nodes, Shared AgentState, Conditional Router Edges, Retry Loops) and dynamic Context Compaction for LLM conversation windows. Use when building complex multi-agent flows, stateful workflow engines, long-running agent dialogues, or context-window token management.
---

# Advanced Agent Topologies (LangGraph) & Context Compaction

This skill encodes enterprise patterns for **building stateful, cyclic agent workflows (LangGraph state machines)** and **managing long-context LLM memory (Context Compaction)**.

---

## 🏛️ Architecture & System Topology

```
                        ┌───────────────────────────────┐
                        │      1. Ingest Lead Node      │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   2. Risk Assessment Node     │
                        └───────────────┬───────────────┘
                                        │
                           Conditional Edge Router
                                   /         \
                 [Risk Score > 70] /           \ [Risk Score <= 70]
                                  /             \
                                 ▼               ▼
             ┌─────────────────────────┐   ┌─────────────────────────┐
             │ 3. Human Approval Gate  │   │   4. Auto Bidding Node  │
             └────────────┬────────────┘   └────────────┬────────────┘
                          │                             │
                          └──────────────┬──────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │   5. Voice AI Booking Node    │
                         └───────────────┬───────────────┘
                                         │
                             [Status == REJECTED?]
                                  /             \
                           [YES] /               \ [NO]
                                ▼                 ▼
                        [Retry Loop to #2]   [Final State]
```

---

## 🔑 Core Components & Implementation Directives

### 1. LangGraph State Machine Architecture
- **Typed Global AgentState:** Holds graph payload (`lead_id`, `risk_score`, `status`, `trajectory`, `logs`).
- **Nodes:** Modular functions that accept `AgentState`, execute logic, and return updated `AgentState`.
- **Conditional Routers:** Dynamic router functions that inspect state invariants to determine the next target node (`if risk_score > 70 -> HumanApprovalGate else -> AutoBidding`).
- **Loop-back Retry Cycles:** Returns control to prior nodes if execution returns `REJECTED` or requires re-evaluation.

### 2. Hierarchical Memory & Dynamic Context Compaction
- **Short-Term Sliding Window:** Maintains recent $N$ raw messages intact for high-recency conversational flow.
- **Automatic Context Compactor:** Triggers when context token count exceeds threshold limit, extracting key entity invariants (contracts, ZIPs, financial amounts) into a single system summary block:
  ```text
  [COMPACTED CONTEXT SUMMARY]: Historical discussion covered 9 steps. Key Facts: Contracts: AGR-2026-99 | Target Locations: ZIP 75001 | Financial Values: $150
  ```
- **Long-Term Memory Store:** Manages persistent Key-Value facts and user preferences across sessions.

---

## 🛠️ Usage Example

Refer to reference scripts in `agent-topologies-memory-lab/`:

```python
from langgraph_state_machine import AgentState, build_lead_monetization_graph
from context_compaction_memory import HierarchicalMemoryManager

# 1. State Graph Execution
graph = build_lead_monetization_graph()
state = AgentState(lead_id="LEAD-102", zip_code="99999", cpl_cost=120.0)
final_state = graph.run(state)

print(f"Path: {' -> '.join(final_state.trajectory)}")
print(f"Status: {final_state.status}")

# 2. Context Compaction
memory = HierarchicalMemoryManager(max_token_limit=120, keep_recent=3)
for msg in long_dialogue_thread:
    memory.add_message(msg['role'], msg['content'])

context = memory.get_effective_context()
if context['is_compacted']:
    print(f"Saved {context['tokens_saved']} tokens! Reduced to {len(context['active_messages'])} messages.")
```
