import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

# Regex patterns for high-risk secrets and credentials
SECRET_PATTERNS = [
    {
        "id": "SEC-GEN-AWS",
        "title": "Hardcoded AWS Access Key ID",
        "pattern": r"\b(AKIA[0-9A-Z]{16})\b",
        "severity": "critical",
        "category": "security",
        "desc": "AWS Access Key ID detected in plaintext source code.",
        "why": "Anyone with access to the source code repository can impersonate your AWS account and provision or delete cloud infrastructure.",
        "fix": "Store credentials in environment variables (e.g. os.getenv('AWS_ACCESS_KEY_ID')).",
        "replacement_fn": lambda line: re.sub(r"['\"]AKIA[0-9A-Z]{16}['\"]", "os.getenv('AWS_ACCESS_KEY_ID')", line)
    },
    {
        "id": "SEC-GEN-PRIVKEY",
        "title": "Private Cryptographic Key",
        "pattern": r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
        "severity": "critical",
        "category": "security",
        "desc": "Unencrypted private SSH, SSL, or TLS key embedded in code.",
        "why": "Compromised private keys allow attackers to decrypt traffic, forge signatures, and access secured servers.",
        "fix": "Remove the private key immediately, rotate it, and inject secrets via secure runtime secret stores.",
        "replacement_fn": lambda line: "# [REDACTED]: Private key must be stored in secure secrets manager"
    },
    {
        "id": "SEC-GEN-GITHUB",
        "title": "Hardcoded GitHub Personal Access Token",
        "pattern": r"\b(ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{82})\b",
        "severity": "critical",
        "category": "security",
        "desc": "GitHub Personal Access Token found in source code.",
        "why": "Grants unauthorized access to GitHub repositories, pull requests, and organizational assets.",
        "fix": "Revoke the token in GitHub Settings and load it from environment variables.",
        "replacement_fn": lambda line: re.sub(r"['\"]ghp_[A-Za-z0-9_]{36}['\"]", "os.getenv('GITHUB_TOKEN')", line)
    },
    {
        "id": "SEC-GEN-JWT",
        "title": "Hardcoded JWT Token",
        "pattern": r"\beyJ[A-Za-z0-9-_]{10,}\.eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\b",
        "severity": "high",
        "category": "security",
        "desc": "Static JSON Web Token (JWT) embedded in source code.",
        "why": "Exposes signed claims and potentially session tokens, leading to session hijacking.",
        "fix": "Obtain JWTs dynamically from authentication endpoints; never hardcode them.",
        "replacement_fn": lambda line: re.sub(r"['\"]eyJ[A-Za-z0-9-_]{10,}\.[^'\"]+['\"]", "getAuthToken()", line)
    },
    {
        "id": "SEC-GEN-DBURI",
        "title": "Database Connection String with Credentials",
        "pattern": r"\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[a-zA-Z0-9_\-\.]+:[^@\s/]+@[a-zA-Z0-9_\-\.]+",
        "severity": "critical",
        "category": "security",
        "desc": "Database URI contains plain-text username and password.",
        "why": "Allows unauthorized database connection, data exfiltration, or database destruction.",
        "fix": "Extract database credentials to environment variables or connection secrets.",
        "replacement_fn": lambda line: re.sub(r"['\"](?:postgres|mysql|mongodb|redis)://[^'\"]+['\"]", "os.getenv('DATABASE_URL')", line)
    },
    {
        "id": "SEC-GEN-PASSWORD",
        "title": "Hardcoded Password or Secret Assignment",
        "pattern": r"""(?i)\b(api_key|apikey|secret|password|passwd|auth_token|client_secret)\s*=\s*['"][^'"\s]{8,}['"]""",
        "severity": "high",
        "category": "security",
        "desc": "Potential hardcoded secret or API credential assigned to a variable.",
        "why": "Hardcoded secrets in source control are easily extracted by attackers, contractors, or scanning bots.",
        "fix": "Use environment variables (e.g. os.environ or process.env) to inject credentials at runtime.",
        "replacement_fn": lambda line: re.sub(r"=\s*['\"][^'\"]+['\"]", "= os.getenv('API_SECRET')", line)
    }
]

