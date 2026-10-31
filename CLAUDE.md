# CLAUDE.md

Guidance for Claude agents working in this repo. Work arrives as GitHub issues labelled `agent`; the maintainer only reviews and merges PRs.

## Project overview

AI Cloud IDE: a browser-based, VS Code-style editor with AI code suggestions.

- `backend/` — FastAPI app in a single file, `main.py`.
  - `GET /` — status message.
  - `POST /ai-suggest` — body `{"code": str}`; calls OpenAI (`gpt-4o-mini`) via the `openai` SDK and returns `{"suggestion": str}`.
  - `GET/POST /files`, `GET/PUT/DELETE /files/{filename}` — file CRUD backed by an **in-memory dict** (`file_store`); data is lost on restart.
  - CORS allows `http://localhost:3000` only. Reads `OPENAI_API_KEY` from `backend/.env` via `python-dotenv`.
- `frontend/` — Create React App (`react-scripts` 5, React 19) with `@monaco-editor/react`.
  - `src/App.js` — main layout, file state (held in React state, **not** synced with the backend `/files` API), AI suggestion button. The AI response currently **overwrites** the whole file.
  - `src/Sidebar.js` — file explorer + "New File". `src/Tabs.js` — tab strip (supports an optional `onTabClose`, not wired up yet).
  - Backend URL is hardcoded as `http://127.0.0.1:8000` in `App.js`.
- `docs/` — diagram and notes.

## Commands

Backend (run from `backend/`):

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pip install openai pytest httpx        # until requirements files are fixed (see Known issues)
uvicorn main:app --reload              # http://127.0.0.1:8000
python -m pytest                       # tests
```

Frontend (run from `frontend/`):

```bash
npm ci                                 # install (package-lock.json is committed)
npm start                              # dev server on http://localhost:3000
CI=true npm test -- --watchAll=false   # tests, non-interactive
CI=true npm run build                  # production build; CI=true turns ESLint warnings into errors
```

CI (`.github/workflows/ci.yml`) runs backend `pytest` and frontend tests + build on every PR and on pushes to `main`. A PR is only mergeable when CI is green.

## Known issues (as of repo setup)

- `openai` is imported but missing from `backend/requirements.txt`.
- `main.py` builds the OpenAI client at import time and crashes if `OPENAI_API_KEY` is unset, so tests can't import it.
- No backend tests exist; `frontend/src/App.test.js` is the CRA default ("learn react") and fails.
- `CI=true npm run build` fails on an unused variable (`startResizing`) in `App.js`.

These are tracked by the Foundation issue; don't fix them incidentally in unrelated PRs.

## Rules

1. **One issue = one small PR.** Stay within the issue's scope and its "Out of scope" section. Reference the issue (`Closes #N`). If you find unrelated problems, mention them in the PR description instead of fixing them.
2. **Add tests for behavior changes.** Backend: pytest with FastAPI `TestClient`. Frontend: Jest + React Testing Library. Bug fixes get a regression test.
3. **Mock all LLM calls in tests.** Tests must never hit OpenAI or any network LLM and must pass with no API key set. Use a fake/stub provider or monkeypatch the client.
4. **Never commit secrets or `.env` files.** Use `.env.example` with placeholder values for any new config.
5. **Don't edit `.github/workflows/`** unless the issue explicitly asks for it.
6. **Justify new dependencies.** Prefer what's already installed. If you add a package, say why in the PR description and why existing deps aren't enough. Keep `package-lock.json` in sync.
7. **State assumptions in the PR description.** Include: summary, linked issue, assumptions made, how it was tested, and anything left for follow-up.
8. Before opening a PR, run the backend tests and the frontend test + build commands above and make sure they pass.
