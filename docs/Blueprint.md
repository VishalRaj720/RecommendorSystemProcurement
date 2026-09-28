# Blueprint — AI-Powered IS Recommendation Engine

Smart India Hackathon problem statement **26108** (Department of Consumer Affairs): help a procurement officer turn a product description into applicable Indian Standards, with Quality Control Order (QCO) status, revision status, and normative references.

This file is the execution contract. Implement **one phase at a time**. Do not start Phase N+1 until Phase N acceptance checks pass. Update the status table in the same change that finishes a phase.

Workspace root **is** the monorepo (`backend/`, `frontend/`, `extension/`, `docs/`). Do not nest another `sih-is-recommendation-engine/` folder.

---

## Status

| Phase | Name | Status |
| --- | --- | --- |
| 0 | Blueprint, rules, skills | Done |
| 1 | Database, models, seed | Done |
| 2 | FastAPI recommend pipeline | Done |
| 3 | React dashboard | Done |
| 4 | Chrome extension + local GeM mock | Not started |
| 5 | Docker demo packaging | Not started |

---

## What the product must prove

Three scripted tenders must work with **no cloud API key** and **no live GeM login**:

1. Hospital fire doors → primary fire-door standard, normative test/installation codes that exist in the seed, revision status.
2. IT servers / laptops → `IS 13252 (Part 1)` with Compulsory Registration Scheme (CRS) when the seed row is evidence-backed.
3. Cement / concrete for roads → `IS 456` as a code of practice. No invented product QCO.

A fourth path: the officer pastes an old or withdrawn code. The engine names that code, its status, and the successor **only when the successor is stored**. It must not hide non-active rows.

---

## Architecture corrections

These replace conflicting lines in the original brief. Later phases follow this section.

### 1. One embedding space

`text-embedding-3-small` is 1536 dimensions. Gemini `text-embedding-004` is 768. Cosine search across mixed vectors is meaningless.

**Decision:** corpus and queries use the same local model, `sentence-transformers/all-MiniLM-L6-v2`, **384 dimensions**. Bake the model into the backend image at **build** time so the venue demo does not download it. Commit seed text in JSON; generate vectors at seed time inside that image.

Cloud embeddings are out of scope until a later migration re-embeds every row and changes the column dimension in one step.

The pgvector operator `<=>` is **cosine distance** (lower is nearer). Order `ASC`. The column name is `embedding`.

### 2. Offline path is the primary path

The brief requires both managed LLMs and a Docker demo that survives a dead network. Those conflict if extraction or translation has no fallback.

**Decision:** `POST /api/v1/recommend` always runs this order:

1. Detect explicit IS codes with a regex (`IS`, optional `IEC` mention ignored, part numbers kept).
2. Translate non-English input only when configured (see Bhashini). Record `translation_mode` on the response: `english_input`, `bhashini`, `demo_map`, or `untranslated`.
3. Extract attributes with the LLM **only if** `LLM_API_KEY` is set. Otherwise use a small keyword tagger (material, product type, domain). The response field `extraction_mode` is `llm` or `rules`.
4. Embed the English query with the local 384-d model.
5. Vector search **plus** direct lookup of every explicit code, including `WITHDRAWN` and `REVISED`.
6. Attach QCO rows and normative links from Postgres. Depth of the normative tree is **at most 2**.

No API key → steps 1, 3 (rules), 4, 5, 6 still return the three demo tenders.

### 3. Bhashini is optional

The Bhashini ULCA pipeline needs a user id, an API key, and a pipeline id. A missing key must not crash the request.

**Decision:** `translate_to_english()` calls Bhashini when all three env vars exist. Otherwise:

- `language=en` → unchanged, mode `english_input`.
- A phrase listed in `backend/app/data/demo_phrases.json` → mapped English, mode `demo_map` (scripted Hindi/Tamil lines for the demo).
- Anything else → return the original text, mode `untranslated`, and a warning string. Do not claim the text was translated.

