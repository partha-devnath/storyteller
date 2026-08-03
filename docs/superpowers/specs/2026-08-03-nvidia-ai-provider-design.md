# NVIDIA AI Provider

Date: 2026-08-03

## Goal

Replace the `openai` + `anthropic` providers in `@workspace/ai` with a single
NVIDIA provider backed by the free NVIDIA NIM API (build.nvidia.com), keeping
`mock` as the deterministic dev/test fallback.

## Background

`@workspace/ai` exposes an `LLMProvider` interface (`chat()` + `embed()`) with
three implementations: `openai` (real), `anthropic` (stub, throws), `mock`
(deterministic). The `openai` npm SDK is already a pinned dependency.

NVIDIA NIM serves an OpenAI-compatible endpoint at
`https://integrate.api.nvidia.com/v1` authenticated with an `nvapi-` key. This
means the existing `openai` SDK can be reused as a plain HTTP client pointed at
NVIDIA's base URL — no new runtime dependency.

Free tier: ~1000 credits, ~40 req/min. Chat model default
`deepseek-ai/deepseek-v4-flash` (1M context, MoE, fast coding/agents).
Embedding model default `nvidia/nv-embed-v1` (OpenAI-compatible
`/v1/embeddings`, requires `input_type` + `truncate` extra body fields).

## Design

### 1. New provider: `packages/ai/src/providers/nvidia.ts`

```ts
export type NVIDIAProviderEnv = {
  apiKey?: string
  chatModel?: string
  embeddingModel?: string
}

export function createNVIDIAProvider(env: NVIDIAProviderEnv): LLMProvider
```

- `apiKey` required; throw `NVIDIA_API_KEY is required when AI_PROVIDER is set to "nvidia"` when missing.
- `chatModel` default `deepseek-ai/deepseek-v4-flash`.
- `embeddingModel` default `nvidia/nv-embed-v1`.
- Lazily loads the `openai` SDK (dynamic `await import("openai")`, mirroring the current provider), constructed with `{ apiKey, baseURL: "https://integrate.api.nvidia.com/v1" }`.
- `chat(messages)` → `client.chat.completions.create({ model: chatModel, messages })`, return `choices[0].message.content`, throw on null.
- `embed(texts)` → `client.embeddings.create({ model: embeddingModel, input: texts, extra_body: { input_type: "passage", truncate: "NONE" } })`, return `data.map((e) => e.embedding)`.

### 2. Delete

- `packages/ai/src/providers/openai.ts`
- `packages/ai/src/providers/anthropic.ts`

### 3. Barrel: `packages/ai/src/index.ts`

- Remove openai/anthropic imports + exports.
- Add `createNVIDIAProvider` export.
- Factory: `providerName === "nvidia" ? createNVIDIAProvider({ apiKey: process.env.NVIDIA_API_KEY, chatModel: process.env.CHAT_MODEL, embeddingModel: process.env.EMBEDDING_MODEL }) : createMockProvider()`.

### 4. Env schema: `apps/api/src/env.ts`

- `AI_PROVIDER: z.enum(["nvidia", "mock"]).default("mock")`.
- `NVIDIA_API_KEY: z.string().optional()`.
- Remove `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- `CHAT_MODEL: z.string().default("deepseek-ai/deepseek-v4-flash")`.
- `EMBEDDING_MODEL: z.string().default("nvidia/nv-embed-v1")`.

### 5. Vector fallback: `packages/vector/src/index.ts`

- Two hardcoded `process.env.EMBEDDING_MODEL ?? "text-embedding-3-small"` fallbacks → `"nvidia/nv-embed-v1"`.

### 6. `.env.example`

AI block:

```
# AI (NVIDIA NIM, build.nvidia.com — free nvapi- key)
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-
CHAT_MODEL=deepseek-ai/deepseek-v4-flash
EMBEDDING_MODEL=nvidia/nv-embed-v1
```

Note: `NVIDIA_API_KEY=nvapi-` line already added; AI_PROVIDER/CHAT_MODEL/EMBEDDING_MODEL lines are added and the OpenAI/Anthropic lines removed.

### 7. Docs: `DEPLOYMENT.md`

Update the environment variable table: `AI_PROVIDER` (`nvidia | mock`),
`NVIDIA_API_KEY`, `EMBEDDING_MODEL`, `CHAT_MODEL`; drop OpenAI/Anthropic rows.

### 8. Tests: `packages/ai/src/__tests__/nvidia-provider.test.ts`

- Missing `apiKey` throws with the NVIDIA message.
- `chat`/`embed` methods exist.
- Model defaults surface correctly (construct provider with only `apiKey`).
- `AI_PROVIDER` unset → default is `mock` (existing mock test covers this; keep).

Existing `mock-provider.test.ts` unchanged. No new dependencies; `openai@7.3.0` stays (used as client only).

## Non-goals

- No billing/rate-limit handling beyond NIM defaults.
- Historical `.planning/*` docs not retro-edited (they document completed phases).
- No config for self-hosted NIM containers.

## Verification

- `bun --filter @workspace/ai test` passes (mock + nvidia provider tests).
- `bun --filter @workspace/ai typecheck`, `bun run lint` pass.
- `bun --filter @workspace/api typecheck` passes (env schema change).
- E2E unchanged (`AI_PROVIDER=mock` in `apps/e2e/playwright.config.ts`).
