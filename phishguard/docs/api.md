# PhishGuard API Documentation

The PhishGuard API is a RESTful backend built with FastAPI, using OAuth2 cookie-based authentication and role-based access control (RBAC).

All api paths are prefixed with `/api` when routed through the production reverse proxy.
The live interactive OpenAPI documentation is accessible at `https://<domain>/api/docs` (Swagger UI) or `https://<domain>/api/redoc` (ReDoc).

---

## Key Endpoint Groups

### 1. Authentication (`/auth`)
Handles secure registration, credential verification, cookie-based session token provisioning, and token refreshment.

- **`POST /auth/register`**
  - **Access**: Public
  - **Description**: Registers a new administrator user along with their organization.
  - **Payload**: `UserRegister` (email, password, organization_name)
  - **Response**: `201 Created`

- **`POST /auth/login`**
  - **Access**: Public
  - **Description**: Authenticates user credentials. Returns JWT access and refresh tokens, and writes secure `httpOnly` cookies (`access_token` and `refresh_token`).
  - **Payload**: `UserLogin` (email, password)
  - **Response**: `TokenResponse` (access_token, refresh_token, token_type)

- **`POST /auth/refresh`**
  - **Access**: Public (requires valid cookie refresh token)
  - **Description**: Refreshes expired sessions and updates `httpOnly` access token cookies.
  - **Response**: `TokenRefreshResponse`

- **`POST /auth/logout`**
  - **Access**: Authenticated
  - **Description**: Clears `httpOnly` access and refresh session cookies.
  - **Response**: Success status message

---

### 2. Campaigns & Simulation Templates (`/campaigns`, `/templates`)
Allows administrators to manage custom campaigns, select themes/difficulty, schedule dispatches, and audit template pools.

- **`POST /campaigns/`**
  - **Access**: Admin Role
  - **Description**: Creates a campaign draft with target departments and templates.
  - **Payload**: `CampaignCreate` (name, theme, difficulty, language, department_id, template_ids)

- **`POST /campaigns/{id}/schedule`**
  - **Access**: Admin Role
  - **Description**: Schedules a simulation campaign and schedules dispatch, creating employee targets and sending scheduling notifications.
  - **Payload**: `CampaignSchedule` (scheduled_at datetime)

- **`POST /campaigns/{id}/pause`**
  - **Access**: Admin Role
  - **Description**: Pauses/completes an active simulation campaign.

---

### 3. Phishing Drill Tracking & Reporting (`/track`, `/report`)
Endpoints used to capture and record phishing drill telemetry (opens, clicks, credentials) and allow users to report phishing emails.

- **`GET /track/open/{token}`**
  - **Access**: Public (tracking pixel)
  - **Description**: Records that the email template was opened by the target employee.

- **`GET /track/click/{token}`**
  - **Access**: Public
  - **Description**: Records that the employee clicked a simulated phishing link, triggering Celery tasks to recompute the employee's risk score and queue educational modules. Redirects to landing page.

- **`POST /track/credentials/{token}`**
  - **Access**: Public
  - **Description**: Records that the employee submitted credentials on the landing page (logs event without storing the credentials themselves).

- **`POST /report`**
  - **Access**: Public / Extension
  - **Description**: Reports a suspicious drill event from the user client browser extension, marking the target drill as successfully reported (which improves risk scores).
  - **Payload**: `{"token": "tracking_token"}`

---

### 4. Training & Compliance Modules (`/training`, `/certificates`)
Administers security awareness assignments, interactive training quizzes, scoring logic, and PDF certificates.

- **`GET /training/lessons`**
  - **Access**: Authenticated (Employee/Admin)
  - **Description**: Retrieves all training modules assigned to the user.

- **`GET /training/quiz/{lesson_id}`**
  - **Access**: Authenticated
  - **Description**: Fetches quiz questions associated with the lesson module.

- **`POST /training/quiz/{lesson_id}/submit`**
  - **Access**: Authenticated
  - **Description**: Grades quiz answers (70% passing threshold). Generates a completion certificate and automatically adjusts suggested next difficulty if passed.
  - **Payload**: `{"answers": [correct_option_index_list]}`

- **`GET /certificates`**
  - **Access**: Authenticated
  - **Description**: Returns a list of all compliance certificates issued to the current employee.

- **`GET /certificates/{id}/download`**
  - **Access**: Authenticated
  - **Description**: Downloads the dynamically generated PDF certificate file.

---

### 5. Analytics & Dashboard Heatmaps (`/analytics`)
Aggregates performance parameters, mistake categories, historical department trends, and risk heat maps.

- **`GET /analytics/dashboard`**
  - **Access**: Admin Role
  - **Description**: Aggregates average risk score, overall click rates, reporting rates, and top mistake themes.

- **`GET /analytics/heatmap`**
  - **Access**: Admin Role
  - **Description**: Retrieves department-level risk details including average risk scores, click rates, and report rates filtered by department, campaign, and date ranges.

---

### 6. Executive Reports Generator (`/reports`)
Handles Celery background jobs to compile PDF narrative reports using SQLAlchemy aggregations and AI-generated reviews.

- **`POST /reports/generate`**
  - **Access**: Admin Role
  - **Description**: Triggers a background Celery task to generate an executive PDF report.
  - **Payload**: `{"type": "executive_summary", "date_range": "30d", "department_id": null}`

- **`GET /reports/download/{id}`**
  - **Access**: Admin Role
  - **Description**: Downloads the compiled PDF report.

---

### 7. Notifications (`/notifications`)
Retrieves internal alerts for user activities (e.g. lesson assignments, high-risk flags, campaign completions).

- **`GET /notifications`**
  - **Access**: Authenticated
  - **Description**: Fetches current user notifications, sorted newest first.

- **`POST /notifications/{id}/read`**
  - **Access**: Authenticated
  - **Description**: Marks a specific notification as read.

- **`POST /notifications/read-all`**
  - **Access**: Authenticated
  - **Description**: Marks all notifications as read.
