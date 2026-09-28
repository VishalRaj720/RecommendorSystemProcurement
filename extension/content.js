let lastFocusedField = null;

function isEditableField(node) {
  if (!node) return false;
  if (node.tagName === "TEXTAREA") return true;
  if (node.tagName === "INPUT") {
    const type = (node.getAttribute("type") || "text").toLowerCase();
    return ["text", "search", "url", "tel", "email"].includes(type);
  }
  return node.isContentEditable;
}

document.addEventListener(
  "focusin",
  (event) => {
    if (isEditableField(event.target)) {
      lastFocusedField = event.target;
    }
  },
  true,
);

function showToast(message) {
  const toast = document.getElementById("bis-assistant-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 5000);
}

function appendClause(field, clause) {
  const block = clause.trim();
  const existing = field.tagName === "TEXTAREA" || field.tagName === "INPUT" ? field.value : field.innerText;
  const separator = existing && !existing.endsWith("\n") ? "\n\n" : existing ? "\n" : "";
  const next = `${existing}${separator}${block}`;
  if (field.tagName === "TEXTAREA" || field.tagName === "INPUT") {
    field.value = next;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    field.innerText = next;
  }
  field.focus();
}

function mountUi() {
  if (document.getElementById("bis-assistant-launcher")) return;

  const toast = document.createElement("div");
  toast.id = "bis-assistant-toast";
  document.body.appendChild(toast);

  const button = document.createElement("button");
  button.id = "bis-assistant-launcher";
  button.type = "button";
  button.textContent = "BIS Assistant";
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        showToast("Could not open the assistant panel.");
      }
    });
  });
  document.body.appendChild(button);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INSERT_CLAUSE") {
    const field = lastFocusedField;
    if (!field || !isEditableField(field)) {
      showToast("Click inside the technical specification field first, then insert.");
      sendResponse({ ok: false, reason: "no_focus" });
      return true;
    }
    appendClause(field, message.clause || "");
    showToast("Clause inserted into the focused field.");
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "PING_FIELD") {
    sendResponse({
      ok: true,
      hasFocus: Boolean(lastFocusedField && isEditableField(lastFocusedField)),
    });
    return true;
  }
  if (message.type === "READ_FIELD") {
    const field =
      (lastFocusedField && isEditableField(lastFocusedField) ? lastFocusedField : null) ||
      document.querySelector("[data-bis-spec]");
    if (!field) {
      sendResponse({ ok: false, text: "" });
      return true;
    }
    const text =
      field.tagName === "TEXTAREA" || field.tagName === "INPUT" ? field.value : field.innerText;
    sendResponse({ ok: true, text });
    return true;
  }
  return false;
});

mountUi();
