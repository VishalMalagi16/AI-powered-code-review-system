# CodeGuard AI — REST API Documentation

All API endpoints are prefixed with `/api/v1`. Interactive OpenAPI documentation is accessible at `/api/v1/docs`.

## Authentication Endpoints

### `POST /api/v1/auth/register`
Creates a new user account.
- **Request Body**: `{ "name": "...", "email": "...", "password": "..." }`
- **Response**: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

### `POST /api/v1/auth/login`
Authenticates user credentials.
- **Request Body**: `{ "email": "...", "password": "..." }`
- **Response**: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

### `GET /api/v1/auth/me`
Retrieves currently authenticated user profile.
- **Headers**: `Authorization: Bearer <token>`

### `PUT /api/v1/auth/profile`
Updates user name or preferences.

---

## Review Endpoints

### `POST /api/v1/reviews`
Submits source code for static AST analysis and AI remediation.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Authentication Service Audit",
  "language": "python",
  "source_code": "def run(x=[]):\n    eval(x)\n",
  "enable_ai": true,
  "enable_security": true,
  "enable_performance": true,
  "enable_style": true,
  "enable_bugs": true
}
```
- **Response**: Complete `Review` object with findings, quality score, and metrics.

### `GET /api/v1/reviews`
Retrieves paginated list of reviews for the authenticated user.
- **Query Parameters**:
  - `page`: default 1
  - `limit`: default 10
  - `language`: filter by language
  - `status`: filter by status
  - `search`: search review title

### `GET /api/v1/reviews/{id}`
Retrieves full details of a single review.

### `DELETE /api/v1/reviews/{id}`
Deletes a review record.

### `POST /api/v1/reviews/{id}/reanalyze`
Re-runs the analysis pipeline on the review's saved source code.

---

## Finding Endpoints

### `PATCH /api/v1/findings/{id}`
Updates finding status.
- **Request Body**: `{ "status": "resolved" | "dismissed" | "open" }`
- **Response**: Updated `Finding` object. Automatically recalculates parent review quality score.

---

## Analytics Endpoints

### `GET /api/v1/analytics/overview`
Retrieves aggregate review metrics, severity counts, and language distributions.

### `GET /api/v1/analytics/trends`
Retrieves historical trends over time for reviews and quality health.

---

## System Endpoints

### `GET /api/v1/health`
Health check endpoint reporting API status, database connectivity, and active AI engine.

### `GET /api/v1/languages`
Lists supported programming languages and analyzer capabilities.
