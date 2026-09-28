# BIS-Procure Ledger — SIH 26108

AI-assisted Indian Standard recommendations for government procurement specifications (curated demo catalogue, not the full BIS library).

**Stack:** React dashboard · FastAPI · PostgreSQL + pgvector · local MiniLM embeddings · Chrome extension (mock GeM).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2)
- Optional for local dev without Docker: Python 3.12+, Node 22+

---

## Quick start (Docker — recommended for demos)

1. Copy environment template (optional keys for cloud LLM / Bhashini):

   ```powershell
   copy .env.example .env
   ```

2. Build and start Postgres, API, and dashboard:

   ```powershell
   docker compose up --build
   ```

   First API start runs **idempotent seed** (`seed_data.py`) then uvicorn. The embedding model is **baked into the API image** at build time.

3. Open:

   | URL | Service |
   |-----|---------|
   | http://localhost:8080 | Dashboard (nginx → API proxy) |
   | http://localhost:8000/docs | OpenAPI |
   | http://localhost:8000/health | Health (`all-MiniLM-L6-v2`, `db: ok`) |

4. **Offline demo:** no `LLM_API_KEY` or Bhashini keys required. English specs and mapped Hindi demo phrases work against the seeded DB.

---

## Demo script (judging)

1. **Fire doors (English)** — paste or use demo chip: hospital fireproof doors. Expect **IS 3614**, normative **IS 17518 (Part 1)**, fire-door QCO shown as **unverified** (draft DPIIT PDF only).
2. **Concrete (Hindi)** — language Hindi, demo phrase for cement/road (`सीमेंट कंक्रीट सड़क निर्माण`). Expect **IS 456**, **no** mandatory QCO badge.
3. **IT laptops** — office IT / server safety text. Expect **IS/IEC 62368-1:2023** and/or **IS 13252 (Part 1)** with **CRS** when cited.
4. **Withdrawn code** — paste `IS 13252 (Part 1)` in English. Expect **LATEST_VERSION_ALERT** and successor **IS/IEC 62368-1:2023**.
5. **Extension** — see below; API URL must be **port 8000**, not the dashboard port **8080**.

Every result screen includes: *Dataset status is not a gazette. Confirm before publishing the tender.*

---

## Chrome extension + mock GeM

1. API must be reachable at **http://127.0.0.1:8000** (Docker `api` service or local uvicorn).
2. Chrome → Extensions → **Load unpacked** → select the `extension/` folder.
3. Extension toolbar icon → API base URL → **http://127.0.0.1:8000** → Save.
4. Mock tender page (static server, **not** the dashboard):

   ```powershell
   npx --yes serve extension/demo -p 8090
   ```

   Open http://127.0.0.1:8090/gem-mock.html (use **8090** so it does not clash with the dashboard on **8080**).

5. Focus the technical specification textarea → **BIS Assistant** → **Run audit** → **Insert into tender**.

---

## Local development (without Docker)

**Database**

```powershell
docker compose up -d db
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://bis:bis@localhost:5433/bis_recommend"
python seed_data.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Dashboard**

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` and `/health` to port 8000).

---

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes (API) | Postgres with pgvector |
| `LLM_API_KEY` | No | Cloud extraction (`extraction_mode=llm`) |
| `LLM_BASE_URL`, `LLM_MODEL` | No | OpenAI-compatible chat API |
| `BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_PIPELINE_ID` | No | Live translation |
| `VITE_API_BASE_URL` | No | Dashboard dev only; Docker build uses same-origin proxy |

Embeddings are always **local** `all-MiniLM-L6-v2` (384-d) on the API host — not configured via `.env`.

---

## Repository layout

```
backend/          FastAPI, seed, Dockerfile
frontend/         React dashboard, nginx Dockerfile
extension/        Chrome MV3 + demo/gem-mock.html
docs/Blueprint.md Phase contract and architecture
docker-compose.yml
```

---

## Limitations (honest demo scope)

- ~35 curated standards, not 21,000 BIS titles.
- Scope text is original paraphrase, not BIS PDF content.
- QCO rows use public references where cited; some orders are marked **unverified**.
- Production GeM DOM injection is not guaranteed; acceptance uses the local mock page.

Execution phases are tracked in `docs/Blueprint.md`.
