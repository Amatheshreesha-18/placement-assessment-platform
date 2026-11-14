# Placement Assistance and Readiness Platform — API Documentation
**Base URL:** `/api/v1`  
**Version:** 1.0.0  
**Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. System & Health Check

### Health Check
* **Endpoint:** `GET /api/v1/health`
* **Access:** Public
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Placement Assistance API is healthy and operational",
  "data": {
    "status": "healthy",
    "uptime": 124,
    "timestamp": "2026-11-14T05:00:00.000Z",
    "version": "1.0.0",
    "service": "Placement Assistance and Readiness Platform Backend"
  },
  "timestamp": "2026-11-14T05:00:00.000Z"
}
```

---

## 2. Authentication (`/api/v1/auth`)

### 2.1 Register
* **Endpoint:** `POST /api/v1/auth/register`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "student@college.edu",
  "password": "Password123!",
  "full_name": "John Doe",
  "role": "student"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. You may now log in.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@college.edu",
      "full_name": "John Doe",
      "role": "student"
    }
  }
}
```

### 2.2 Login
* **Endpoint:** `POST /api/v1/auth/login`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "student@college.edu",
  "password": "Password123!"
}
```
* **Response (200 OK):** Returns user details and session JWT `token`.

### 2.3 Get Current User Profile
* **Endpoint:** `GET /api/v1/auth/me`
* **Access:** Authenticated (Bearer Token)
* **Response (200 OK):** Current verified user and profile data.

---

## 3. Student Profile & Management (`/api/v1/students`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/students` | TPO | List students with search (`search`), branch (`department`), and `min_cgpa` |
| `GET` | `/api/v1/students/profile` | Student | Get authenticated student's profile, skills, projects, and completion % |
| `GET` | `/api/v1/students/profile/:id` | TPO | Get any student's profile by ID |
| `PUT` | `/api/v1/students/profile` | Student | Update academic and personal details |
| `GET` | `/api/v1/students/profile/completion` | Student | Get completion percentage and missing profile fields |
| `GET` | `/api/v1/students/skills` | Student | Retrieve student skills |
| `POST` | `/api/v1/students/skills` | Student | Add a new skill (`skill_name`, `proficiency_level`) |
| `DELETE` | `/api/v1/students/skills/:id` | Student | Remove a skill |
| `GET` | `/api/v1/students/projects` | Student | Retrieve student projects |
| `POST` | `/api/v1/students/projects` | Student | Add a project (`title`, `description`, `tech_stack`, `github_link`, `live_link`) |
| `DELETE` | `/api/v1/students/projects/:id` | Student | Remove a project |
| `GET` | `/api/v1/students/certifications` | Student | Retrieve student certifications |
| `POST` | `/api/v1/students/certifications` | Student | Add certification (`title`, `issuer`, `issue_date`, `credential_url`) |
| `DELETE` | `/api/v1/students/certifications/:id` | Student | Remove a certification |

---

## 4. Placement Preparation Hub (`/api/v1/resources`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/resources` | Any | List learning resources with `category`, `difficulty`, and `search` |
| `GET` | `/api/v1/resources/:id` | Any | Get single resource details |
| `GET` | `/api/v1/resources/progress/summary` | Student | Overall preparation percentage & topic-wise completion stats |
| `PUT` | `/api/v1/resources/:id/progress` | Student | Mark resource as completed or incomplete (`{ "is_completed": true }`) |
| `POST` | `/api/v1/resources` | TPO | Create a new learning resource |
| `DELETE` | `/api/v1/resources/:id` | TPO | Delete a resource |

---

## 5. Online Assessments & Performance Tracking (`/api/v1/assessments`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/assessments` | Any | List available active assessments |
| `GET` | `/api/v1/assessments/:id` | Any | Assessment details and total questions count |
| `POST` | `/api/v1/assessments/:id/start` | Student | Start timed attempt or resume active attempt |
| `GET` | `/api/v1/assessments/attempts/:attemptId/questions` | Student | Fetch questions for active attempt (answers omitted) |
| `POST` | `/api/v1/assessments/attempts/submit` | Student | Submit attempt answers and compute score server-side |
| `GET` | `/api/v1/assessments/attempts/:attemptId/result` | Student/TPO | Retrieve score, percentage, and detailed answers |
| `GET` | `/api/v1/assessments/history` | Student | Retrieve student's assessment attempt history |
| `POST` | `/api/v1/assessments` | TPO | Create new assessment |
| `POST` | `/api/v1/assessments/questions` | TPO | Add MCQ question with options A, B, C, D and correct option |

---

## 6. Resume Management (`/api/v1/resumes`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/resumes` | Student | List student resumes |
| `GET` | `/api/v1/resumes/:id` | Student/TPO | Retrieve resume metadata and signed download URL |
| `POST` | `/api/v1/resumes` | Student | Create structured resume metadata (template builder) |
| `PUT` | `/api/v1/resumes/:id` | Student | Update structured resume metadata |
| `POST` | `/api/v1/resumes/upload` | Student | Upload PDF resume to Supabase Storage (max 5MB) |
| `PUT` | `/api/v1/resumes/:id/upload` | Student | Replace existing resume PDF in storage |
| `DELETE` | `/api/v1/resumes/:id` | Student | Delete resume record and stored file |

---

## 7. Company & Placement Opportunities (`/api/v1/companies`, `/api/v1/placements`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/companies` | Any | List partner companies |
| `GET` | `/api/v1/companies/:id` | Any | Get company details and posted opportunities |
| `POST` | `/api/v1/companies` | TPO | Create company profile |
| `PUT` | `/api/v1/companies/:id` | TPO | Update company details |
| `GET` | `/api/v1/placements` | Any | List placement opportunities (`branch`, `role`, `status`) |
| `GET` | `/api/v1/placements/:id` | Any | Get detailed opportunity information |
| `POST` | `/api/v1/placements` | TPO | Publish placement opportunity |
| `PUT` | `/api/v1/placements/:id` | TPO | Update placement opportunity |
| `PATCH` | `/api/v1/placements/:id/close` | TPO | Close placement opportunity |

---

## 8. Eligibility & Applications (`/api/v1/applications`)

* **Headers:** `Authorization: Bearer <token>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/applications/check-eligibility/:opportunityId` | Student | Deterministic eligibility check (`is_eligible`, `reasons`, `missing_skills`) |
| `POST` | `/api/v1/applications/apply` | Student | Apply for opportunity (prevents duplicates, checks eligibility) |
| `GET` | `/api/v1/applications/my-applications` | Student | List authenticated student's placement applications |
| `GET` | `/api/v1/applications` | TPO | List all student applications with filters |
| `GET` | `/api/v1/applications/opportunity/:opportunityId` | TPO | List applications for a specific placement drive |
| `PATCH` | `/api/v1/applications/:id/status` | TPO | Update application status (`applied`, `under_review`, `shortlisted`, `selected`, `rejected`) |
