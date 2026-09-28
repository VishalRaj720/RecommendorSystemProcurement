const GAZETTE_SENTENCE =
  "Dataset status is not a gazette. Confirm before publishing the tender.";

const descriptionEl = document.getElementById("description");
const languageEl = document.getElementById("language");
const resultsEl = document.getElementById("results");
const errorEl = document.getElementById("error");
const focusHint = document.getElementById("focus-hint");

let lastPayload = null;

function showError(message) {
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

async function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBaseUrl"], (data) => {
      resolve((data.apiBaseUrl || "http://127.0.0.1:8000").replace(/\/$/, ""));
    });
  });
}

function formatApiError(base, response, detail) {
  if (response.status === 404) {
    return (
      `Not Found at ${base}/api/v1/recommend. ` +
      "Set the extension API URL to the FastAPI server (http://127.0.0.1:8000), " +
      "not the mock GeM page port (8080). Open the extension toolbar icon → Save."
    );
  }
  if (response.status === 0 || detail === "Failed to fetch") {
    return `Cannot reach ${base}. Start uvicorn on port 8000 and check the popup API URL.`;
  }
  return `${detail} (${response.status} @ ${base})`;
}

async function checkHealth() {
  const base = await getApiBase();
  try {
    const response = await fetch(`${base}/health`);
    if (!response.ok) {
      return { ok: false, base, message: formatApiError(base, response, "Health check failed") };
    }
    const body = await response.json();
    return { ok: true, base, body };
  } catch {
    return {
      ok: false,
      base,
      message: `Cannot reach ${base}. Use http://127.0.0.1:8000 when the API is running locally.`,
    };
  }
}

async function recommend(text, language) {
  const base = await getApiBase();
  const response = await fetch(`${base}/api/v1/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: text,
      language,
      source: "extension",
    }),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(formatApiError(base, response, detail));
  }
  return response.json();
}

function badgeFor(match) {
  if (match.alerts?.includes("MANDATORY_COMPLIANCE")) {
    return '<span class="badge mandatory">[ QCO gazette mandatory ]</span>';
  }
  if (match.alerts?.includes("UNVERIFIED_QCO") || match.qco?.evidence_level === "unverified") {
    return '<span class="badge unverified">[ Unverified — confirm the gazette ]</span>';
  }
  return "";
}

function buildClause(match) {
  const year = match.latest_revision_year ? ` (${match.latest_revision_year})` : "";
  return [
    `Indian Standard: ${match.is_code}${year} — ${match.title}.`,
    GAZETTE_SENTENCE,
  ].join(" ");
}

function renderMatches(payload) {
  lastPayload = payload;
  if (!payload.matches?.length) {
    resultsEl.innerHTML = "<p class=\"hint\">No catalogue matches returned.</p>";
    return;
  }
  resultsEl.innerHTML = payload.matches
    .map((match, index) => {
      return `
        <article class="match" data-index="${index}">
          <div class="meta">Match ${String(index + 1).padStart(2, "0")}</div>
          <code>${match.is_code}</code>
          ${badgeFor(match)}
          <h3>${match.title}</h3>
          <p class="meta">${match.status}${match.latest_revision_year ? ` · ${match.latest_revision_year}` : ""}</p>
          ${
            match.alerts?.includes("LATEST_VERSION_ALERT") && match.successor_is_code
              ? `<p class="meta">Successor → ${match.successor_is_code}</p>`
              : ""
          }
          <div class="row" style="margin-top:8px">
            <button type="button" class="insert" data-index="${index}">Insert into tender</button>
          </div>
        </article>
      `;
    })
    .join("");

  resultsEl.querySelectorAll(".insert").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-index"));
      const match = lastPayload?.matches?.[index];
      if (!match) return;
      insertClause(buildClause(match));
    });
  });
}

async function insertClause(clause) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError("No active tab.");
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "INSERT_CLAUSE", clause }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Reload the tender page after installing the extension.");
      return;
    }
    if (!response?.ok) {
      showError("Click inside the specification field on the page, then insert again.");
      return;
    }
    showError("");
  });
}

async function refreshFocusHint() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "PING_FIELD" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      focusHint.textContent = "Open a supported tender page (mock GeM or localhost).";
      return;
    }
    focusHint.textContent = response.hasFocus
      ? "Specification field is focused. Insert is ready."
      : "Click inside the technical specification field before inserting.";
  });
}

document.getElementById("audit").addEventListener("click", async () => {
  const text = descriptionEl.value.trim();
  if (!text) {
    showError("Enter a specification excerpt to audit.");
    return;
  }
  showError("");
  resultsEl.innerHTML = "<p class=\"hint\">Auditing…</p>";
  try {
    const payload = await recommend(text, languageEl.value);
    renderMatches(payload);
  } catch (error) {
    resultsEl.innerHTML = "";
    showError(error.message || "Audit failed. Check API URL in the extension popup.");
  }
});

document.getElementById("sync").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "READ_FIELD" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      showError("Could not read the field. Focus the specification textarea on the page.");
      return;
    }
    if (response.text) descriptionEl.value = response.text;
  });
});

async function refreshApiStatus() {
  const status = await checkHealth();
  const apiLine = document.getElementById("api-status");
  if (!apiLine) return;
  if (status.ok) {
    apiLine.textContent = `API ${status.base} · ${status.body.embedding_model} · db ${status.body.db}`;
    apiLine.classList.remove("error");
  } else {
    apiLine.textContent = status.message;
    apiLine.classList.add("error");
  }
}

setInterval(refreshFocusHint, 2000);
refreshFocusHint();
refreshApiStatus();
