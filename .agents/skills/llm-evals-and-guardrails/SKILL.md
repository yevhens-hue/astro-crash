---
name: llm-evals-and-guardrails
description: LLM Evaluation (EDD — Eval-Driven Development) & Production Security Guardrails pattern. Implements Faithfulness, Answer Relevance, Context Recall quality metrics alongside Input/Output Security Guardrails for Prompt Injection defense, PII Redaction (Credit Cards, Passwords, API Keys), and Financial Threshold Gates ($1,000 approval gates). Use when testing LLM applications, preventing hallucinations, building CI/CD eval pipelines, or securing AI agents against jailbreaks and data leaks.
---

# LLM Evals (Eval-Driven Development) & Production Security Guardrails

This skill encodes enterprise patterns for **testing AI reliability (Eval-Driven Development)** and **securing production LLM agents against malicious attacks and data leaks**.

---

## 🏛️ Architecture & System Topology

```
                           User Input Request
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    1. INPUT GUARDRAIL         │
                   │  - Prompt Injection Scanner   │
                   │  - PII Leakage Interceptor    │
                   └───────────────┬───────────────┘
                                   │
                         [PASSED]  │  [BLOCKED / THREAT DETECTED]
                                   │ ────────────────────────┐
                                   ▼                         ▼
                   ┌───────────────────────────────┐   ┌───────────────────────────┐
                   │     2. Core LLM / Agent       │   │ Security Block Response   │
                   │     Execution & Synthesis     │   │ "Threat Intercepted"      │
                   └───────────────┬───────────────┘   └───────────────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   3. OUTPUT GUARDRAIL & EVAL  │
                   │  - Faithfulness Evaluator     │
                   │  - Answer Relevance Metric    │
                   │  - Hallucination Threshold    │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                           Final User Output
```

---

## 🔑 Core Components & Implementation Directives

### 1. Eval-Driven Development (EDD) Metrics
- **Faithfulness Metric ($0.0 - 1.0$):** Measures whether claims in the generated response are 100% supported by retrieved context. Flags ungrounded claims as hallucinations.
- **Answer Relevance Metric ($0.0 - 1.0$):** Measures alignment between the user query's key terms and the generated response.
- **Context Recall Metric ($0.0 - 1.0$):** Evaluates whether retrieved context contained all necessary ground-truth facts.
- **Eval Runner & Quality Gates:** Aggregates scores across test suites. Fails CI/CD builds if overall score $< 0.80$ or pass rate $< 80\%$.

### 2. Input Security Guardrails
- **Prompt Injection Defense:** Intercepts jailbreaks, "DAN mode", "ignore previous instructions", and system prompt exfiltration patterns before reaching the LLM.
- **PII Redactor:** Scans for Credit Cards, SSNs, Passwords, and API keys, replacing them with `[REDACTED_*]` placeholders.

### 3. Financial Approval Gates
- **Threshold Inspector:** Blocks automated agent transactions $\ge \$1,000$, routing them to inline human approval (Telegram Bot signature gate).

### 4. Output Guardrails
- **Output Sanitizer:** Re-scans generated LLM outputs to prevent accidental leakage of sensitive keys or PII before displaying to the user.

---

## 🛠️ Usage Example

Refer to the reference implementation scripts in `llm-evals-guardrails-lab/`:

```python
from llm_evals_engine import LLMEvalRunner
from guardrails_engine import ProductionGuardrailsPipeline

# 1. Run CI/CD Eval Suite
eval_runner = LLMEvalRunner(threshold=0.80)
report = eval_runner.run_eval_suite(test_cases)
if not report['summary']['suite_passed']:
    raise Exception(f"CI/CD Build Rejected: Pass Rate {report['summary']['pass_rate_pct']}%")

# 2. Run Production Guardrails Pipeline
guard = ProductionGuardrailsPipeline()
res = guard.process_request(user_input, amount_usd=150.0)

if res['status'] == 'BLOCKED':
    return res['response'] # Threat intercepted

# Process LLM execution safely
llm_out = agent.execute(res['sanitized_input'])
final_out = guard.process_response(llm_out)
```
