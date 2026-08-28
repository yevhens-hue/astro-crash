---
name: product-feature-prioritization
description: Help prioritize product features and backlog items using frameworks like RICE, ICE, MoSCoW, or Kano. Use when the user asks to prioritize features, score tasks, evaluate backlog items, or mentions RICE, ICE, MoSCoW, or Kano frameworks.
---

# Product Feature Prioritization

## Quick start

To score a feature using the RICE framework:
1. **Reach**: Estimate how many users this feature will affect within a given timeframe (e.g., users/month).
2. **Impact**: Estimate the impact on an individual user (3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal).
3. **Confidence**: Estimate your confidence in your numbers (1 = high/100%, 0.8 = medium/80%, 0.5 = low/50%).
4. **Effort**: Estimate the person-months needed to build it (e.g., 2).
5. **RICE Score** = `(Reach * Impact * Confidence) / Effort`

## Workflows

### Backlog Evaluation
1. **Gather Items**: Collect the list of features or tasks to prioritize.
2. **Select Framework**:
   - **RICE**: Best for data-driven teams focused on measurable metrics (Reach/Impact).
   - **ICE (Impact, Confidence, Ease)**: Best for quick, early-stage scoring where detailed reach metrics are unavailable.
   - **MoSCoW (Must, Should, Could, Won't)**: Best for fixed-deadline projects and MVP scoping.
   - **Kano Model**: Best for identifying delight features vs. basic expectations.
3. **Conduct Scoring**: Ask the user for inputs or infer values based on the context.
4. **Generate Rank**: Sort items by score and present a prioritized list in a markdown table.
