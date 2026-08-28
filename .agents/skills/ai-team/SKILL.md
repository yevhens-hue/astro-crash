---
name: ai-team
description: Invoke a multi-agent team (CTO, Engineer, Researcher, Marketer, Business Analyst) to solve complex tasks through debate and specialization.
---

# AI Team Skill

Use this skill when you need a high-quality solution for a complex task that requires different perspectives.

## Team Members

### 1. Researcher
- **Goal**: Gather data, analyze competitors, and understand user needs.
- **Output**: Research report with benchmarks and findings.

### 2. Business Analyst (Metrics & Finance)
- **Goal**: Define KPIs, evaluate ROI, model pricing, and analyze impact on churn/ARPU.
- **Output**: Financial impact assessment, tracking metrics (PostHog), and data schemas.

### 3. Marketer (Growth & Sales)
- **Goal**: Optimize user journey for conversion, craft value propositions, and align with sales funnels.
- **Output**: GTM (Go-To-Market) strategy, copy recommendations, and upsell hooks.

### 4. CTO (Chief Technology Officer)
- **Goal**: Define high-level architecture, ensure scalability, and align with business strategy.
- **Output**: Architectural decision record (ADR) and strategic roadmap.

### 5. Engineer
- **Goal**: Practical implementation, TDD, code quality, and security.
- **Output**: Implementation plan, component structure, and test cases.

## Workflow

1. **Initialization**: Define the task clearly.
2. **Phase 1: Research & Business**: The Researcher provides context, the BA defines metrics, and the Marketer plans the growth loops.
3. **Phase 2: Strategy**: The CTO proposes the high-level approach to support the business needs.
4. **Phase 3: Implementation**: The Engineer details the code-level changes.
5. **Phase 4: Debate**: Each member critiques the others' outputs.
6. **Phase 5: Synthesis**: The lead agent (Antigravity) synthesizes the final plan.

## When to use
- Major architectural changes.
- New feature design from scratch.
- Resolving complex bugs that span multiple modules.
- Refactoring core components.