UI output stays in English for titles, IS codes, and certification names. Only explanatory prose may be translated, and only through `POST /api/v1/translate`. Never machine-translate an IS code or a QCO notification title.

### 4. Do not store copyrighted standard text

BIS standards are copyrighted. Full scope text copied from a PDF is out of scope.

**Decision:** each standard stores `is_code`, `title`, a **short original paraphrase** in `scope_summary` (a few sentences written for this project), `latest_revision_year`, `status`, `category`, optional `successor_is_code`, and `embedding`. No PDF archive. The export says the officer must read the published standard from BIS.

### 5. Do not invent legal mandates

A wrong QCO badge is worse than no badge. The original brief links **IS 1382** (glossary of terms for the glass industry) as fire-door terminology. That link is false. Do not seed it.

`IS 456` is a code of practice for plain and reinforced concrete. Do not attach a product QCO to it unless a real notification row is added with a source.

`IS 13252 (Part 1)` (IT equipment safety) is the CRS example. Seed it only with `evidence_level`, `notification_ref`, and `source_url` filled from a public government source checked at seed time. If the source cannot be checked, set `evidence_level` to `unverified` and the UI shows **Unverified — confirm the gazette** instead of **Mandatory**.

Every QCO row has:

- `evidence_level`: `cited` or `unverified`
- `notification_ref`: gazette or order name, empty only when `unverified`
- `source_url`: public page, empty only when `unverified`

The dashboard always shows: “Dataset status is not a gazette. Confirm before publishing the tender.”

### 6. Active-only search drops the actual bug

`WHERE status = 'ACTIVE'` never flags the withdrawn code the officer typed.

**Decision:** two lookups.

- Semantic search returns the nearest standards (any status), then the ranker prefers `ACTIVE` when distances are close.
- Explicit codes load the exact row. `WITHDRAWN` or `REVISED` sets `LATEST_VERSION_ALERT` and includes `successor_is_code` when present.

### 7. Codes need a stable unique key

`IS 13252` without a part is ambiguous. `is_code` is unique and includes the part when one exists, for example `IS 13252 (Part 1)`. Foreign keys use `standards.id` (UUID). `parent_id` / `child_id` reference that UUID. A normative child must already exist in `standards`.

### 8. Extension must not depend on production GeM DOM

GeM pages are a changing SPA, often with a strict content-security policy. A live inject is a poor hackathon proof, and writing legal text into a real tender from unverified matches is unsafe.

**Decision:**

- Manifest V3 `side_panel` is the assistant UI.
- `content.js` adds a floating button and reads/writes the focused `textarea` or `input`.
- Hosts: `http://localhost/*`, `http://127.0.0.1/*`, `*://*.gem.gov.in/*`, `*://*.eprocure.gov.in/*`.
- Phase 4 ships `extension/demo/gem-mock.html`, a static tender form. The acceptance test runs against that page.
- Inserted text is a clause the officer can edit. It includes IS code, title, revision year, and the confirmation sentence from section 5.

### 9. Document upload is a backend step

PDF text extraction lives in FastAPI (`pypdf`), endpoint `POST /api/v1/documents`, returning plain text. The dashboard then calls `/recommend` with that text. Word (`.docx`) is out of scope until Phase 3 acceptance passes. Voice input is out of scope.

### 10. Postgres image

Use `pgvector/pgvector:pg16`, not stock Postgres. Enable `CREATE EXTENSION IF NOT EXISTS vector` on startup. For the demo corpus (under a few hundred rows) a sequential scan is enough. Add an HNSW index only if the table grows past about 1,000 rows.

### 11. Frontend toolchain

Vite + React + Tailwind. The API base URL comes from `VITE_API_BASE_URL`. CORS allows `http://localhost:5173` and `chrome-extension://` origins.

### 12. Stack that stays

React dashboard, FastAPI, PostgreSQL + pgvector, Chrome Manifest V3, Docker Compose (Postgres, API, static web). Bhashini and an OpenAI-compatible or Gemini chat model remain optional adapters behind the modes above.

