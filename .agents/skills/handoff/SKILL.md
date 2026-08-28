---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
---

# 📑 Engineering Continuity & System Handoff Standard Skill

This skill defines the Engineering Continuity Package standard, ensuring any competent engineer can operate, diagnose, safely modify, test, deploy, roll back, and recover production systems without reliance on undocumented individual knowledge.

---

## 🛠️ Engineering Continuity Package Structure

Every production project handoff package must contain:

1. **System Map & Component Topology:**
   - Architecture diagram, repository layout, build scripts, deployment targets.

2. **Verified vs Unverified Status Matrix:**
   - Table detailing tested features vs unverified edge cases with empirical proof.

3. **Runtime Diagnostics & Failure Recovery:**
   - Step-by-step emergency runbook for database crashes, API outages, and lock releases.

4. **Rollback & Deployment Checklist:**
   - Reversible database migration guidelines and zero-downtime deployment steps.
