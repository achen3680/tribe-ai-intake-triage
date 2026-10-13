# Decision log

## Plan

- Define the intake data model and SQLite persistence.
- Build the API and its request and response contract.
- Add AI triage for summaries, tags, and risks.
- Build and polish the frontend flow and its loading, empty, and error states.

## Key decisions and why

- Save the intake even when AI triage fails. Capturing the user's information matters more than blocking the submission over an optional enrichment step.
- Use a smaller, faster model because the task is limited to summarization, tagging, and a short risk checklist.
- Wait for triage to finish before completing the create flow so the user sees the saved intake and its triage state together.
- Open the new intake's detail view after creation to make the result immediately visible.
- Regenerate triage after an edit so the summary, tags, and risks reflect the corrected intake fields.

## How I verified it works

- Ran the automated backend tests in `tests/` and the frontend tests.
- Checked the intake flow manually in the browser.
- Used Codex computer use to walk through the app as an end user. The repeatable sample flow and expected results are in `README.md`.

## Tradeoffs and intentional omissions

- There is no manual retry for AI triage. If the provider is unavailable during creation or editing, the saved intake remains marked **Needs review**.
- The smaller model reduces latency and cost, but may produce less nuanced summaries or tags.
- Returning a saved intake when AI is unavailable favors continuity of the intake workflow, while leaving enrichment incomplete.

## What I learned or would change

- Failure handling should preserve the user's submitted data and clearly show which part of the workflow is incomplete.
- If the app grows into a shared workflow, intake ownership and assignments would help teams act on new requests.

## With one more day

- Work with the client to define the tag taxonomy, then evaluate tag accuracy against representative intakes.
- Add a few examples to the prompt that show the client's preferred summary style.
- Add authentication and user assignments if the workflow needs named owners.