---

## Data model

### `standards`

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `is_code` | Unique, part included |
| `title` | Published title |
| `scope_summary` | Short original paraphrase |
| `embedding` | `vector(384)`, not null after seed |
| `latest_revision_year` | Integer, only if known |
| `status` | `ACTIVE`, `WITHDRAWN`, `REVISED` |
| `successor_is_code` | Nullable string, not an FK (successor might be absent from the seed) |
| `category` | Civil, Electrical, Electronics, Mechanical, Safety, Chemical, Other |

### `normative_references`

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `parent_id` | FK → `standards.id` |
| `child_id` | FK → `standards.id` |
| `relationship_type` | `TEST_METHOD`, `TERMINOLOGY`, `SAFETY`, `INSTALLATION` |

No self-links. The API refuses to walk more than two hops.

### `quality_control_orders`

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `standard_id` | FK → `standards.id` |
| `qco_title` | Short name |
| `issuing_ministry` | String |
| `notification_date` | Date, nullable if unverified |
| `notification_ref` | Required when `evidence_level=cited` |
| `is_mandatory` | Boolean |
| `certification_scheme` | `ISI`, `CRS`, `HALLMARK`, `NONE` |
| `evidence_level` | `cited` or `unverified` |
| `source_url` | Required when `cited` |

---

## API contract

Base path `/api/v1`. JSON only.

### `POST /recommend`

Request:

```json
{
  "description": "string",
  "language": "en",
  "source": "dashboard"
}
```

`language` is a BCP-47-style tag the app actually supports: `en`, `hi`, `ta`, `te`, `mr`, `bn`. `source` is `dashboard` or `extension`.

Response (shape):

```json
{
  "translation_mode": "english_input",
  "extraction_mode": "rules",
  "english_text": "...",
  "explicit_codes": ["IS 456"],
  "warnings": [],
  "matches": [
    {
      "is_code": "IS 456",
      "title": "...",
      "status": "ACTIVE",
      "latest_revision_year": 2000,
      "successor_is_code": null,
      "distance": 0.21,
      "alerts": [],
      "qco": null,
      "normative_references": []
    }
  ]
}
```

`alerts` values used by the UI: `MANDATORY_COMPLIANCE` (only if a QCO row exists and `evidence_level=cited` and `is_mandatory=true`), `UNVERIFIED_QCO`, `LATEST_VERSION_ALERT`.

Top matches: at most 5.

### `GET /standards/{is_code}`

Path segment is URL-encoded (`IS%20456`, `IS%2013252%20(Part%201)`). Returns the standard, QCOs, and one-hop normative references. `404` if missing.

### `POST /translate`

`{ "text": "...", "source_lang": "hi", "target_lang": "en" }`. Same mode rules as the pipeline. `target_lang` other than `en` is allowed only for explanatory prose and uses Bhashini when configured; otherwise `501` with a clear detail string.

### `POST /documents`

Multipart file, PDF only, max 10 MB. Returns `{ "text": "..." }`. Scanned image-only PDFs return `422` with a message to paste text.

### `GET /health`

Returns `{ "status": "ok", "embedding_model": "all-MiniLM-L6-v2", "db": "ok" }`.

---

## Seed corpus (Phase 1 minimum)

Keep the set small and honest. Suggested anchors (confirm year and status while seeding; leave year null rather than guessing):

| Code | Role in the demo |
| --- | --- |
| Fire-door specification actually titled for fire-check doors (IS 3614 series, with part) | Primary match for hospital fire doors |
| One real test-method or installation code named inside that standard’s own reference list, if the title is known | Normative child |
| `IS 1382` | Glass glossary only. No edge to the fire-door standard |
| `IS 456` | Concrete code of practice. No QCO |
| `IS 13252 (Part 1)` | Electronics safety / CRS example, evidence fields required |
| `IS 14489` | OSH audit code of practice. No product QCO |
| One superseded code in the same family as a live code | Revision-alert demo, with `successor_is_code` |

