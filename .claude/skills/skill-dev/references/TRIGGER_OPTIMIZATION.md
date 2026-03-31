# Trigger Optimization Reference

## How Skill Triggering Works

Skills appear in Claude's context as `available_skills` with their name + description. Claude decides whether to consult a skill based on that description. Better descriptions → better trigger accuracy.

**Important limitation:** The `optimize-triggers.mjs` script simulates triggering by asking `claude -p` directly. This approximates real routing but may not perfectly match production behavior. Use scores as directional signal, not absolute truth.

## Query Set Design

Good queries are realistic and specific — they look like something an actual user would type in a Claude Code session:

**Good should-trigger queries:**
- Include personal context: "my boss sent me this file..."
- Include technical details: "the `orders` table in PostgreSQL..."
- Use casual phrasing: "how do i..." or abbreviations
- Cover edge cases where the skill SHOULD fire but might not be obvious

**Good should-not trigger queries (most important):**
- Near-misses: share keywords but need a different skill
- Ambiguous phrasing: the query COULD be for this skill, but isn't
- Adjacent domain: close to this skill's area but out of scope

**Bad queries (avoid):**
- Obviously irrelevant: "write a fibonacci function" as a negative for a PDF skill
- Too on-the-nose: just the skill name as the query
- Hypothetical: "if I wanted to..."

## Metrics

| Metric | Formula | Meaning |
|---|---|---|
| Precision | TP / (TP + FP) | Of queries that triggered, how many should have? |
| Recall | TP / (TP + FN) | Of queries that should trigger, how many did? |
| F1 | 2 × (P × R) / (P + R) | Harmonic mean — overall balance |

**Target:** F1 ≥ 0.85 on the held-out test set.

## Train/Test Split

The optimizer splits queries 60% train / 40% test before running. It optimizes against the train set and measures the best candidate against the test set. This prevents overfitting to the training queries.

The `best_description` is selected by **test score**, not train score.

## Convergence

The loop stops when:
- Train F1 ≥ 0.95 (converged)
- Max rounds reached (default: 5)
- No test score improvement for 2 consecutive rounds
