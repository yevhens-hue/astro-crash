---
name: llm-as-a-judge-evals
description: Eval-Driven Development (EDD) pattern for AI Agents. Uses an independent LLM (Claude 3.5 Sonnet / GPT-4o) as a QA auditor to evaluate agent transcripts for goal achievement, hallucination, and policy compliance. Replaces manual QA. Use when testing voice agents, building CI/CD pipelines for prompts, computing quality metrics, or asked about "how to test AI agents" or "LLM evals".
---

# 🔬 LLM-as-a-Judge & Replay Evals Skill

This skill governs Eval-Driven Development (EDD) and regression testing for LLM systems. It provides patterns for capturing production transcripts, running replay suites, and using an independent LLM judge for automated evaluation.

---

## 🛠️ Replay & Eval Loop Architecture

```mermaid
flowchart LR
    A[Production User Transcripts] --> B[Replay Runner Engine]
    B -->|Run New Prompt / Model| C[Generated Output Batch]
    C --> D[LLM-as-a-Judge Evaluator]
    D --> E[Pass/Fail Quality Dashboard]
```

### 1. Replay Runner
- Re-run historical multi-turn user transcripts against updated prompt versions or new LLM models.
- Capture raw input, raw output, token counts, and execution latency.

### 2. LLM-as-a-Judge Scoring Criteria
Pass generated outputs to an independent evaluator model with strict scoring rubrics:
- **Accuracy / Factual Correctness (0-5)**
- **Hallucination Check (PASS / FAIL)**
- **Safety Policy Compliance (PASS / FAIL)**
- **Tone & Persona Alignment (0-5)**

---

## 💻 Sample Evaluator Prompt Blueprint

```text
You are an expert AI QA Evaluator.
Analyze the following conversation transcript and candidate output.

[USER QUERY]: {user_query}
[GOVERNED SOURCE CONTENT]: {source_knowledge}
[AI RESPONSE TO EVALUATE]: {ai_response}

Evaluate strictly based on evidence:
1. Did the AI invent any facts outside the Governed Source Content? (Answer: YES/NO)
2. Score technical accuracy from 1 to 5.
3. Provide a 1-sentence justification.

Return output strictly as JSON:
{ "hallucinated": false, "accuracy_score": 5, "reasoning": "Output matched source specs exactly." }
```
