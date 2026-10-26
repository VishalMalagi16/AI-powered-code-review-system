# CodeGuard AI — Architecture Documentation

## 1. System Overview

CodeGuard AI is an enterprise-grade automated code review, static analysis, and security auditing web application. The platform provides real-time detection of syntax errors, runtime exceptions, high-entropy hardcoded secrets, injection vectors, and maintainability concerns.

```
+-------------------------------------------------------------------------+
|                               Frontend                                  |
|  React 18 + Vite + TypeScript + Tailwind CSS + Monaco Editor + Recharts |
+------------------------------------+------------------------------------+
                                     |
                          REST API (JSON / JWT)
                                     |
+------------------------------------+------------------------------------+
|                               Backend                                   |
|               FastAPI (Python 3.14) + Pydantic V2                       |
|   +-----------------------------------------------------------------+   |
|   |                       Analysis Pipeline                         |   |
|   |  - Static Analysis Engine (Python AST, JS/TS patterns, Regex)   |   |
|   |  - Secret Token & Credential Scanner (AWS, SSH, JWT, DB URIs)   |   |
|   |  - Complexity & Quality Score Metric Calculator                 |   |
|   |  - AI Remediation Engine (Google Gemini / OpenAI / Offline)     |   |
|   +-----------------------------------------------------------------+   |
+------------------------------------+------------------------------------+
                                     |
                 SQLAlchemy 2.0 ORM + Alembic Migrations
                                     |
+------------------------------------+------------------------------------+
|                               Databases                                 |
|            SQLite (Development) / PostgreSQL (Production)               |
+-------------------------------------------------------------------------+
```

## 2. Multi-Pass Analysis Pipeline

1. **Request Validation**: Sanitizes and enforces 500 KB payload bounds.
2. **Language Normalization**: Determines appropriate AST visitor and pattern set.
3. **AST Static Analysis**:
   - Python: uses standard `ast.parse` and custom `ast.NodeVisitor` classes.
   - JS/TS: lexical matching for dangerous DOM modifications (`innerHTML`), `eval`, `localStorage` token leakages.
4. **Secret Scanner**: High-entropy regex audits for cloud keys, database URLs, and cryptographic certificates.
5. **Quality Score Algorithm**:
   - Starts at 100 points.
   - Critical Severity: -25 pts
   - High Severity: -15 pts
   - Medium Severity: -8 pts
   - Low Severity: -3 pts
   - Informational: -1 pt
   - Deductions recalculated dynamically when findings are resolved or dismissed.
6. **AI Service**:
   - Sends sandboxed code blocks with explicit prompt injection prevention delimiters.
   - Returns strict JSON array of findings with code replacement diffs.
   - Graceful fallback: when external keys are not provided, operates transparently in offline demo mode without fabricating fake results.

## 3. Security Model

- **Zero Untrusted Execution**: Source code is parsed statically and never executed on the host server.
- **OWASP-Compliant Authentication**: Passwords hashed using PBKDF2-HMAC-SHA256 with 120,000 iterations and 32-byte cryptographic salts.
- **Stateless JWT Authorization**: Signed using HMAC-SHA256 with user-specific ownership isolation.
- **Server-Side AI Secrets**: All LLM API keys reside strictly on the server in `.env`.
