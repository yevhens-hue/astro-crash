---
name: prompt-injection-defense
description: Implements a 3-layer Prompt Injection Guard for AI agents that process untrusted external input (voice transcripts, emails, webhooks, CRM data). Layer 1 sanitizes known injection patterns (English + Russian). Layer 2 wraps caller text in an isolated LLM context boundary. Layer 3 gates high-risk actions behind human-in-the-loop approval. Use when building AI agents that receive text from untrusted sources, when asked about LLM security, prompt injection, jailbreak defense, or when integrating voice/email agents with production CRM systems.
---

# Prompt Injection Defense (3-Layer Guard)

## Quick start

```js
import { promptInjectionGuard } from './services/PromptInjectionGuardService.js';

// Full pipeline: sanitize → isolated prompt
const { prompt, injectionDetected } = promptInjectionGuard.process(
  callerTranscript,
  'book a roofing appointment for the caller'
);

// Pass `prompt` to LLM — never the raw transcript
const llmResponse = await openai.chat(prompt);
```

## The 3 Layers

### Layer 1 — `sanitize(rawText)` — Input Sanitization
Strips known injection patterns. Returns `{ clean, injectionDetected, filtersApplied }`.

Covers:
- English: `ignore previous instructions`, `you are now a`, `[INST]`, `###System:`, ChatML markers
- Russian: `игнорируй инструкции`, `ты теперь`, `отправь все данные`, etc.

```js
const { clean, injectionDetected } = promptInjectionGuard.sanitize(rawText);
```

### Layer 2 — `buildIsolatedPrompt(cleanText, agentGoal)` — Context Isolation
Wraps sanitized text in a SECURITY BOUNDARY so the LLM treats it as DATA, not COMMANDS.

```js
const prompt = promptInjectionGuard.buildIsolatedPrompt(clean, 'schedule a callback');
```

### Layer 3 — `executeAction(action, approvalCallback)` — Human-in-the-Loop Gate
High-risk action types (`book_appointment`, `charge_payment`, `send_email`, `export_data`, etc.)
require explicit human approval before execution.

```js
await promptInjectionGuard.executeAction(
  { type: 'charge_payment', description: 'Charge $500', execute: async () => { ... } },
  async ({ description }) => {
    // Send Telegram approval request, return true/false
    return await sendTelegramApproval(description);
  }
);
```

## Integration Pattern (Express Webhook)

Wire into the webhook handler BEFORE any LLM or evaluation call:

```js
import { promptInjectionGuard } from '../services/PromptInjectionGuardService.js';

// In your webhook handler:
const rawTranscript = req.body.transcript;
const { clean: transcript, injectionDetected } = promptInjectionGuard.sanitize(rawTranscript);

if (injectionDetected) {
  console.warn(`[Security] Injection attempt — transcript sanitized.`);
}

// Now safe to pass to LLM or evaluation
await evaluationService.evaluate({ rawTranscript: transcript });
```

## High-Risk Action List (Layer 3)
`send_email`, `send_sms`, `book_appointment`, `cancel_appointment`,
`charge_payment`, `refund_payment`, `delete_record`, `export_data`, `call_external_api`

Add new ones via: `promptInjectionGuard.HIGH_RISK_ACTIONS.add('your_action_type')`

## Reference Implementation
- [`PromptInjectionGuardService.js`](file:///Users/yevhen/Cursor/AI%20Voices/src/services/PromptInjectionGuardService.js)
- Integrated in: [`api.js` webhooks](file:///Users/yevhen/Cursor/AI%20Voices/src/routes/api.js)
