// background.js - service worker for PhishGuard Simulator Assistant

function pollStatus() {
  chrome.storage.local.get(["jwt_token", "user_status"], (data) => {
    if (!data.jwt_token) {
      console.log("[PhishGuard background] No JWT found, skipping polling.");
      return;
    }
    
    fetch("http://localhost:8000/extension/user-status", {
      headers: {
        "Authorization": `Bearer ${data.jwt_token}`
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error("HTTP error " + res.status);
      }
      return res.json();
    })
    .then(status => {
      console.log("[PhishGuard background] User status polled successfully:", status);
      
      const oldLessons = data.user_status ? data.user_status.unread_lessons : 0;
      if (status.unread_lessons > oldLessons) {
        chrome.notifications.create("new_lesson_" + Date.now(), {
          type: "basic",
          iconUrl: "icon.png",
          title: "New Security Lesson",
          message: `You have ${status.unread_lessons} unread security awareness training lessons assigned.`,
          priority: 2
        });
      }
      
      chrome.storage.local.set({ 
        user_status: status,
        last_polled: Date.now()
      });
    })
    .catch(err => {
      console.error("[PhishGuard background] Error polling user status:", err);
    });
  });
}

// Set up polling interval
let pollInterval = setInterval(pollStatus, 60000); // Check every minute

chrome.runtime.onInstalled.addListener(() => {
  console.log("[PhishGuard background] Extension installed.");
  pollStatus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[PhishGuard background] Extension startup.");
  pollStatus();
  // Re-establish interval
  clearInterval(pollInterval);
  pollInterval = setInterval(pollStatus, 60000);
});

// Refresh status on tab navigations to keep token cache extremely fresh
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    pollStatus();
  }
});

// Message listener for proxying API requests and manual polling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reportPhish") {
    fetch("http://localhost:8000/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: request.token })
    })
    .then(res => {
      if (res.ok) {
        return res.json().then(data => sendResponse({ success: true, data }));
      } else {
        return res.text().then(text => sendResponse({ success: false, error: text }));
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === "triggerPoll") {
    pollStatus();
    sendResponse({ success: true });
    return false;
  }
});
