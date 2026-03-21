# Self-Critique Protocol

> After testing a target skill, review your own test process. Run as the final step of every test.

## Steps

1. **Scenario coverage:** Did agents find issues my scenario categories should have predicted? Any decision table rows uncovered? Scenarios too similar?

2. **Protocol effectiveness:** Did agents produce structured, comparable results? Did they need ad-hoc sections not in REPORT_FORMAT.md?

3. **Test quality:** For each scenario — was it specific enough? Independent? Did it test what it claimed?

4. **Cross-pollinate:** If a test found something `/skill-review` could catch statically, propose a checklist addition.

5. **Propose updates** (if gaps found):
   ```
   Self-Critique: After testing [skill], found gap in [reference].
   Proposed update: [specific addition]. Apply?
   ```

## Rules

- Only propose updates that improve future tests, not just this run
- Wait for patterns across multiple skill tests before adding categories
- Never self-modify SKILL.md — only reference files
- Always ask user approval before changes
