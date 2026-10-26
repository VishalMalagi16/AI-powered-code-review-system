from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.db.session import get_db

router = APIRouter(tags=["System"])

SUPPORTED_LANGUAGES = [
    {
        "id": "python",
        "name": "Python",
        "extension": ".py",
        "monaco_lang": "python",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """import os\n\ndef run_query(user_input):\n    # Potential SQL injection and insecure execution\n    os.system(f"echo {user_input}")\n    try:\n        eval(user_input)\n    except:\n        pass\n"""
    },
    {
        "id": "javascript",
        "name": "JavaScript",
        "extension": ".js",
        "monaco_lang": "javascript",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """function processUser(input) {\n    var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";\n    localStorage.setItem("token", token);\n    document.getElementById("output").innerHTML = input;\n    if (input == 0) {\n        eval(input);\n    }\n}\n"""
    },
    {
        "id": "typescript",
        "name": "TypeScript",
        "extension": ".ts",
        "monaco_lang": "typescript",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """interface UserData {\n    apiKey: string;\n    payload: any;\n}\n\nexport function executeAction(data: UserData) {\n    const key = "AKIA1234567890EXAMPLE";\n    const fn = new Function(data.payload);\n    return fn();\n}\n"""
    },
    {
        "id": "java",
        "name": "Java",
        "extension": ".java",
        "monaco_lang": "java",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """public class DatabaseHelper {\n    public void getUser(String userId, java.sql.Statement stmt) throws Exception {\n        String query = "SELECT * FROM users WHERE id = '" + userId + "'";\n        stmt.executeQuery(query);\n    }\n}\n"""
    },
    {
        "id": "cpp",
        "name": "C / C++",
        "extension": ".cpp",
        "monaco_lang": "cpp",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """#include <iostream>\n#include <cstring>\n\nvoid copyBuffer(char* input) {\n    char buffer[16];\n    strcpy(buffer, input); // Buffer overflow vulnerability\n}\n"""
    },
    {
        "id": "go",
        "name": "Go",
        "extension": ".go",
        "monaco_lang": "go",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """package main\n\nimport "os/exec"\n\nfunc RunCmd(arg string) {\n    exec.Command("sh", "-c", arg).Run()\n}\n"""
    },
    {
        "id": "rust",
        "name": "Rust",
        "extension": ".rs",
        "monaco_lang": "rust",
        "ast_analysis": True,
        "security_scanning": True,
        "style_linting": True,
        "ai_remediation": True,
        "sample_snippet": """pub fn execute_untrusted(ptr: *const u8) {\n    unsafe {\n        // Raw pointer dereference\n        let val = *ptr;\n    }\n}\n"""
    }
]

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """System health status check verifying database and AI engine connectivity."""
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    ai_configured = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY)
    active_provider = "gemini" if settings.GEMINI_API_KEY else ("openai" if settings.OPENAI_API_KEY else ("mock_demo" if settings.MOCK_AI_FALLBACK else "none"))

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.VERSION,
        "database_connected": db_ok,
        "ai_status": {
            "configured": ai_configured,
            "provider": active_provider,
            "fallback_enabled": settings.MOCK_AI_FALLBACK
        }
    }

@router.get("/languages")
def get_languages():
    """Retrieve supported programming languages and their analyzer capabilities."""
    return SUPPORTED_LANGUAGES