# Language specific rules for C, C++, Java, etc.
LANG_PATTERNS = {
    "java": [
        {
            "id": "SEC-JAVA-001",
            "title": "SQL Injection via Statement Concatenation",
            "pattern": r"""\b(?:executeQuery|executeUpdate)\s*\([^)]*\+""",
            "severity": "critical",
            "category": "security",
            "desc": "Direct string concatenation inside executeQuery() or executeUpdate().",
            "why": "User parameters dynamically appended to queries allow SQL injection attacks.",
            "fix": "Use java.sql.PreparedStatement with '?' parameter placeholders.",
            "replacement_fn": lambda line: "PreparedStatement pstmt = conn.prepareStatement(\"SELECT * FROM accounts WHERE name = ?\");\npstmt.setString(1, userInput);\nResultSet rs = pstmt.executeQuery();"
        },
        {
            "id": "PERF-JAVA-001",
            "title": "Optimization: Thread.sleep() inside loop",
            "pattern": r"""for\s*\(.*?\)\s*\{[^}]*Thread\.sleep""",
            "severity": "medium",
            "category": "performance",
            "desc": "Thread.sleep() invoked inside a loop iteration blocks thread throughput.",
            "why": "Blocks the worker thread and exhausts connection pools.",
            "fix": "Use ScheduledExecutorService or reactive non-blocking timers.",
            "replacement_fn": lambda line: "// Optimized: Use scheduled executor service rather than Thread.sleep()"
        }
    ],
    "cpp": [
        {
            "id": "SEC-CPP-001",
            "title": "Dangerous unbounded buffer function 'gets()'",
            "pattern": r"\bgets\s*\(",
            "severity": "critical",
            "category": "security",
            "desc": "gets() does not check buffer boundaries and was removed from C11 for safety.",
            "why": "Causes classic buffer overflow vulnerabilities that lead to arbitrary code execution.",
            "fix": "Replace with fgets() or std::string with std::getline().",
            "replacement_fn": lambda line: line.replace("gets(buffer);", "fgets(buffer, sizeof(buffer), stdin);")
        },
        {
            "id": "SEC-CPP-002",
            "title": "Insecure buffer copy function 'strcpy' or 'strcat'",
            "pattern": r"\b(strcpy|strcat|sprintf)\s*\(",
            "severity": "high",
            "category": "security",
            "desc": "Unbounded string operations risk buffer overflows if input exceeds target buffer size.",
            "why": "Memory corruption errors allow remote code execution or application crashes.",
            "fix": "Use snprintf(), strncpy(), or preferably std::string in modern C++.",
            "replacement_fn": lambda line: line.replace("strcpy(", "strncpy(").replace("sprintf(", "snprintf(")
        }
    ]
}

class GenericAnalyzer(BaseAnalyzer):
    def __init__(self, language: str = "generic"):
        super().__init__(language)

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []
        lines = source_code.splitlines()

        # 1. Run secret scanning across all lines
        if opts.get("enable_security", True):
            for idx, line in enumerate(lines, 1):
                # Ignore test mocks
                if "placeholder" in line.lower() or "example" in line.lower() and not re.search(r"\bAKIA[0-9A-Z]{16}\b", line):
                    continue

                for sec in SECRET_PATTERNS:
                    match = re.search(sec["pattern"], line)
                    if match:
                        suggested = sec["replacement_fn"](line) if "replacement_fn" in sec else None
                        findings.append(FindingBase(
                            rule_id=sec["id"],
                            category=sec["category"],
                            severity=sec["severity"],
                            title=sec["title"],
                            description=sec["desc"],
                            why_it_matters=sec["why"],
                            start_line=idx,
                            end_line=idx,
                            source="security_scanner",
                            confidence=0.98,
                            suggested_fix=sec["fix"],
                            suggested_code=suggested,
                            original_code=line
                        ))

        # 2. Run language-specific regex rules if defined
        lang_key = self.language.lower()
        if lang_key in LANG_PATTERNS:
            for rule in LANG_PATTERNS[lang_key]:
                for idx, line in enumerate(lines, 1):
                    if re.search(rule["pattern"], line):
                        suggested = rule["replacement_fn"](line) if "replacement_fn" in rule else None
                        findings.append(FindingBase(
                            rule_id=rule["id"],
                            category=rule["category"],
                            severity=rule["severity"],
                            title=rule["title"],
                            description=rule["desc"],
                            why_it_matters=rule["why"],
                            start_line=idx,
                            end_line=idx,
                            source="static_analyzer",
                            confidence=0.92,
                            suggested_fix=rule["fix"],
                            suggested_code=suggested,
                            original_code=line
                        ))

        return findings
