/**
 * Extraction budgets — separate LLM call limits from table output caps.
 *
 * MAX_LLM_CALLS_PER_EXTRACT: hard cap on MiniMax round-trips per uploaded file.
 * MAX_TABLES_PER_DOCUMENT: UI/storage safety cap only — NOT a prompt target to fill.
 */

export const MAX_LLM_CALLS_PER_EXTRACT = 5;

/** Safety cap for UI tabs; agents should not pad to reach this number. */
export const MAX_TABLES_PER_DOCUMENT = 12;
