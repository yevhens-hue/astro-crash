---
name: ast-safety-governance
description: Dynamic Safety Governance & AST Parameter Inspection for AI Agents and MCP Tool Calls. Enforces regex/AST threat scanning, financial approval gates ($1,000 threshold), and hash pinning verification for approved tool signatures.
---

# 🛡️ Governed Source & Safety Architecture Skill

This skill defines the governed source architecture separating domain-specific knowledge rules from the core conversational engine.

---

## 🛠️ Architecture Principles

1. **Domain Source Isolation:**
   - Keep authoritative domain content (regulations, product specs, municipal codes) in version-controlled repositories or vector stores.
   - Core conversational engine consumes domain sources dynamically via strict retrieval adapters.

2. **Evidence Assertion Pattern:**
   - Every claim made by the AI must cite an authoritative source GUID from the Governed System.
   - If no governed source supports a user query, the AI must explicitly state: "No verified source available for this request."
