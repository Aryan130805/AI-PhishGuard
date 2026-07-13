# PhishGuard Browser Assistant Extension (Manifest V3)

This browser extension runs in Manifest V3 to simulate phishing-awareness protections, detect active training campaign landing pages, and allow employees to flag simulations directly.

## How to Install (Unpacked)

1. Open your Google Chrome browser.
2. Navigate to the Extensions management page by entering `chrome://extensions/` in the address bar.
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click on the **Load unpacked** button in the top-left corner.
5. Select this `extension` directory (`d:\Project\phishguard\extension`) from the directory browser.
6. The PhishGuard extension is now active!

## How to Test the Setup

1. **Standalone Login**:
   - Click the extension icon in the Chrome toolbar.
   - Enter your sandbox user credentials (e.g., `admin@phishguard.local` / `AdminPass123!`) and click **Log In**.
   - Your active status, unread lessons, and safety risk score metrics will synchronize.

2. **Simulated Phishing Landing Page Checks**:
   - Access a simulated campaign landing page link delivered during a training campaign (e.g., `http://localhost:3000/simulated-landing/{tracking_token}`).
   - The content script compares the token against cached active campaign tokens.
   - An alert warning banner will slide into the top of the viewport: `"Suspicious Simulated Page — Reason: External Domain Redirection & Password Prompt Lure"`.
   - Click the **Report Simulation** button on the banner.
   - The button transitions to `"✓ Reported"`, logging a `reported` telemetry event back to the campaign dashboard.
