---
name: ab-testing-planner
description: Plan A/B tests, calculate required sample sizes, formulate hypotheses, and analyze experimental results for statistical significance. Use when planning A/B tests, calculating sample sizes, determining experiment duration, or evaluating A/B test results.
---

# A/B Testing Planner

## Quick start

To plan an A/B test:
1. Define the **Null Hypothesis ($H_0$)**: The change has no effect on the target metric.
2. Define the **Alternative Hypothesis ($H_a$)**: The change improves the target metric.
3. Calculate **Sample Size**: Use baseline conversion rate, Minimum Detectable Effect (MDE), statistical power (normally 80%), and significance level (normally 5%).
4. Determine **Duration**: `Total Sample Size / Daily Traffic`.

## Workflows

### Experiment Setup Workflow
1. **Hypothesis Formulation**: Outline what you are testing, why, and what metric you expect to change.
2. **Parameter Definition**:
   - Baseline Conversion Rate (e.g., 5%).
   - MDE (Minimum Detectable Effect) (e.g., relative 10% increase, so target is 5.5%).
   - Significance level ($\alpha$) (default 0.05).
   - Statistical power ($1 - \beta$) (default 0.80).
3. **Sample Size Calculation**: Provide estimates for traffic requirements.
4. **Result Analysis**: Once results are in, calculate p-value, confidence intervals, and recommend whether to roll out, roll back, or iterate.
