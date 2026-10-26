import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class RustAnalyzer(BaseAnalyzer):
    """Static analyzer and auto-fix engine for Rust."""

    def __init__(self, language: str = "rust"):
        super().__init__(language)

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []
        lines = source_code.splitlines()

        in_unsafe = False
        in_loop = False
        unsafe_indent = 0
        loop_indent = 0

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            indent_len = len(line) - len(line.lstrip())
            lead_space = " " * indent_len

            # Track unsafe blocks
            if re.search(r"\bunsafe\s*\{", line):
                in_unsafe = True
                unsafe_indent = indent_len
            if in_unsafe and "}" in stripped and indent_len <= unsafe_indent:
                in_unsafe = False

            # Track loops
            if re.search(r"\b(for|while|loop)\b", line):
                in_loop = True
                loop_indent = indent_len
            if in_loop and "}" in stripped and indent_len <= loop_indent:
                in_loop = False

            # Skip comments
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # ── 1. SYNTAX CHECKS ─────────────────────────────────────────────
            # (a) Python 'def' or JS 'function' used instead of Rust 'fn'
            if re.match(r"^\s*(?:def|function)\s+[a-zA-Z_]\w*\s*\(", line):
                suggested = re.sub(r"^\s*(?:def|function)\s+", f"{lead_space}fn ", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"
                elif not suggested.rstrip().endswith("{"):
                    suggested = suggested.rstrip() + " {"

                findings.append(FindingBase(
                    rule_id="SYN-RS-001",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'def/function' used instead of Rust 'fn'",
                    description="Functions in Rust are declared with the 'fn' keyword, not 'def' or 'function'.",
                    why_it_matters="The Rust compiler (rustc) will fail to parse this file with syntax error.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'def/function' with 'fn' and use curly braces '{'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (b) Python-style colon after if / for / while statement
            if re.match(r"^\s*(if|for|while)\b.*:\s*$", line):
                suggested = line.rstrip()[:-1].rstrip() + " {"
                findings.append(FindingBase(
                    rule_id="SYN-RS-002",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: Trailing colon ':' used in Rust control statement",
                    description="Rust control flow statements (if, for, while) must be followed by a block enclosed in curly braces '{ ... }', not a colon ':'.",
                    why_it_matters="Fails compilation with syntax error.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace the trailing ':' with an opening curly brace '{'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # ── 2. SECURITY VULNERABILITIES ───────────────────────────────────
            if opts.get("enable_security", True):
                # (a) Raw pointer dereference without null check in unsafe block
                if (in_unsafe or "unsafe" in line) and re.search(r'\*\s*([a-zA-Z_]\w*)', line) and not re.search(r'\b(is_null|as_ref)\b', line):
                    ptr_match = re.search(r'\*\s*([a-zA-Z_]\w*)', line)
                    ptr_name = ptr_match.group(1) if ptr_match else "ptr"
                    suggested = f'{lead_space}if !{ptr_name}.is_null() {{\n{lead_space}    let val = unsafe {{ *{ptr_name} }};\n{lead_space}}}'

                    findings.append(FindingBase(
                        rule_id="SEC-RS-001",
                        category="security",
                        severity="critical",
                        title=f"Unchecked raw pointer dereference '*{ptr_name}'",
                        description="Dereferencing raw pointers (*const T / *mut T) without validating against null causes segmentation faults or arbitrary memory access.",
                        why_it_matters="Can be exploited to corrupt memory or execute code if attacker controls pointer values.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.95,
                        suggested_fix=f"Verify '!{ptr_name}.is_null()' before dereferencing, or use safe references (&T).",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) Command injection via Command::new("sh").arg("-c")
                if re.search(r'Command::new\s*\(\s*["\'](sh|bash|cmd)["\']\s*\)', line):
                    suggested = f'{lead_space}// Safe execution: invoke binary directly without shell wrapper\n{lead_space}let output = std::process::Command::new("executable")\n{lead_space}    .arg(safe_arg)\n{lead_space}    .output();'

                    findings.append(FindingBase(
                        rule_id="SEC-RS-002",
                        category="security",
                        severity="high",
                        title="Command Injection hazard via shell interpreter in Command::new()",
                        description="Spawning 'sh' or 'bash' passes command arguments through a shell parser, leaving application vulnerable to metacharacter injection.",
                        why_it_matters="Allows attackers to append commands (e.g. '; rm -rf') that execute with process privileges.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.94,
                        suggested_fix="Call the target executable directly and pass arguments using .arg().",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 3. BUGS & UNHANDLED PANICS ────────────────────────────────────
            if opts.get("enable_bugs", True):
                # (a) Dangerous .unwrap() in production
                if re.search(r'\.unwrap\s*\(\s*\)', line) and not stripped.startswith("//"):
                    suggested = line.replace(".unwrap()", ".unwrap_or_default()")
                    findings.append(FindingBase(
                        rule_id="BUG-RS-001",
                        category="bug",
                        severity="high",
                        title="Thread Panic: Dangerous use of '.unwrap()'",
                        description="Calling .unwrap() on Result or Option will trigger an unrecoverable panic and crash the thread if value is Err or None.",
                        why_it_matters="Crashes worker threads and causes Denial of Service (DoS) in web services or CLI utilities.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.92,
                        suggested_fix="Use '.unwrap_or_default()', '?', or a 'match' statement for safe error propagation.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) Explicit panic! in non-test code
                if re.search(r'\bpanic!\s*\(', line):
                    suggested = f'{lead_space}return Err("Operation failed".into()); // Safe error propagation instead of thread panic'
                    findings.append(FindingBase(
                        rule_id="BUG-RS-002",
                        category="bug",
                        severity="medium",
                        title="Explicit 'panic!' invocation halts execution",
                        description="Directly invoking panic!() terminates the running thread without allowing callers to recover gracefully.",
                        why_it_matters="Degrades reliability in production and prevents clean cleanup of open resources.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Return a Result::Err and propagate errors to the caller.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 4. PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
            if opts.get("enable_performance", True):
                # (a) Heavy .clone() inside loop
                if in_loop and re.search(r'\.clone\s*\(\s*\)', line):
                    suggested = line.replace(".clone()", " /* borrow by reference &item instead of cloning */")
                    findings.append(FindingBase(
                        rule_id="PERF-RS-001",
                        category="performance",
                        severity="medium",
                        title="Optimization: Redundant heap allocation with '.clone()' in loop",
                        description="Cloning heap-allocated structures (String, Vec, Struct) on every loop iteration triggers repeated memory allocations.",
                        why_it_matters="Significantly degrades throughput and exhausts memory bandwidth.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.88,
                        suggested_fix="Pass items by reference (&T or &str) to avoid cloning.",
                        suggested_code=suggested,
                        original_code=line
                    ))

        return findings
