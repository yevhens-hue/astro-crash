---
name: data-lineage-audit-logging
description: End-to-end data lineage and execution audit logging pattern tracking API latency, token consumption, model choices, and input/output payload history.
---

# 📑 Data Lineage & Audit Logging Skill

This skill defines the audit logging architecture for tracking data lineage across automated pipelines and AI agent executions.

---

## 🛠️ Audit Schema Standard

Every execution pipeline log entry must track:

1. **Execution Metadata:** `execution_id`, `timestamp`, `pipeline_name`, `duration_ms`
2. **LLM Usage Telemetry:** `model_used`, `prompt_tokens`, `completion_tokens`, `estimated_cost_usd`
3. **Data Lineage:** `source_url_or_id`, `raw_payload_hash`, `destination_target`
4. **Status & Error Diagnostics:** `status_code` (`SUCCESS` | `WARNING` | `FAILED`), `error_traceback`

---

## 💻 Sample Audit Record (JSON)

```json
{
  "execution_id": "exec_9872abc1",
  "timestamp": "2026-08-14T18:45:00Z",
  "pipeline": "upwork-lead-enricher",
  "source_guid": "~022088279229094679441",
  "telemetry": {
    "model": "claude-3-5-haiku-20241022",
    "prompt_tokens": 420,
    "completion_tokens": 95,
    "cost_usd": 0.00045,
    "latency_ms": 680
  },
  "status": "SUCCESS"
}
```
