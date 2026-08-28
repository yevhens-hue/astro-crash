---
name: user-feedback-analyst
description: Analyze user feedback, support tickets, reviews, and survey responses to identify core user pain points and sentiment trends. Use when analyzing user feedback, processing support ticket data, evaluating app store reviews, or performing sentiment analysis on customer inputs.
---

# User Feedback Analyst

## Quick start

To analyze user feedback:
1. Collect the raw text data (support tickets, app reviews, NPS comments).
2. **Categorize**: Group feedback into buckets (e.g., UX/UI, Performance, Billing, Feature Request).
3. **Sentiment Tagging**: Mark each item as Positive, Neutral, or Negative.
4. **Identify Trends**: Find the most frequent issues and calculate their share of total feedback.
5. **Recommend Actions**: Turn findings into actionable engineering tickets.

## Workflows

### Feedback Analysis Workflow
1. **Data Ingestion**: Read the input text block or CSV file containing feedback.
2. **Thematic Coding**: Group items by feature area or problem category.
3. **Quantification**:
   - Count the occurrences of each category.
   - Calculate percentage of total.
   - Highlight high-severity bugs (e.g., login issues, crash reports).
4. **Report Generation**: Present a structured summary of user pain points, sentiment breakdown, and prioritize them for the product roadmap.
