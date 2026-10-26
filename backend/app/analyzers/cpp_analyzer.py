import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class CppAnalyzer(BaseAnalyzer):
    """Static analyzer and auto-fix engine for C and C++."""

    def __init__(self, language: str = "cpp"):
        super().__init__(language)

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []
        lines = source_code.splitlines()

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            indent_len = len(line) - len(line.lstrip())
            lead_space = " " * indent_len

            # Skip comments
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # ── 1. SYNTAX CHECKS ─────────────────────────────────────────────
            # (a) Python 'def' used instead of C/C++ function signature
            if re.match(r"^\s*def\s+[a-zA-Z_]\w*\s*\(", line):
                suggested = re.sub(r"^\s*def\s+", f"{lead_space}void ", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"
                elif not suggested.rstrip().endswith("{"):
                    suggested = suggested.rstrip() + " {"

                findings.append(FindingBase(
                    rule_id="SYN-CPP-001",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'def' used in C/C++ function declaration",
                    description="C/C++ functions require explicit return types (e.g. 'void', 'int'). 'def' is invalid syntax.",
                    why_it_matters="Compiler emits syntax error and halts compilation.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'def' with return type (e.g. 'void') and use '{'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (b) Missing semicolon on statement
            if (
                re.match(r"^\s*(?:return|int|char|double|float|auto|\w+\s*=)\b", line)
                and not stripped.endswith(";")
                and not stripped.endswith("{")
                and not stripped.endswith("}")
                and not stripped.endswith(":")
            ):
                suggested = line.rstrip() + ";"
                findings.append(FindingBase(
                    rule_id="SYN-CPP-002",
                    category="bug",
                    severity="high",
                    title="Syntax Error: Missing semicolon ';' at end of statement",
                    description="C/C++ statements must terminate with a semicolon ';'.",
                    why_it_matters="Causes compiler error: expected ';' before ...",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=0.95,
                    suggested_fix="Add ';' at the end of the line.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # ── 2. SECURITY VULNERABILITIES ───────────────────────────────────
            if opts.get("enable_security", True):
                # (a) Unbounded buffer write via strcpy()
                if re.search(r'\bstrcpy\s*\(\s*(\w+)\s*,\s*([^)]+)\)', line):
                    m = re.search(r'\bstrcpy\s*\(\s*(\w+)\s*,\s*([^)]+)\)', line)
                    dest = m.group(1) if m else "dest"
                    src = m.group(2) if m else "src"
                    suggested = line.replace(f"strcpy({dest}, {src})", f"strncpy({dest}, {src}, sizeof({dest}) - 1); {dest}[sizeof({dest}) - 1] = '\\0'")

                    findings.append(FindingBase(
                        rule_id="SEC-CPP-001",
                        category="security",
                        severity="critical",
                        title=f"Buffer Overflow: Unbounded buffer copy via 'strcpy()'",
                        description="strcpy() does not check destination buffer boundaries, enabling buffer overflow vulnerabilities.",
                        why_it_matters="Can overwrite stack return addresses, allowing attackers to hijack instruction pointer (EIP/RIP) and execute arbitrary shellcode.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.98,
                        suggested_fix="Replace strcpy() with strncpy() or safe string types like std::string.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) Insecure gets() function
                if re.search(r'\bgets\s*\(', line):
                    suggested = re.sub(r'\bgets\s*\(\s*(\w+)\s*\)', r'fgets(\1, sizeof(\1), stdin)', line)
                    findings.append(FindingBase(
                        rule_id="SEC-CPP-002",
                        category="security",
                        severity="critical",
                        title="Critical: Obsolete and insecure 'gets()' function",
                        description="gets() is inherently vulnerable to buffer overflows as it provides no mechanism to specify buffer capacity.",
                        why_it_matters="Deprecated in C99 and removed completely from modern C standards (C11) due to inherent exploitability.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=1.0,
                        suggested_fix="Replace gets(buf) with 'fgets(buf, sizeof(buf), stdin)'.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (c) Insecure system() execution
                if re.search(r'\bsystem\s*\(\s*[^)]+\)', line):
                    suggested = f'{lead_space}// Safe execution: avoid system() which spawns a subshell;\n{lead_space}// Use execvp() or posix_spawn() with explicit argument vectors.'

                    findings.append(FindingBase(
                        rule_id="SEC-CPP-003",
                        category="security",
                        severity="high",
                        title="Command Injection hazard via 'system()' call",
                        description="system() passes strings directly to the host OS shell interpreter.",
                        why_it_matters="If user input is incorporated into the command string, attackers can execute arbitrary shell commands.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.94,
                        suggested_fix="Use execvp() or posix_spawn() with separated argument vectors.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 3. MEMORY MANAGEMENT BUGS ─────────────────────────────────────
            if opts.get("enable_bugs", True):
                # (a) Raw malloc in C++ (prefer smart pointers)
                if re.search(r'\bmalloc\s*\(', line) and self.language == "cpp":
                    suggested = f'{lead_space}auto ptr = std::make_unique<Type>(); // RAII managed memory, zero leak risk'
                    findings.append(FindingBase(
                        rule_id="BUG-CPP-001",
                        category="bug",
                        severity="medium",
                        title="Memory Management: Raw 'malloc()' in modern C++",
                        description="Using raw malloc() in C++ bypasses object constructors and requires manual free(), creating memory leak hazards.",
                        why_it_matters="Memory leaks degrade system performance and exhaust heap allocations over time.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Use 'std::make_unique' or 'std::vector' for automatic RAII memory management.",
                        suggested_code=suggested,
                        original_code=line
                    ))

        return findings
