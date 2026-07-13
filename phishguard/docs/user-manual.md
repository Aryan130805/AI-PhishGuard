# PhishGuard User Manual

This manual provides walkthroughs of the core features and user flows for both the Administrator and Employee portals.

---

## 1. Administrator Portal

Administrators manage simulated phishing campaigns, analyze organizational security risks, verify template pools, and generate executive summaries.

### Accessing the Portal
1. Navigate to the login screen and choose the **Admin Login** option.
2. Log in using the admin seed account:
   - Email: `admin@demo.com`
   - Password: `adminpassword123`

### Flow A: Creating and Scheduling a Campaign
1. **Define Campaign Settings**: Navigate to **Campaigns** from the sidebar. Click **Create Campaign**. Choose a name, theme (e.g., "IT Support"), target department, and difficulty tier.
2. **Review AI Email Templates**: Use the template selector to select generated email templates or review automated copy. Click **Save Draft**.
3. **Schedule Dispatch**: Click **Schedule** on the draft campaign. Input a future date/time. The system automatically schedules the Celery dispatcher task and alerts employees.
4. **Trigger Simulations**: Under the hood, employees receive customized emails containing tracking links.

### Flow B: Analytics Dashboard and Heatmaps
1. **Aggregated Performance Metrics**: The main **Dashboard** presents high-level statistics: Organization Risk Score, click rates, report rates, and monthly trend line charts.
2. **Heatmap Grid**: Navigate to the **Risk Heatmap** page. Filter by department or date range. The system renders an interactive grid where cells are colored green-to-red based on the average risk scores, click rates, or reporting rates. Hovering over a cell displays details.
3. **Identify Critical Areas**: Easily detect which departments (e.g., Sales) show high susceptibility to specific email templates.

### Flow C: Generating Executive PDF Reports
1. **Compile Narrative Report**: Navigate to **Executive Reports**. Click **Generate Report**. Select the report scope (e.g., organization-wide, past 30 days).
2. **Celery Background Generation**: The system schedules a Celery task that performs SQL aggregations, draws charts using Matplotlib, queries the AI engine for narration/recommendations, and outputs a formatted PDF using WeasyPrint.
3. **Download**: Once the report is generated, click **Download** to obtain the official document.

---

## 2. Employee Portal

Employees complete training assignments, take interactive quizzes, download certificates, and report phishing attempts.

### Accessing the Portal
1. Select **Employee Login** on the login screen.
2. Log in with a seeded employee account:
   - Email: `alice.smith@demo.com`
   - Password: `employeepassword123`

### Flow A: In-App Notifications
1. **Alert Bell**: Review notifications in the top navbar. You will receive notifications when:
   - A new campaign simulation is scheduled.
   - A new training lesson is assigned to you.
   - A certificate is issued to you.
   - Your risk score falls below the threshold (high-risk flag).

### Flow B: Completing Assigned Lessons
1. **View Training Path**: Navigate to **Lessons**. Locate the assigned module (e.g., "Phishing Basics").
2. **Interactive Content**: Read the instructions detailing email headers, spoofed links, and sender address verification.
3. **Take the Quiz**: Click **Start Quiz**. Answer multiple-choice questions. A score of 70% or higher is required to pass.
4. **Adaptive Learning**: Upon passing, the system dynamically promotes your suggested next difficulty level, and your compliance progress is updated.

### Flow C: Downloading Certificates
1. **Achievement List**: Navigate to **Certificates**.
2. **Verification PDF**: Locate your completed lesson and click **Download Certificate**. This downloads a compiled PDF proving module completion.

### Flow D: Reporting Phishing Attempts
1. **Extension Drill Detection**: When loading simulated landing page links, the Chrome/Edge browser extension verifies the drill context.
2. **Report Link**: Click **Report Email** on the extension banner or UI client. This registers a reported event in the database, reducing your personal risk score and improving department metrics.
