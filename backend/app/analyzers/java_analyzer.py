import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class JavaAnalyzer(BaseAnalyzer):
    """Static analyzer and auto-fix engine for Java."""

    def __init__(self, language: str = "java"):
        super().__init__(language)

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []
        lines = source_code.splitlines()

        in_loop = False
        loop_indent = 0

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            indent_len = len(line) - len(line.lstrip())
            lead_space = " " * indent_len

            # Track loops
            if re.search(r"\b(for|while)\s*\(", line):
                in_loop = True
                loop_indent = indent_len
            if in_loop and "}" in stripped and indent_len <= loop_indent:
                in_loop = False

            # Skip comments
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # ── 1. SYNTAX CHECKS ─────────────────────────────────────────────
            # (a) Python 'def' used instead of Java method declaration
            if re.match(r"^\s*def\s+[a-zA-Z_]\w*\s*\(", line):
                suggested = re.sub(r"^\s*def\s+", f"{lead_space}public void ", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"
                elif not suggested.rstrip().endswith("{"):
                    suggested = suggested.rstrip() + " {"

                findings.append(FindingBase(
                    rule_id="SYN-JAVA-001",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'def' used in Java method signature",
                    description="Java requires explicit return types or 'void' in method declarations. 'def' is invalid syntax.",
                    why_it_matters="Fails javac compilation with syntax error.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'def' with access modifier and return type (e.g. 'public void').",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (b) Missing semicolon on statement
            if (
                re.match(r"^\s*(?:return|int|String|boolean|double|float|var|\w+\s*=)\b", line)
                and not stripped.endswith(";")
                and not stripped.endswith("{")
                and not stripped.endswith("}")
                and not stripped.endswith(":")
            ):
                suggested = line.rstrip() + ";"
                findings.append(FindingBase(
                    rule_id="SYN-JAVA-002",
                    category="bug",
                    severity="high",
                    title="Syntax Error: Missing semicolon ';' at end of statement",
                    description="Java statements must terminate with a semicolon ';'.",
                    why_it_matters="Fails compilation: ';' expected.",
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
                # (a) Command injection via Runtime.getRuntime().exec(...)
                if re.search(r'Runtime\.getRuntime\s*\(\s*\)\.exec\s*\(', line):
                    suggested = f'{lead_space}// Safe execution: use ProcessBuilder with separated argument list\n{lead_space}ProcessBuilder pb = new ProcessBuilder("command", safeArg);\n{lead_space}Process process = pb.start();'

                    findings.append(FindingBase(
                        rule_id="SEC-JAVA-001",
                        category="security",
                        severity="critical",
                        title="Command Injection via Runtime.getRuntime().exec()",
                        description="Passing dynamic input strings to Runtime.exec() executes shell commands directly, enabling Remote Code Execution (RCE).",
                        why_it_matters="Attackers can append shell metacharacters to execute unauthorized operating system binaries.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.96,
                        suggested_fix="Use ProcessBuilder with arguments passed as separate array/list entries.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) SQL Injection via string concatenation
                if re.search(r'(?:executeQuery|executeUpdate|execute)\s*\(\s*["\'].*(?:WHERE|SELECT|INSERT|UPDATE).*\+.*["\']', line, re.IGNORECASE) or (
                    re.search(r'["\']SELECT\s+.*\+.*["\']', line, re.IGNORECASE)
                ):
                    suggested = f'{lead_space}// Use PreparedStatement to prevent SQL injection:\n{lead_space}PreparedStatement stmt = conn.prepareStatement("SELECT * FROM table WHERE id = ?");\n{lead_space}stmt.setString(1, userId);'

                    findings.append(FindingBase(
                        rule_id="SEC-JAVA-002",
                        category="security",
                        severity="critical",
                        title="SQL Injection via string concatenation in query",
                        description="Concatenating user-controlled parameters into raw SQL strings allows attackers to alter database queries.",
                        why_it_matters="Enables data exfiltration, authentication bypass, and database deletion.",
                        start_line=idx,
                        end_line=idx,
                        source="security_scanner",
                        confidence=0.95,
                        suggested_fix="Use PreparedStatement with parameterized '?' placeholders.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 3. BUGS & LOGIC DEFECTS ───────────────────────────────────────
            if opts.get("enable_bugs", True):
                # (a) String comparison using '==' instead of '.equals()'
                if re.search(r'(?:\w+\s*==\s*["\']|["\']\s*==\s*\w+)', line):
                    suggested = re.sub(r'(\w+)\s*==\s*(["\'][^"\']+["\'])', r'\2.equals(\1)', line)
                    if suggested == line:
                        suggested = re.sub(r'(["\'][^"\']+["\'])\s*==\s*(\w+)', r'\1.equals(\2)', line)

                    findings.append(FindingBase(
                        rule_id="BUG-JAVA-001",
                        category="bug",
                        severity="high",
                        title="Logical Bug: String comparison using '==' instead of '.equals()'",
                        description="In Java, the '==' operator compares object reference addresses in memory, not string content.",
                        why_it_matters="Two strings with identical characters will evaluate to false if they are distinct object instances.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.95,
                        suggested_fix="Use .equals() for content comparison (e.g. \"literal\".equals(variable)).",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # (b) Empty catch block suppressing exceptions
                if re.search(r'catch\s*\([^)]+\)\s*\{\s*\}', line):
                    suggested = line.replace("{}", "{\n" + lead_space + "    logger.error(\"Operation failed\", e);\n" + lead_space + "}")
                    findings.append(FindingBase(
                        rule_id="BUG-JAVA-002",
                        category="bug",
                        severity="medium",
                        title="Silent Exception Swallowing: Empty catch block",
                        description="Catching exceptions with an empty body conceals root-cause runtime failures.",
                        why_it_matters="Creates silent data corruption and makes debugging in production impossible.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.93,
                        suggested_fix="Log the exception or rethrow it appropriately.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # ── 4. PERFORMANCE OPTIMIZATIONS ──────────────────────────────────
            if opts.get("enable_performance", True):
                # (a) String concatenation in loop
                if in_loop and re.search(r'\b(\w+)\s*\+=\s*(?:["\']|\w+)', line):
                    var_match = re.search(r'\b(\w+)\s*\+=', line)
                    var_name = var_match.group(1) if var_match else "str"
                    suggested = f'{lead_space}{var_name}Builder.append(item); // O(1) buffer append instead of O(N^2) String reallocation'

                    findings.append(FindingBase(
                        rule_id="PERF-JAVA-001",
                        category="performance",
                        severity="medium",
                        title=f"Optimization: O(N^2) String reallocation with '+=' in loop",
                        description="Strings are immutable in Java. Using '+=' in a loop creates a new String object and copies the buffer on every iteration.",
                        why_it_matters="Generates millions of short-lived objects, degrading CPU throughput and overwhelming the Garbage Collector.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.91,
                        suggested_fix="Use 'StringBuilder' and call .append() inside the loop.",
                        suggested_code=suggested,
                        original_code=line
                    ))

        return findings
