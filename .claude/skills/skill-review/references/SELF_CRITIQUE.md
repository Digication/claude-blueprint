# Self-Critique Protocol

> After reviewing a target skill, review yourself. Run as the final step of every review.

## Steps

1. **Coverage check:** Did I catch issues through checklist items, or through intuition? If intuition, the checklist has a gap.

2. **Blind spot check:** Compare what I reviewed against CHECKLIST.md, ALLOWED_TOOLS.md, SPECIFICATION.md. Any checks I performed that aren't listed? Any listed checks I skipped?

3. **Feedback quality:** For each issue reported — was it correct, actionable, and properly severity-rated?

4. **Propose updates** (if gaps found):
   ```
   Self-Critique: After reviewing [skill], found gap in [reference].
   Proposed update: [specific addition]. Apply?
   ```

## Rules

- Only propose updates that improve future reviews, not just this one
- Wait for 2+ occurrences before adding new checks
- Never self-modify SKILL.md — only reference files
- Always ask user approval before changes
