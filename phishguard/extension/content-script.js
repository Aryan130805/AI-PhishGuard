// content-script.js - Injects alert warning banner on active simulation pages

(function() {
  const currentUrl = window.location.href;
  const match = currentUrl.match(/\/simulated-landing\/([a-f0-9a-zA-Z]+)/);
  if (!match) return;
  
  const token = match[1];
  
  chrome.storage.local.get("user_status", (res) => {
    const status = res.user_status;
    const activeTokens = status ? status.active_simulated_domains : [];
    
    // Check if the current page's token matches our active training campaign tokens
    if (activeTokens.includes(token)) {
      injectWarningBanner(token);
    }
  });

  function injectWarningBanner(token) {
    if (document.getElementById("phishguard-warning-banner")) return;
    
    // Create banner container
    const banner = document.createElement("div");
    banner.id = "phishguard-warning-banner";
    
    // Styles
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.height = "48px";
    banner.style.backgroundColor = "#7f1d1d"; // Dark red
    banner.style.color = "#ffffff";
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.justify = "space-between";
    banner.style.padding = "0 20px";
    banner.style.zIndex = "2147483647"; // Max possible z-index to overlay safely
    banner.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    banner.style.fontSize = "13px";
    banner.style.fontWeight = "600";
    banner.style.borderBottom = "2px solid #ef4444";
    banner.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.3)";
    banner.style.boxSizing = "border-box";

    // Text label
    const textGroup = document.createElement("div");
    textGroup.style.display = "flex";
    textGroup.style.alignItems = "center";
    textGroup.style.gap = "8px";
    
    const icon = document.createElement("span");
    icon.innerText = "⚠";
    icon.style.fontSize = "16px";
    icon.style.color = "#f59e0b"; // Warning amber
    
    const text = document.createElement("span");
    text.innerText = "Suspicious Simulated Page — Reason: External Domain Redirection & Password Prompt Lure";
    
    textGroup.appendChild(icon);
    textGroup.appendChild(text);
    banner.appendChild(textGroup);

    // Button controls
    const button = document.createElement("button");
    button.innerText = "Report Simulation";
    button.style.backgroundColor = "#dc2626"; // Crimson
    button.style.color = "#ffffff";
    button.style.border = "none";
    button.style.padding = "6px 14px";
    button.style.fontSize = "12px";
    button.style.fontWeight = "700";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.transition = "all 0.2s ease";
    button.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";

    button.onmouseover = () => {
      button.style.backgroundColor = "#b91c1c";
    };
    button.onmouseout = () => {
      button.style.backgroundColor = "#dc2626";
    };

    button.onclick = () => {
      button.disabled = true;
      button.innerText = "Reporting...";
      
      chrome.runtime.sendMessage({ action: "reportPhish", token: token }, (response) => {
        if (response && response.success) {
          button.style.backgroundColor = "#059669"; // Emerald green
          button.innerText = "✓ Reported";
          button.style.cursor = "default";
          button.onmouseover = null;
          button.onmouseout = null;
        } else {
          button.disabled = false;
          button.style.backgroundColor = "#dc2626";
          button.innerText = "Report Failed (Retry)";
          console.error("Failed to submit phishing report:", response ? response.error : "No response");
        }
      });
    };

    banner.appendChild(button);
    
    // Inject at the very top of the body
    document.body.prepend(banner);
    
    // Add margin to the document body to prevent overlapping actual content
    document.body.style.marginTop = "48px";
  }
})();