Add further civil, electrical, and mechanical titles only as paraphrased public catalogue entries. Target **30–60** rows, not 21,000. The UI copy must say the demo covers a curated set.

---

## Repository layout

```
backend/
  app/
    api/v1/endpoints/recommend.py
    api/v1/endpoints/standards.py
    api/v1/endpoints/translate.py
    api/v1/endpoints/documents.py
    api/v1/router.py
    core/config.py
    core/database.py
    models/standard.py
    models/qco.py
    services/ai_service.py
    services/bhashini_service.py
    services/embedding_service.py
    services/rule_engine.py
    data/demo_phrases.json
    main.py
  seed_data.py
  requirements.txt
  Dockerfile
frontend/
  src/components/DocumentUploader.jsx
  src/components/RecommendationCard.jsx
  src/components/StandardDetailModal.jsx
  src/components/LanguageSelector.jsx
  src/components/QCOBadge.jsx
  src/pages/Dashboard.jsx
  src/pages/StandardSearch.jsx
  src/services/api.js
  src/App.jsx
  src/main.jsx
  package.json
  Dockerfile
extension/
  manifest.json
  content.js
  background.js
  popup/popup.html
  popup/popup.js
  sidebar/sidebar.html
  sidebar/sidebar.js
  sidebar/sidebar.css
  demo/gem-mock.html
docker-compose.yml
docs/Blueprint.md
README.md
```

`README.md` is written in Phase 5: how to start Compose, load the extension unpacked, and run the three tenders.

---

## Phase 1 — Database and seed

**Goal:** Postgres with pgvector, SQLAlchemy models, idempotent seed.

**Build**

- `docker-compose.yml` may contain only Postgres in this phase, **or** a one-off `pgvector/pgvector:pg16` container documented in the phase notes. Full Compose of all services is Phase 5. Prefer adding the Postgres service now so later phases reuse it.
- Models match the data model above.
- `seed_data.py` reads a JSON catalogue, embeds with the local model, and upserts on `is_code`. Running it twice does not duplicate rows.
- Config via environment: `DATABASE_URL`. No secrets in git.

**Acceptance**

- `SELECT count(*) FROM standards` equals the JSON catalogue.
- Every `embedding` has 384 dimensions.
- A fire-door query’s nearest row is the fire-door standard (manual SQL or a tiny script is enough).
- No normative row links IS 1382 to the fire-door standard.
- `IS 456` has zero QCO rows.
- Cited QCO rows have `notification_ref` and `source_url`.

**Out of scope:** HTTP API, React, extension.

**Outcome:** 35 standards in `backend/app/data/standards_seed.json`. Postgres is `pgvector/pgvector:pg16` on host port **5433** (5432 was already in use). `DATABASE_URL` default matches that port. Seed command: `backend/.venv/Scripts/python.exe seed_data.py` after `docker compose up -d`.

---

## Phase 2 — FastAPI

**Goal:** the contract in this blueprint, including fallbacks.

**Build**

- App factory, CORS, `/health`, router.
- Services: embeddings, rules, optional LLM, optional Bhashini.
- Endpoints: recommend, standards, translate, documents.
- Request validation with Pydantic. Errors use HTTP status codes and a `detail` string.
- Log `translation_mode` and `extraction_mode`. Do not log full tender text at info level.

**Acceptance**

- The three demo descriptions return the expected primary code with the API key unset.
- A Hindi phrase from `demo_phrases.json` sets `translation_mode=demo_map` and still matches.
- An unknown Hindi sentence sets `translation_mode=untranslated` and does not 500.
- Pasting a withdrawn seeded code returns `LATEST_VERSION_ALERT`.
- PDF upload of a text PDF returns text; a non-PDF returns `415`.
- `/docs` loads.

**Out of scope:** pixel-perfect UI, extension.

