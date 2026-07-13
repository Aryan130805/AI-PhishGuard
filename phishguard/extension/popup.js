// popup.js - Controller for extension login and status dashboard

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const submitBtn = document.getElementById('submitBtn');
  
  const userEmailSpan = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const riskLevelBadge = document.getElementById('riskLevelBadge');
  const riskScoreValue = document.getElementById('riskScoreValue');
  const lessonsCount = document.getElementById('lessonsCount');
  
  const syncBtn = document.getElementById('syncBtn');
  const connectionState = document.getElementById('connectionState');

  function checkAuthState() {
    chrome.storage.local.get(["jwt_token", "user_email", "user_status"], (data) => {
      if (data.jwt_token) {
        // Logged In
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        userEmailSpan.innerText = data.user_email || 'Employee Account';
        connectionState.innerText = "Shield Protection Active";
        connectionState.style.color = "#10b981"; // Emerald
        
        if (data.user_status) {
          renderDashboard(data.user_status);
        } else {
          // Trigger immediate poll
          chrome.runtime.sendMessage({ action: "triggerPoll" }, () => {
            setTimeout(refreshDisplay, 500);
          });
        }
      } else {
        // Logged Out
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        connectionState.innerText = "Logged Out — Protection Inactive";
        connectionState.style.color = "#9ca3af";
      }
    });
  }

  function renderDashboard(status) {
    // 1. Risk Level
    const level = (status.risk_level || 'safe').toLowerCase();
    riskLevelBadge.innerText = level.toUpperCase();
    riskLevelBadge.className = `status-badge ${level}`;
    
    // 2. Risk Score
    riskScoreValue.innerText = Number(status.risk_score || 0).toFixed(1);
    
    // 3. Lessons
    const count = status.unread_lessons || 0;
    lessonsCount.innerText = `${count} unread module${count !== 1 ? 's' : ''}`;
  }

  function refreshDisplay() {
    chrome.storage.local.get("user_status", (data) => {
      if (data.user_status) {
        renderDashboard(data.user_status);
      }
    });
  }

  // 1. LOGIN SUBMIT HANDLER
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerText = "Connecting...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const body = await res.json();
        const token = body.access_token;
        
        // Save to chrome local storage
        chrome.storage.local.set({
          jwt_token: token,
          user_email: email
        }, () => {
          // Signal background worker to execute a status sweep immediately
          chrome.runtime.sendMessage({ action: "triggerPoll" }, () => {
            setTimeout(checkAuthState, 600);
          });
        });
      } else {
        loginError.innerText = "Invalid credentials. Try again.";
        loginError.classList.remove('hidden');
      }
    } catch (err) {
      loginError.innerText = "Connection failed. Is backend running?";
      loginError.classList.remove('hidden');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Log In & Enable Protection";
    }
  });

  // 2. LOGOUT HANDLER
  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(["jwt_token", "user_email", "user_status", "last_polled"], () => {
      checkAuthState();
    });
  });

  // 3. SYNC BUTTON
  syncBtn.addEventListener('click', () => {
    connectionState.innerText = "Syncing...";
    chrome.runtime.sendMessage({ action: "triggerPoll" }, () => {
      setTimeout(() => {
        refreshDisplay();
        connectionState.innerText = "Shield Protection Active";
      }, 500);
    });
  });

  // Trigger poll check immediately on popup open
  chrome.runtime.sendMessage({ action: "triggerPoll" }, () => {
    setTimeout(refreshDisplay, 300);
  });

  // Run initial view checks
  checkAuthState();
});
