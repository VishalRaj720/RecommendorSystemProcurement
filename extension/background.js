const DEFAULT_API = "http://127.0.0.1:8000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["apiBaseUrl"], (data) => {
    if (!data.apiBaseUrl) {
      chrome.storage.sync.set({ apiBaseUrl: DEFAULT_API });
    }
  });
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL" && sender.tab?.id != null) {
    chrome.sidePanel
      .open({ tabId: sender.tab.id })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message.type === "GET_API_BASE") {
    chrome.storage.sync.get(["apiBaseUrl"], (data) => {
      sendResponse({ apiBaseUrl: data.apiBaseUrl || DEFAULT_API });
    });
    return true;
  }
  return false;
});