**Outcome:** FastAPI on `http://127.0.0.1:8000`. Run `backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000` from `backend/`. Optional LLM and Bhashini stay off unless env vars are set. Demo Hindi cement phrase lives in `backend/app/data/demo_phrases.json`.

---

## Phase 3 — React dashboard

**Goal:** an officer can paste text or upload a text PDF and read the compliance result.

**Build**

- Dashboard: language select, textarea, PDF drop zone, results.
- `QCOBadge`: cited mandatory → strong “QCO mandatory” state; unverified → “Unverified — confirm the gazette”; no row → no mandatory badge.
- Revision banner when `LATEST_VERSION_ALERT` is present.
- Normative list (one and two hops already flattened by the API).
- Detail modal from `GET /standards/{is_code}`.
- Standard search page: lookup by code.
- Export: browser print stylesheet **or** a client-side PDF of the summary. Include the gazette confirmation sentence and the list of codes. Do not imply the PDF is a BIS publication.

**Acceptance**

- Demo tender 1, 2, and 3 from the running API.
- Empty submit shows a validation message.
- API down shows an error state, not a blank page.
- Badge rules match the three QCO cases (cited, unverified, absent).

**Out of scope:** voice, `.docx`, live GeM.

**Outcome:** Vite app at `frontend/`. `npm run dev` serves `http://localhost:5173`. API base is `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`). Statutory ledger UI; print export is a working summary, not a BIS publication.

---

## Phase 4 — Extension and mock portal

**Goal:** from the mock tender page, select a match and insert a clause into the spec field.

**Build**

- Manifest V3, side panel, content script, popup that shows API base URL (editable, default `http://localhost:8000`).
- Side panel calls `POST /recommend` and lists matches.
- “Insert into tender” writes the clause into the focused field on the mock page.
- `extension/demo/gem-mock.html` with a technical-specification textarea and a Hindi sample button that fills a demo phrase.

**Acceptance**

- Unpacked extension loads with no errors.
- Mock page → assistant → fire-door description → insert → textarea contains the IS code and the confirmation sentence.
- Insert does nothing (and says why) when no field is focused.

**Out of scope:** a guaranteed selector for production GeM. Government hosts stay in the manifest so a manual trial is possible; they are not the acceptance test.

---

## Phase 5 — Demo packaging

**Goal:** `docker compose up --build` brings up Postgres, API, and the dashboard. Seed runs as a one-shot or API startup command that is safe to repeat.

**Build**

- Dockerfiles for API (model downloaded during image build) and frontend (static build served by nginx, `/api` proxied to the API).
- `.env.example` with empty optional keys: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_PIPELINE_ID`.
- README: prerequisites, compose, seed, extension load, three demo scripts, and the curated-corpus limitation.

**Acceptance**

- Fresh compose, no API keys, all three tenders succeed through the dashboard.
- Second `docker compose up` does not duplicate standards.
- `/health` reports `db=ok` and the MiniLM model name.

---

## Engineering rules that apply in every phase

- Python 3.11+. Type hints on public functions. Ruff-friendly format if a formatter is added; do not block a phase on tooling setup.
- No secrets, gazette PDFs, or full standard texts in git.
- New IS or QCO facts get evidence fields. Unknown year → `null`.
- Recommendation responses stay deterministic for the same seed and the same non-LLM path.
- Keep endpoints and UI labels aligned with this blueprint (`scope_summary`, `evidence_level`, alert names).

---

## Demo script (for README later)

1. Start the stack. Open the dashboard. Paste a hospital fire-door specification in English. Show the primary code, normative children, and the absence of a fake glass-glossary link.
2. Switch language to Hindi and submit a mapped demo sentence for cement concrete. Show `IS 456` and no QCO badge.
3. Submit an IT equipment line. Show CRS only if that row is `cited`.
4. Open the mock GeM page with the extension. Insert the fire-door clause.
5. Paste a withdrawn code from the seed. Show the revision alert and successor.
