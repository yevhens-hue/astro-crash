---
name: lead-ping-post-engine
description: High-Velocity Lead Ping-Post & PPA Auction Engine. Performs real-time zip code coverage lookup, CPL acquisition cost math, winning PPA bid calculations ($150 PPA), balance debits, and exclusive slot reservations.
---

# ⚡ Lead Ping-Post & Speed-to-Lead Engine Skill

This skill governs high-velocity lead ingestion, instant scoring, ping-post auction routing, and sub-30-second AI outreach dispatch.

---

## 🛠️ Architecture Blueprint

```mermaid
flowchart TD
    A[Incoming Lead Event / Webhook] --> B[Lead Sanitization & Deduplication]
    B --> C[Ping Stage: Coverage & Qualification Check]
    C --> D[Post Stage: Balance Debit & Instant AI Dispatch]
    D --> E[Sub-30-Second Voice/SMS Agent Trigger]
```

### Key Performance Rules
1. **Speed-to-Lead Threshold:** Trigger automated AI voice/SMS within **< 30 seconds** of lead creation.
2. **Ping-Post Auction Logic:** Validate zip code coverage, contractor/dealership active balance, and service area rules before posting.
3. **Exclusive Slot Reservation:** Guarantee lead isolation so no duplicate agent calls occur.
