---
name: upwork-proposal-autofill
description: Playwright persistent browser context automation for stealth Cloudflare clearance, Upwork proposal form autofill, rate bidding, and human-in-the-loop submission.
---

# ⚡ Upwork Proposal Autofill Skill

This skill governs the automated browser interaction pipeline for filling out Upwork proposal forms, applying rates, and inserting cover letters cleanly via Playwright stealth contexts.

---

## 🛠️ 1. Architecture & Execution Strategy

1. **Persistent Browser Session Context:**
   - Use Playwright with `puppeteer-extra-plugin-stealth` and persistent Chrome profile (`upwork-session`).
   - Clean up stale Chromium `SingletonLock` files before launching to prevent process lockouts.

2. **Form Interaction Sequence:**
   - Navigate to Upwork proposal submission URL (`https://www.upwork.com/freelance-jobs/apply/...`).
   - Fill **Hourly Rate Input** to `$55.00` (or $50.00 profile alignment).
   - Fill **Cover Letter Textarea** with generated proposal draft.
   - For Fixed-Price jobs, select **By milestone** and set Milestone 1 = `$100.00`.
   - Attach architecture diagrams (`agent_architecture_diagram.png` / `document_pipeline_architecture.png`) if applicable.
   - Leave browser window open for 120 seconds in `headless: false` mode for **Human-in-the-Loop review** before user clicks `Submit a Proposal`.

---

## 💻 2. Command Snippet

```bash
NODE_PATH=/Users/yevhen/Cursor/Upwork/node_modules node scratch/fill_proposal.js
```
