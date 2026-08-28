---
name: google-antigravity-sdk-topology
description: Google Antigravity (AGY) SDK Multi-Agent Topology & Subagent Delegation Pattern. Orchestrates sequential and parallel subagent execution chains with policy-based safety enforcement and MCP SSE remote tools.
---

# Google Antigravity (AGY) SDK Multi-Agent Delegation Topology

The Google Antigravity (AGY) SDK enables developers to orchestrate multi-agent topologies where a main **Supervisor Agent** delegates tasks sequentially and in parallel across specialized **Subagents**.

This skill provides the structure and Python setup for an AGY SDK multi-agent topology.

---

## AGY SDK Subagent Chain Architecture

```
                       [SUPERVISOR AGENT]
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
[1. Growth Subagent]   [2. Unit Econ Subagent]   [3. B2B Lead Gen Subagent]
 (Ad Spend & CAC)       (PPA Margin Math)         (Texas Zip Matching)
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │ Sequential Output Payload
                               ▼
            [5. ADVERSARIAL CRITIC SUBAGENT]
            (Risk Score 15/100 -> APPROVED_WITH_CAP)
                               │
                               ▼
            [6. LEAD RAG QUALIFICATION SUBAGENT]
            (Code: TEXAS_IRBC_2024_HAIL -> Score: 95/100)
```

---

## Python Reference Implementation (`main.py`)

```python
import os
import sys

class AGYSubagent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    def execute(self, payload: dict) -> dict:
        return {
            "subagent": self.name,
            "role": self.role,
            "status": "SUCCESS",
            "result": f"Executed {self.role} logic on payload."
        }

class AGYSupervisorAgent:
    def __init__(self, name: str = "SupervisorAgent"):
        self.name = name
        self.subagents = {}

    def register_subagent(self, agent: AGYSubagent):
        self.subagents[agent.name] = agent

    def run_delegation_chain(self, initial_input: dict) -> dict:
        results = {}
        for agent_name, agent in self.subagents.items():
            results[agent_name] = agent.execute(initial_input)
        return results

# Initialize Topology
supervisor = AGYSupervisorAgent()
supervisor.register_subagent(AGYSubagent("GrowthAgent", "Meta Ads & CAC Optimizer"))
supervisor.register_subagent(AGYSubagent("UnitEconAgent", "PPA Floor Price Margin Math"))
supervisor.register_subagent(AGYSubagent("AdversarialCritic", "Doubt-Driven Security Audit"))
```

---

## When to Apply This Pattern
- Building autonomous multi-agent agentic workflows in Google Antigravity SDK.
- Delegating specialized tasks (security audit, lead qualification, budget scaling) across isolated subagents.
- Integrating MCP SSE remote transport endpoints into Python agent topologies.
