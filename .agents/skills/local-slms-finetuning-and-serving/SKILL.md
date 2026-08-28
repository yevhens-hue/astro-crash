---
name: local-slms-finetuning-and-serving
description: Local SLMs (Small Language Models), Fine-Tuning & Serving pattern. Implements vLLM / Ollama local serving clients, Unsloth QLoRA fine-tuning specifications for Qwen 2.5 7B / Llama 3.1 8B, and 100% Guaranteed Structured Output decoding (Instructor / Outlines pattern). Use when deploying on-premise AI models, reducing cloud API costs to $0, fine-tuning domain models, or enforcing faultless JSON schema outputs.
---

# Local SLMs, Fine-Tuning & Serving (vLLM, Ollama, Unsloth, Instructor)

This skill encodes enterprise patterns for **deploying local open-weights Small Language Models (SLMs)**, **fine-tuning custom adapters via Unsloth & QLoRA**, and **enforcing 100% valid JSON schema outputs**.

---

## 🏛️ Architecture & System Topology

```
                          User Request / Agent Tool Call
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │ 1. Local Serving Layer            │
                      │    (vLLM / Ollama Server)         │
                      │    Qwen 2.5 7B / Llama 3.1 8B    │
                      └─────────────────┬─────────────────┘
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │ 2. Unsloth LoRA Domain Adapter    │
                      │    (Fine-Tuned Lead Qualification)│
                      └─────────────────┬─────────────────┘
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │ 3. Constrained Grammar Decoder    │
                      │    (Instructor / Outlines Pattern)│
                      │    Enforces Pydantic/Zod Schema   │
                      └─────────────────┬─────────────────┘
                                        │
                                        ▼
                        100% Guaranteed Valid JSON Output
```

---

## 🔑 Core Components & Implementation Directives

### 1. Local Model Serving Engines (vLLM & Ollama)
- **vLLM Engine (`http://localhost:8000/v1`):** OpenAI-compatible API utilizing **PagedAttention** for high-throughput batching ($> 80 \text{ tokens/sec}$).
- **Ollama Engine (`http://localhost:11434`):** Local GGUF model runner for quantized 4-bit/8-bit models.
- **Zero API Cost & Privacy:** On-premise execution guaranteeing HIPAA/GDPR data privacy and $0 cloud token costs.

### 2. Unsloth QLoRA Fine-Tuning Specification
- **Base Models:** `Qwen/Qwen2.5-7B-Instruct` or `meta-llama/Llama-3.1-8B-Instruct`.
- **QLoRA Parameters:** 4-bit quantization, $r = 16$, $\alpha = 16$, targeting linear projections (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
- **Unsloth Speedup:** 2-5x faster fine-tuning with 80% memory reduction, exported to GGUF (`q4_k_m`) for Ollama/vLLM.

### 3. Guaranteed Structured Output (Instructor / Outlines Pattern)
- **Constrained Grammar Decoding:** Filters candidate token logits against target Pydantic/dataclass schema during generation.
- **Sanitizer & Repair Fallback:** Automatically handles raw markdown wrappers (` ```json ... ``` `) and mangled syntax, guaranteeing zero `JSON.parse` failures.

---

## 🛠️ Usage Example

Refer to reference scripts in `local-slm-serving-lab/`:

```python
from grammar_structured_output_engine import GrammarStructuredOutputEngine
from unsloth_lora_fine_tuning_spec import UnslothLoRAFineTuningConfig
from vllm_ollama_serving_client import LocalServingClient

# 1. Local Inference Client
client = LocalServingClient(backend="vllm", endpoint="http://localhost:8000/v1")
response = client.generate_completion("Qualify Lead LEAD-7782")

# 2. Enforce 100% Valid JSON Schema
grammar_engine = GrammarStructuredOutputEngine()
validated_schema = grammar_engine.enforce_constrained_grammar(response['raw_output'])
print(f"Lead Score: {validated_schema.lead_score}, Action: {validated_schema.recommended_action}")

# 3. Fine-Tuning Config
unsloth_config = UnslothLoRAFineTuningConfig(base_model="Qwen/Qwen2.5-7B-Instruct")
script_code = unsloth_config.generate_unsloth_training_script_code()
```
