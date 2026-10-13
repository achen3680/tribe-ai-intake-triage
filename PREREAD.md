# Exercise 3: Intake triage app — assignment pre-read

Read the original exercise PDF provided with the assignment before starting. This file is a working checklist, not a replacement for the brief.

## Before building

- Start the whole-build Loom recording **before creating the app**.
- **Chosen stack: Option B — FastAPI + React/Vite + SQLite.** Use Python for the FastAPI backend, React/Vite for the frontend, and SQLAlchemy or SQLModel with SQLite for persistence.
- Have Git, Python, Node.js, and an LLM API key ready before recording. Aim to ship and explain the app in roughly 2–3 hours.
- Make local Git commits as you build.

## Implementation checklist

- [ ] Intake fields: title, description, budget range, timeline, industry, `created_at`.
- [ ] Local persistence (SQLite recommended).
- [ ] Create form, list view, detail view.
- [ ] On creation, LLM generates a 2–3 sentence summary, exactly three tags, and a bullet risk checklist.
- [ ] Store AI outputs and display them in the UI.
- [ ] Loading, empty, and user-visible error states.
- [ ] End-to-end walkthrough and explanation of failure handling.

## Recording wrap-up (10–20 min)

1. Demo create → list → detail, including loading, empty, and error states.
2. Explain frontend/API flow, data model, persistence, and AI call/storage.
3. Explain how you checked correctness and handled bad input or LLM failures.
4. State tradeoffs and what you would do with one more day.

## Packaging

When complete, zip **this repository directory including `.git`**, with a suggested name of `Albert_Chen_Tribe_IntakeTriage.zip`. Review the ZIP for API keys and generated artifacts before submitting. Document the approximate time spent and link the whole-build Loom in the final submission.
