const DEFAULT_API = "http://127.0.0.1:8000";
const input = document.getElementById("api");
const status = document.getElementById("status");

chrome.storage.sync.get(["apiBaseUrl"], (data) => {
  input.value = data.apiBaseUrl || DEFAULT_API;
});

document.getElementById("save").addEventListener("click", () => {
  const value = input.value.trim().replace(/\/$/, "") || DEFAULT_API;
  chrome.storage.sync.set({ apiBaseUrl: value }, () => {
    status.textContent = "Saved.";
  });
});
