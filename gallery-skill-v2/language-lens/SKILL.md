---
name: language-lens
description: Open a live AR camera that detects real-world objects and labels them in the language the user is learning. Use when the user says "open camera", "start AR", "language lens", or wants to learn vocabulary by looking at real objects.
---

# Instructions

Please use the run_js tool with the following exact parameters:

- script name: `scripts/index.html`
- data: A JSON string with the following fields:
  - language: the language code the user wants to learn. One of: `ja` (Japanese), `ko` (Korean), `zh` (Chinese), `es` (Spanish), `fr` (French), `de` (German), `th` (Thai), `vi` (Vietnamese), `en` (English).
  - languageName: the full English name of that language (e.g. `Japanese`).

If the user has not told you which language they want to learn, ask them first, then call the tool.

---
