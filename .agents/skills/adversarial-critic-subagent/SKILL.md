---
name: adversarial-critic-subagent
description: Multi-Agent Adversarial Review & Doubt-Driven Development Pattern. Integrates a dedicated Critic Subagent into multi-agent topologies (Google Antigravity SDK, LangGraph, AutoGen) to stress-test scaling plans, compute risk scores (0-100), and output APPROVED_WITH_CAP verdicts with explicit budget caps.
---

# Adversarial Critic Subagent Pattern (Doubt-Driven Development)

Autonomous AI agents can recommend overly aggressive scaling or price hikes (e.g., +25% Meta Ads budget bump, +$15 PPA floor price hike) that threaten contractor retention or cash flow.

This skill provides the structure and reference implementation for an **Adversarial Critic Subagent** that stress-tests proposed agent actions before execution.

---

## Multi-Agent Decision Topology

```
  User Request / Goal
           │
  [Supervisor Agent]
           │
  ┌────────┴────────────────────────────────────────┐
  ▼                                                 ▼
[Agent 1: Growth]   [Agent 2: Unit Economics]   [Agent 3: Lead Gen]
  │ (Propose +25%     │ (Propose +$15             │
  │  Ad Budget)       │  Floor Hike)              │
  └────────┬──────────┴───────────────────────────┘
           │ Proposed Strategy Plan
           ▼
  [Subagent 5: ADVERSARIAL CRITIC SUBAGENT]
  (Audits risks, evaluates contractor capacity & churn, computes Risk Score)
           │
           ├─► Verdict: APPROVED_WITH_CAP (Risk Score: 15/100)
           ├─► Constraint 1: Cap budget bump at +15% max ($4,120)
           └─► Constraint 2: Verify ZIP slot capacity in 75001 first
```

---

## Python Reference Implementation (Google Antigravity SDK)

```python
from google.genai import types

class AdversarialCriticSubagent:
    def __init__(self, name="AdversarialCriticSubagent"):
        self.name = name

    def audit_proposed_plan(self, growth_plan: dict, unit_econ_plan: dict) -> dict:
        """
        Audits proposed actions from growth and unit economics subagents.
        Computes risk score and enforces mitigation caps.
        """
        risk_score = 0
        warnings = []
        mitigations = []

        ad_budget_increase = growth_plan.get('ad_budget_increase_percent', 0)
        floor_price_hike = unit_econ_plan.get('floor_price_hike_usd', 0)

        # Audit 1: Scaling Risk vs Slot Capacity
        if ad_budget_increase > 15:
            risk_score += 15
            warnings.append(
                f"Scaling risk on Meta Ads (${growth_plan.get('target_budget', 0):,.2f}): "
                "Ensure contractor slot capacity in target ZIP codes before budget bump."
            )
            mitigations.append("Cap budget increase at +15% max until slot fill rate > 92%.")

        # Audit 2: Price Floor Hike vs Contractor Churn
        if floor_price_hike > 10:
            risk_score += 20
            warnings.append(
                f"Price hike risk (${floor_price_hike:.2f} PPA): "
                "High floor price may cause 3-5% churn among regional contractors."
            )
            mitigations.append("Stagger floor price increase in 2 phases over 14 days.")

        verdict = "APPROVED_WITH_CAP" if risk_score > 10 else "APPROVED"

        return {
            "subagent": self.name,
            "verdict": verdict,
            "risk_score": risk_score,
            "warnings": warnings,
            "mitigations": mitigations
        }
```

---

## When to Apply This Pattern
- High-stakes agentic loops involving financial budget allocation, ad spend, or pricing updates.
- Multi-agent topologies where specialized agents might over-optimize for growth at the expense of stability.
- Pre-execution validation in Google Antigravity SDK, LangGraph, or AutoGen frameworks.
