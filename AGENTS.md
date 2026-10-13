# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an assignment scaffold. `PREREAD.md` contains the build checklist, `DECISIONS.md` is the decision log, and `README.md` is reserved for setup and usage instructions. The chosen stack is FastAPI, React/Vite, and SQLite. As the app is built, place Python API and persistence code in `backend/`, React code in `frontend/src/`, static assets in `frontend/public/`, and tests near the code they cover or in `tests/`. Keep generated SQLite files and build output out of Git.

## Build, Test, and Development Commands

There is no application or test command in the scaffold yet. Add the exact commands to `README.md` when creating each part of the app. Expected local workflow: run the FastAPI server with `uvicorn backend.main:app --reload` after `backend/main.py` exists; run `npm install` and `npm run dev` from `frontend/` after its Vite project is created. Record the actual test commands once test tooling is configured. Run `git status` before each commit to check which files will be included.

## Coding Style & Naming Conventions

Use four spaces for Python and two spaces for TypeScript/TSX. Name Python modules and functions `snake_case`, classes `PascalCase`, and React components `PascalCase`. Keep API request/response schemas separate from database models. Use a formatter and linter appropriate to each language when those tools are added; document their commands in `README.md`.

## Testing Guidelines

No test framework or coverage threshold is configured yet. Add focused tests for intake creation, SQLite persistence, and create/list/detail UI flows. If using pytest, name Python tests `test_*.py`; if using Vitest, name frontend tests `*.test.tsx`. Include failure cases for invalid input and LLM errors. Run the relevant tests before committing.

## Commit & Pull Request Guidelines

The existing commit uses a short, imperative subject: `Initialize intake triage assignment repository`. Follow that style, and make local commits as the build progresses. For pull requests, summarize the behavior changed, list verification commands and results, link an issue if one exists, and include screenshots for UI changes.

## Security & Recording

Start the whole-build Loom recording before creating application code, as required by `PREREAD.md`. Keep API keys in `.env`, never in source or commits; `.env.example` should contain names only. Check the final ZIP for secrets and generated files before submission.
