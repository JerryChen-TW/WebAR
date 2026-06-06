---
name: language-lens
description: Opens a live AR camera that detects objects in real time and labels them in the user's target language. Trigger when the user says "open camera", "start AR", "language lens", "show camera", or asks to learn vocabulary by seeing real objects.
---

# Language Lens — Live AR Camera Tutor

When the user wants to use the live camera to learn vocabulary, you MUST call the `run_js` tool.

## How to call run_js

Use these EXACT parameters:

- **scriptName**: `"index.html"`
- **data**: a JSON string with two fields:
  - `language`: the BCP-47 language code (see list below)
  - `languageName`: the full language name in English

### Language codes

| Language | code |
|---|---|
| Japanese | `ja` |
| Korean | `ko` |
| Chinese (Traditional) | `zh` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Thai | `th` |
| Vietnamese | `vi` |
| English | `en` |

### Example

If the user says "I want to learn Japanese", call run_js with:
- scriptName: `"index.html"`
- data: `{"language":"ja","languageName":"Japanese"}`

## Rules

1. If the user has not said which language they want to learn, ask them first. Then call run_js.
2. After calling run_js successfully, tell the user: "Your AR camera is now open — point it at any object!"
3. If the user requests a language not in the list, pick the closest match, tell the user, and call run_js.
