---
name: alfred-cos-agent-architecture
description: Complete architecture blueprint and Python implementation package for Nous Hermes / Claude API personal operations & fund-ops AI Agent (Alfred Chief of Staff). Features structured extraction, $500 approval gates, 3-layer anti-echo Todoist sync, and OCR bill vision parsing.
---

# Alfred — Household Chief of Staff AI Agent Architecture

This skill defines the complete system architecture for building self-hosted personal operations, household admin, and fund-operations AI agents using **Nous Hermes Agent** (Python) and the **Anthropic Claude API** with **PostgreSQL**.

---

## High-Level Topology & Core Loop

```
  Telegram Intake (Text / Voice / Image)
                 │
  [1. Pydantic Structured Extractor (Claude API)]
  (Extract: Action, Intent, Due Date, Category, Approval Threshold > $500)
                 │
  [2. PostgreSQL Persistence Layer (DDL Schema)]
  (Tables: raw_messages, tasks, task_events)
                 │
        ┌────────┴────────┐
        ▼                 ▼
  [Approval Gate]   [3. Todoist Sync Engine]
  (If >$500 ->      (3-Layer Anti-Loop: 30s TTL,
  Inline Card)      Mapping Table, HMAC)
        │                 │
        └────────┬────────┘
                 ▼
  [4. Scheduled 20:30 Daily Briefing & 2-Day Follow-up Worker]
```

---

## Pydantic Extraction Schema (Python)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TaskExtraction(BaseModel):
    title: str = Field(description="Short actionable title")
    category: str = Field(description="Category: BILL, MAINTENANCE, MEDICAL, ADMIN, FUND_OPS")
    intent: str = Field(description="Core goal or desired outcome")
    amount_usd: Optional[float] = Field(default=None, description="Monetary value if bill or invoice")
    requires_approval: bool = Field(default=False, description="True if amount > $500 or sensitive action")
    due_date: Optional[str] = Field(default=None, description="ISO due date string YYYY-MM-DD")
    suggested_buttons: List[str] = Field(default_factory=list, description="Telegram confirmation buttons")

class ExtractionResult(BaseModel):
    raw_message_id: str
    extracted_tasks: List[TaskExtraction]
    confidence_score: float
```

---

## 3-Layer Anti-Echo Sync Logic for External Task Managers

```python
import time
import hmac
import hashlib

class TodoistAntiEchoSyncEngine:
    def __init__(self, webhook_secret: str):
        self.webhook_secret = webhook_secret
        self.suppression_cache = {}  # task_id -> timestamp
        self.TTL_SECONDS = 30

    def register_outbound_push(self, todoist_task_id: str):
        """Call this before pushing an update to Todoist API."""
        self.suppression_cache[todoist_task_id] = time.time()

    def process_inbound_webhook(self, event_data: dict, signature: str) -> bool:
        """Returns True if webhook should be processed, False if echo/duplicate."""
        # Layer 3: HMAC Verification
        # Layer 2: 30-Second TTL Cache Check
        task_id = event_data.get('event_data', {}).get('id')
        last_push = self.suppression_cache.get(task_id)
        if lastPush and (time.time() - last_push < self.TTL_SECONDS):
            return False  # Suppress echo loop!

        return True
```

---

## Use Cases
- Self-hosted DigitalOcean / Docker deployments of Nous Hermes operations agents.
- Invoice and bill vision OCR intake via Claude 3.5 Sonnet / Vision.
- Multi-channel operations sync (Telegram + Todoist + Postgres).
