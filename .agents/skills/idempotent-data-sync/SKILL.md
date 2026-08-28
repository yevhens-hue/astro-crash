---
name: idempotent-data-sync
description: Idempotent data synchronization pattern ensuring pipelines can be executed repeatedly without creating duplicate rows, corrupted state, or duplicate notifications.
---

# 🔄 Idempotent Data Sync Skill

This skill governs the implementation of idempotent pipeline executions. Regardless of how many times a pipeline or scraper runs (once or 100 times), the state remains deterministic with zero duplicated rows or notifications.

---

## 🛠️ Key Architectural Rules

1. **Deterministic Unique Keys (MD5 / SHA-256 Hashing):**
   - Derive a unique GUID from invariant attributes:
     $$\text{GUID} = \text{MD5}(\text{Normalized Title} + \text{Normalized Source URL} + \text{Timestamp})$$

2. **UPSERT Database & State Store Strategy:**
   - Use `INSERT ... ON CONFLICT (guid) DO UPDATE` in PostgreSQL / SQLite.
   - Map keys in memory before calling Google Sheets `values.batchUpdate` or `append`.

3. **Notification Suppression Cache:**
   - Track sent notification GUIDs in a persistent `sentState.json` or Redis key with TTL.
   - Check `sentState.has(guid)` before dispatching any Telegram alert or Webhook payload.
