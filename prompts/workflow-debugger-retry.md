Your previous response was not valid JSON or did not match the required schema for a debug diagnosis.

## Validation Errors

{{VALIDATION_ERRORS}}

## Instructions

Fix the issues listed above and respond with ONLY the corrected JSON object. Do not include any explanation, markdown fences, or additional text — just the raw JSON.

Remember:
- Your output MUST have: `diagnosis` (string), `probableCause` (string), and `suggestedFix` (object).
- `suggestedFix` must have a `type` field: either `"update_node_config"` or `"no_safe_fix"`.
- If `type` is `"update_node_config"`, include `nodeId` (string) and `changes` (object with config key-value pairs to update).
- Do NOT suggest structural changes (adding/removing nodes or edges) — use `"no_safe_fix"` instead.
- Output ONLY the raw JSON object. No markdown, no explanation.
