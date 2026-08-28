---
name: unicorn-lead-monetization
description: Monetize Home Services leads via Dual CPL ($24.54) and PPA ($150) auction engine, national waterfall APIs (QuinStreet, Modernize), and Telegram alerts. Use when managing lead monetization, calculating PPA margins, or handling lead distribution.
---

# Unicorn Lead Monetization Skill

Monetize homeowner leads for roofing, HVAC, solar, and window replacement using the Unicorn Pro hybrid CPL/PPA auction engine.

## Quick Start

1. **Lead Intake**: Receive lead via `POST /api/leads`.
2. **Ping Phase**: Check local contractor coverage for ZIP code (e.g. 75001).
3. **Auction Decision**:
   - If contractor slots available ➔ Route to **$150 PPA Pay-Per-Appointment**.
   - If no local slots ➔ Route to **$24.54 National CPL Waterfall** (QuinStreet / Modernize).

## Workflows

### 1. PPA Appointment Allocation
- Verify contractor calendar availability.
- Reserve 15-minute slot.
- Debit contractor Stripe account $150 PPA.
- Send Telegram alert to `@MyUnicornLiveChannel`.

### 2. National Waterfall Fallback
- Format lead payload per [waterfall_spec.md](references/auction_engine.md).
- Dispatch Ping to QuinStreet / NetWorx / Modernize.
- Accept highest bid > $18.50 CPL.

## Bundled Tools & References

- **Auction Engine Spec**: See [references/auction_engine.md](references/auction_engine.md)
- **Margin Calculator Script**: Execute `node scripts/calc_margin.js <ppa_price> <cpl_cost>`
