# CodeGuard AI — AI-Powered Code Review & Bug Detection System

[![CodeGuard AI](https://img.shields.io/badge/CodeGuard%20AI-v1.0.0-blue?style=for-the-badge&logo=shield)](https://github.com/VishalMalagi16/AI-powered-code-review-system)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React%2018-Vite%20TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13%20%7C%203.14-3776AB?style=for-the-badge&logo=python)](https://www.python.org)
[![Tests Passing](https://img.shields.io/badge/Tests-25%20Passed-brightgreen?style=for-the-badge&logo=pytest)](https://docs.pytest.org)

**CodeGuard AI** is an enterprise-grade automated code review, static analysis, performance optimization, and security auditing web application. It combines deterministic AST-based static analysis, high-entropy secret detection, performance complexity profiling, and deep LLM intelligence (Google Gemini & OpenAI GPT-4o) with **live, in-place code resolution directly in the Monaco Editor**.

---

## 🌟 Key Capabilities

### 1. Multi-Language Static & AST Analysis Engine
- **Python**: Deep AST traversal (`ast.NodeVisitor`), catching `eval()`, `exec()`, `os.system()`, `pickle.loads()`, mutable defaults (`def fn(x=[])`), bare `except: pass`, and intelligent syntax repair (missing `def`, missing `:`, `else if` -> `elif`).
- **JavaScript & TypeScript**: Cross-Site Scripting (DOM XSS via `innerHTML`), dynamic `new Function()`, sensitive tokens stored in `localStorage`, prototype pollution, legacy `var` declarations, and loose equality (`==` vs `===`).
- **Go (Golang)**: Shell injection in `exec.Command("sh", "-c")`, SQL injection via `fmt.Sprintf()`, goroutine data race loops, and ignored error returns (`val, _ := ...`).
- **Rust**: Raw pointer dereferencing in `unsafe` blocks without null guards, dangerous `.unwrap()` / `panic!()` in production, and command injection via `Command::new("sh")`.
- **Java**: SQL injection through string concatenation, command injection via `Runtime.getRuntime().exec()`, string reference equality bugs (`==` vs `.equals()`), and empty `catch` blocks.
- **C & C++**: Buffer overflows via `strcpy()` and `gets()`, unsafe `system()` calls, and unmanaged raw `malloc()` in modern C++.
- **Universal Secret Scanner**: Detects high-risk plaintext secrets including AWS Access Keys, GitHub Personal Access Tokens, Private SSH/RSA Keys, and hardcoded JWTs.

### 2. Live In-Place Code Resolution & Auto-Fixing
- **"Resolve & Apply Fix"**: Clicking resolve on any finding immediately replaces the problematic code lines in the Monaco editor with the clean, safe suggested code while preserving indentation.
- **"Apply All Fixes"**: One-click batch resolution that applies all auto-fixable repairs in reverse line order and brings the Quality Score to 100/100.
- **Monaco Inline Error Markers**: Compiler-grade red squiggly error underlines appear directly in the editor on the exact lines with tooltips explaining the root cause and remediation.

### 3. Performance & Optimization Profiling
- Detects $O(N^2)$ quadratic loops and nested iterations over collections.
- Flags string concatenation with `+=` inside loops (reallocations) across Python, Go, Java, and JavaScript $\rightarrow$ recommends `StringBuilder`, `strings.Builder`, or list `.append()` + `''.join()`.
- Catches unmanaged file descriptors $\rightarrow$ auto-refactors to `with open(...)` context managers.
- Identifies $O(N)$ list membership checks (`x in [1, 2, 3, 4, 5]`) and refactors to $O(1)$ set lookups (`x in {1, 2, 3, 4, 5}`).

### 4. Dual-Engine AI Integration
- Direct integration with **Google Gemini (`gemini-1.5-pro`)** and **OpenAI (`gpt-4o`)**.
- **Intelligent Offline Fallback (`MOCK_AI_FALLBACK=True`)**: Works out of the box offline without requiring external API keys.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Monaco Editor, Lucide React, Recharts, React Hook Form, Zod, Axios |
| **Backend** | Python 3.11 - 3.14+, FastAPI, Pydantic V2, SQLAlchemy 2.0, Alembic, PyJWT, HTTPX |
| **Databases** | SQLite (Default zero-config development) / PostgreSQL (Production) |
| **Testing** | Pytest, AnyIO, Starlette TestClient (25 automated tests) |

---

## 📁 Project Architecture & Structure

```
AI-powered-code-review-system/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── analyzers/              # Language-specific static analyzers
│   │   │   ├── base.py             # BaseAnalyzer and metrics engine
│   │   │   ├── python_analyzer.py  # Python AST visitor and syntax repair
│   │   │   ├── javascript_analyzer.py # JS/TS static rules and syntax checks
│   │   │   ├── go_analyzer.py      # Go security, bug, and syntax rules
│   │   │   ├── rust_analyzer.py    # Rust unsafe, unwrap, and panic rules
│   │   │   ├── java_analyzer.py    # Java SQLi, exec, and equality rules
│   │   │   ├── cpp_analyzer.py     # C/C++ buffer overflow and memory rules
│   │   │   └── generic_analyzer.py # High-entropy secret and token patterns
│   │   ├── api/v1/                 # REST API routes (Auth, Reviews, Findings, System)
│   │   ├── core/                   # Security, JWT, config, logging
│   │   ├── db/                     # SQLAlchemy models and session
│   │   ├── models/                 # User, Review, Finding DB models
│   │   ├── schemas/                # Pydantic validation schemas
│   │   └── services/               # Analysis, AI, and review business logic
│   ├── tests/                      # Automated test suite (25 tests)
│   ├── alembic.ini                 # DB migration configuration
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Container definition for backend
├── frontend/                       # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components (Navbar, Sidebar, Badges)
│   │   ├── context/                # Auth, Theme, and Toast contexts
│   │   ├── pages/                  # Landing, Workspace, Dashboard, Auth pages
│   │   ├── services/api/           # Centralized typed API clients
│   │   └── types/                  # TypeScript data interfaces
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.ts              # Vite configuration with /api proxy
│   └── Dockerfile                  # Container definition for frontend
├── samples/                        # Sample vulnerable files for live testing
│   ├── vulnerable_python.py        # Python test snippet
│   ├── vulnerable_javascript.js    # JavaScript test snippet
│   ├── vulnerable_typescript.ts    # TypeScript test snippet
│   ├── vulnerable_go.go            # Go test snippet
│   ├── vulnerable_rust.rs          # Rust test snippet
│   ├── vulnerable_java.java        # Java test snippet
│   └── vulnerable_cpp.cpp          # C++ test snippet
├── docs/                           # Architecture and API documentation
├── docker-compose.yml              # Multi-container orchestration
└── README.md                       # Comprehensive project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.11+ (Python 3.11, 3.12, 3.13, or 3.14)
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/VishalMalagi16/AI-powered-code-review-system.git
cd AI-powered-code-review-system
```

---

### Step 2: Start the Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Windows (CMD):
.\.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)  
> **Interactive Swagger Docs:** [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

---

### Step 3: Start the Frontend (React + Vite)

Open a **second terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

> **Frontend Web App:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests

To run the complete 25-test backend suite:

```bash
cd backend
python -m pytest -v
```

```text
============================= test session starts =============================
collected 25 items

tests/test_analyzers.py::test_python_dangerous_eval PASSED               [  4%]
tests/test_analyzers.py::test_python_mutable_default PASSED              [  8%]
tests/test_analyzers.py::test_python_bare_except PASSED                  [ 12%]
tests/test_analyzers.py::test_python_syntax_error PASSED                 [ 16%]
tests/test_analyzers.py::test_javascript_innerhtml_xss PASSED            [ 20%]
tests/test_analyzers.py::test_javascript_loose_equality PASSED           [ 24%]
tests/test_analyzers.py::test_generic_hardcoded_aws_key PASSED           [ 28%]
tests/test_analyzers.py::test_metrics_calculation PASSED                 [ 32%]
tests/test_analyzers.py::test_python_performance_optimization_checks PASSED [ 36%]
tests/test_analyzers.py::test_go_analyzer_command_injection_and_resolution PASSED [ 40%]
tests/test_analyzers.py::test_rust_analyzer_unsafe_and_unwrap PASSED     [ 44%]
tests/test_analyzers.py::test_java_analyzer_sql_injection PASSED         [ 48%]
tests/test_analyzers.py::test_cpp_analyzer_buffer_overflow PASSED        [ 52%]
tests/test_auth.py::test_password_hashing PASSED                         [ 56%]
tests/test_auth.py::test_jwt_token_flow PASSED                           [ 60%]
tests/test_code_resolution.py::test_resolve_finding_actually_modifies_code PASSED [ 64%]
tests/test_code_resolution.py::test_apply_all_fixes_batch PASSED         [ 68%]
tests/test_code_resolution.py::test_resolve_syntax_error_actually_fixes_code PASSED [ 72%]
tests/test_code_resolution.py::test_resolve_go_code_resolution PASSED    [ 76%]
tests/test_code_resolution.py::test_resolve_javascript_code_resolution PASSED [ 80%]
tests/test_code_resolution.py::test_resolve_rust_code_resolution PASSED  [ 84%]
tests/test_e2e_workflow.py::test_full_user_workflow_e2e PASSED           [ 88%]
tests/test_reviews.py::test_system_health PASSED                         [ 92%]
tests/test_reviews.py::test_create_and_fetch_review PASSED               [ 96%]
tests/test_reviews.py::test_unauthorized_review_access PASSED            [100%]
======================== 25 passed in 2.44s ========================
```

---

## 🔑 Environment Configuration

Create a `.env` file in `backend/.env` (or copy from `.env.example`):

```env
PROJECT_NAME="CodeGuard AI"
ENVIRONMENT="development"
DEBUG=True

# Security
SECRET_KEY="your-super-secret-jwt-key"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Database
DATABASE_URL="sqlite:///./codeguard.db"

# Optional: Add live AI keys to enable LLM remediation
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-pro"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o"

# Local heuristic fallback when API keys are absent
MOCK_AI_FALLBACK=True
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **PostgreSQL:** `localhost:5432`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
