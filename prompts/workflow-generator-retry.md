Your previous response was not valid JSON or did not match the required schema.

## Validation Errors

{{VALIDATION_ERRORS}}

## Instructions

Fix the issues listed above and respond with ONLY the corrected JSON object. Do not include any explanation, markdown fences, or additional text — just the raw JSON.

Remember:
- Every node needs: `id` (unique string), `type`, `position`, `config` (matching the type)
- The workflow needs `name` and `description` strings.
- The graph must be a DAG — no cycles, no self-loops.
- All edges must point to node IDs that actually exist in the graph.
- Config fields must match what the node type requires (see the system prompt for the schema).
- You can only use the 4 supported node types (`manual_trigger`, `ai_analyze`, `condition`, `save_result`).
