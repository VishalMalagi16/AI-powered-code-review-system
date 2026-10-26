import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class GoAnalyzer(BaseAnalyzer):
    """Static analyzer and auto-fix engine for Go (Golang)."""

    def __init__(self, language: str = "go"):
        super().__init__(language)

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []
        lines = source_code.splitlines()

        in_loop = False
        loop_indent = 0
        open_braces = 0

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            indent_len = len(line) - len(line.lstrip())
            lead_space = " " * indent_len

            # Track loops and block nesting
            if re.search(r"\bfor\b", line):
                in_loop = True
                loop_indent = indent_len
            open_braces += line.count("{") - line.count("}")
            if in_loop and indent_len <= loop_indent and line.count("}") > line.count("{"):
                in_loop = False

            # Skip comments
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # ── 1. SYNTAX CHECKS ─────────────────────────────────────────────
            # (a) Python 'def' used instead of Go 'func'
            if re.match(r"^\s*def\s+[a-zA-Z_]\w*\s*\(", line):
                suggested = re.sub(r"^\s*def\s+", f"{lead_space}func ", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"
                elif not suggested.rstrip().endswith("{"):
                    suggested = suggested.rstrip() + " {"

                findings.append(FindingBase(
                    rule_id="SYN-GO-001",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'def' used instead of Go 'func'",
                    description="Functions in Go are declared using the 'func' keyword, not 'def'.",
                    why_it_matters="The Go compiler (gc) cannot compile this file and will halt with a syntax error.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'def' with 'func' and use curly braces '{' instead of colon ':'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (b) Python-style colon after if / for statement
            if re.match(r"^\s*(if|for)\b.*:\s*$", line):
                suggested = line.rstrip()[:-1].rstrip() + " {"
                findings.append(FindingBase(
                    rule_id="SYN-GO-002",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: Python-style colon ':' used in Go statement",
                    description="Go statements use curly braces '{' to open code blocks, not colons ':'.",
                    why_it_matters="Fails Go compiler lexical parsing immediately.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace the trailing ':' with an opening curly brace '{'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (c) 'null' used instead of Go 'nil'
            if re.search(r"\bnull\b", line):
                suggested = re.sub(r"\bnull\b", "nil", line)
                findings.append(FindingBase(
                    rule_id="SYN-GO-003",
                    category="bug",
                    severity="high",
                    title="Syntax Error: 'null' used instead of Go 'nil'",
                    description="Go uses 'nil' as the zero value for pointers, interfaces, maps, slices, and channels. 'null' is undeclared.",
                    why_it_matters="Causes compile-time error: 'undefined: null'.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=0.98,
                    suggested_fix="Change 'null' to 'nil'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # ── 2. SECURITY VULNERABILITIES ───────────────────────────────────
            if opts.get("enable_security", True):
                # (a) Command injection via exec.Command("sh", "-c", ...) or ("bash", "-c", ...)
                if re.search(r'exec\.Command\s*\(\s*["\'](sh|bash|cmd|powershell)["\']\s*,\s*["\']-[cC]["\']', line):
                    # Replace with safe direct binary invocation
                    arg_match = re.search(r'exec\.Command\s*\(\s*["\'](?:sh|bash)["\']\s*,\s*["\']-[cC]["\']\s*,\s*([^)]+)\)', line)
                    raw_arg = arg_match.group(1).strip() if arg_match else "arg"
                    suggested = line.replace('exec.Command("sh", "-c", ' + raw_arg + ')', f'exec.Command({raw_arg})')
                    if suggested == line:
                        suggested = f'{lead_space}// Safe execution: pass arguments as slice without shell wrapper\n{lead_space}cmd := exec.Command("echo", {raw_arg})\n{lead_space}_ = cmd.Run()'

                    findings.append(FindingBase(
                        rule_id="SEC-GO-001",
                        category="security",
                        severity="critical",
                        title="Command Injection via shell wrapper in exec.Command()",
                        description="Passing untrusted arguments to 'sh -c' or 'bash -c' executes a shell interpreter that interprets metacharacters (;, &&, |), enabling Remote Code Execution (RCE).",
                        why_it_matters="An adversary can inject arbitrary shell commands to compromise the host server or container environment.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.96,
                        suggested_fix="Invoke the target executable directly with arguments passed as separate parameters without 'sh -c'.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) SQL Injection via fmt.Sprintf or string concatenation in db.Query
                if re.search(r'(?:db|tx)\.(Query|QueryRow|Exec)\s*\(\s*(?:fmt\.Sprintf|\w+\s*\+)', line):
                    suggested = re.sub(r'fmt\.Sprintf\s*\(\s*(["\'][^"\']+["\'])\s*,\s*([^)]+)\)', r'\1, \2', line)
                    if "%s" in suggested:
                        suggested = suggested.replace("%s", "?")

                    findings.append(FindingBase(
                        rule_id="SEC-GO-002",
                        category="security",
                        severity="critical",
                        title="SQL Injection via string formatting in database query",
                        description="Constructing SQL query strings with fmt.Sprintf() or string concatenation allows user input to modify query structure.",
                        why_it_matters="Attackers can bypass authentication, exfiltrate entire databases, or alter database records.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.94,
                        suggested_fix="Use parameterized queries with placeholder arguments ('?' or '$1').",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (c) Hardcoded JWT or secrets in variable
                if re.search(r'(?:apiKey|api_key|token|secret|password)\s*:?=\s*["\'][a-zA-Z0-9_\-\.]{20,}["\']', line, re.IGNORECASE):
                    var_match = re.search(r'([a-zA-Z0-9_]+)\s*:?=', line)
                    var_name = var_match.group(1) if var_match else "secretKey"
                    suggested = f'{lead_space}{var_name} := os.Getenv("{var_name.upper()}") // Loaded securely from environment'

                    findings.append(FindingBase(
                        rule_id="SEC-GO-003",
                        category="security",
                        severity="high",
                        title=f"Hardcoded sensitive credential in variable '{var_name}'",
                        description="Storing plaintext API keys or credentials directly in source code risks leak through version control.",
                        why_it_matters="Leaked credentials allow unauthorized API consumption and account takeovers.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.92,
                        suggested_fix="Load secrets at runtime using os.Getenv().",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 3. BUGS & RELIABILITY ─────────────────────────────────────────
            if opts.get("enable_bugs", True):
                # (a) Silently discarded error: `_, _ = ...` or `val, _ := ...`
                if re.search(r'\b(\w+)\s*,\s*_\s*:?=\s*(?:os\.|json\.|http\.|db\.|strconv\.|io\.)', line):
                    m = re.search(r'\b(\w+)\s*,\s*_\s*:?=\s*(.+)', line)
                    var_name = m.group(1) if m else "val"
                    call_expr = m.group(2) if m else "fn()"
                    suggested = f'{lead_space}{var_name}, err := {call_expr}\n{lead_space}if err != nil {{\n{lead_space}    return err\n{lead_space}}}'

                    findings.append(FindingBase(
                        rule_id="BUG-GO-001",
                        category="bug",
                        severity="high",
                        title=f"Ignored error return value in '{stripped}'",
                        description="Discarding error returns using blank identifier '_' masks operational failures like missing files or network drops.",
                        why_it_matters="Subsequent operations receive nil or zero-value pointers, leading to nil pointer dereference panics.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.93,
                        suggested_fix="Capture the error variable and handle it with 'if err != nil { ... }'.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) Goroutine capturing loop variable without parameter
                if in_loop and re.search(r'\bgo\s+func\s*\(\s*\)', line):
                    suggested = f'{lead_space}go func(item interface{{}}) {{\n{lead_space}    // use parameter item safely\n{lead_space}}}(item)'
                    findings.append(FindingBase(
                        rule_id="BUG-GO-002",
                        category="bug",
                        severity="high",
                        title="Goroutine data race: loop variable captured by reference",
                        description="Spawning a goroutine inside a loop that references the loop iterator variable by closure causes all goroutines to observe the final loop value.",
                        why_it_matters="Causes nondeterministic data races and incorrect business logic execution.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Pass the loop variable as an argument to the goroutine function.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 4. PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
            if opts.get("enable_performance", True):
                # (a) String concatenation in loop
                if in_loop and re.search(r'\b(\w+)\s*\+=\s*(?:string\(|["\']|\w+)', line):
                    var_match = re.search(r'\b(\w+)\s*\+=', line)
                    var_name = var_match.group(1) if var_match else "s"
                    suggested = f'{lead_space}{var_name}Builder.WriteString(item) // O(1) buffer append instead of O(N^2) string re-allocation'

                    findings.append(FindingBase(
                        rule_id="PERF-GO-001",
                        category="performance",
                        severity="medium",
                        title=f"Optimization: O(N^2) string reallocation via '+=' in loop",
                        description=f"Concatenating strings with '+=' inside a loop allocates a new string in memory on each iteration.",
                        why_it_matters="For large datasets, triggers severe GC pressure and degrades performance from linear O(N) to quadratic O(N^2).",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.92,
                        suggested_fix="Use 'strings.Builder' with .WriteString() for fast, zero-copy string construction.",
                        suggested_code=suggested,
                        original_code=line
                    ))

        return findings
