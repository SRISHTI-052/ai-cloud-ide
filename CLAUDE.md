# CLAUDE.md

Guidance for Claude agents working in this repo. Work arrives as GitHub issues labelled `agent`; the maintainer only reviews and merges PRs.

## Project overview

AI Cloud IDE: a browser-based, VS Code-style editor with AI code suggestions.

- `backend/` — FastAPI app in `main.py`; LLM access goes through the `backend/llm/` package.
  - `GET /` — status message. `GET /health` — `{"status": "ok"}`.
  - `POST /ai-suggest` — body `{"code": str}`; calls the configured `LLMProvider` (injected via the `get_llm` dependency) and returns `{"suggestion": str}`.
  - `GET/POST /files`, `GET/PUT/DELETE /files/{filename}` — file CRUD backed by SQLite (`backend/storage.py`, stdlib `sqlite3`, `projects` + `files` tables, single default project). DB path from `DB_PATH` (default `backend/data/ide.db`, gitignored). Injected via the `get_storage` dependency.
  - CORS allows `http://localhost:3000` only. Config from `backend/.env` via `python-dotenv`: `OPENAI_API_KEY`, `LLM_PROVIDER` (`openai` | `fake`), `LLM_MODEL` (default `gpt-4o-mini`).
- `frontend/` — Create React App (`react-scripts` 5, React 19) with `@monaco-editor/react`.
  - `src/App.js` — main layout; loads files from `/files`, manages open tabs, debounced auto-save (`lodash.debounce`, `SAVE_DELAY_MS`), AI suggestion button. AI responses open in `SuggestionDiff.js` (Monaco `DiffEditor`) and only change the file on Accept.
  - `src/Sidebar.js` — file explorer + "New File". `src/Tabs.js` — closable tabs with save-status indicator. `src/api.js` — all backend fetch calls.
  - Backend URL: `REACT_APP_API_URL`, default `http://127.0.0.1:8000` (in `api.js`).
- `docs/` — diagram and notes.

## Commands

Backend (run from `backend/`):

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt    # runtime deps + pytest/httpx
cp .env.example .env                   # set OPENAI_API_KEY (only needed for real AI calls)
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

## Testing conventions

- `backend/llm/`: `LLMProvider` (ABC with `complete(system, user, *, max_tokens=None) -> str`), `OpenAIProvider`, `FakeProvider`, and `create_provider()` (reads `LLM_PROVIDER`/`LLM_MODEL`). Never call the `openai` SDK directly from endpoints.
- Backend tests live in `backend/tests/`; `conftest.py` strips API keys/provider env vars and gives every test a fresh temp SQLite DB (`storage` fixture). Use the `fake_llm` fixture (a `FakeProvider` injected via `app.dependency_overrides`) for any endpoint that uses the LLM.
- Frontend: `src/__mocks__/@monaco-editor/react.js` replaces `Editor`/`DiffEditor` with plain elements in Jest (Monaco can't run in jsdom). Mock the backend with `src/testUtils/mockBackend.js` (in-memory fake `fetch`; `callsTo()` to assert on requests).

## Rules

1. **One issue = one small PR.** Stay within the issue's scope and its "Out of scope" section. Reference the issue (`Closes #N`). If you find unrelated problems, mention them in the PR description instead of fixing them.
2. **Add tests for behavior changes.** Backend: pytest with FastAPI `TestClient`. Frontend: Jest + React Testing Library. Bug fixes get a regression test.
3. **Mock all LLM calls in tests.** Tests must never hit OpenAI or any network LLM and must pass with no API key set. Use a fake/stub provider or monkeypatch the client.
4. **Never commit secrets or `.env` files.** Use `.env.example` with placeholder values for any new config.
5. **Don't edit `.github/workflows/`** unless the issue explicitly asks for it.
6. **Justify new dependencies.** Prefer what's already installed. If you add a package, say why in the PR description and why existing deps aren't enough. Keep `package-lock.json` in sync.
7. **State assumptions in the PR description.** Include: summary, linked issue, assumptions made, how it was tested, and anything left for follow-up.
8. Before opening a PR, run the backend tests and the frontend test + build commands above and make sure they pass.
