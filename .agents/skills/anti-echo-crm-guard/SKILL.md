---
name: anti-echo-crm-guard
description: Implement a 3-layer anti-loop guard (Mapping Table + 30s TTL Suppression Cache + HMAC SHA-256 Signature Verification) for 2-way CRM webhooks (Jobber, Housecall Pro, Todoist, Zapier) to eliminate duplicate requests and infinite echo loops.
---

# 🛡️ Anti-Echo CRM Webhook Guard Skill

This skill defines the 3-layer protection architecture preventing infinite feedback loops and duplicate updates when syncing two-way data between CRMs (DealerCenter, HubSpot, Jobber, Salesforce) and AI Agents.

---

## 🛠️ 3-Layer Guard Architecture

1. **Layer 1: HMAC SHA-256 Signature Verification**
   - Reject untrusted or unauthenticated webhook events.

2. **Layer 2: 30-Second TTL Suppression Cache (Redis)**
   - When the AI agent mutates CRM state via API, write a suppression key:
     `SET suppress:crm_lead_123 "AI_ORIGIN" EX 30`
   - When a CRM webhook arrives, check `suppress:crm_lead_123`. If present, **drop the webhook silently**.

3. **Layer 3: Mapping Table Invariant Check**
   - Compare incoming hash against last stored database state hash. If content hasn't changed, ignore.
