import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class JavaScriptAnalyzer(BaseAnalyzer):
    def __init__(self, language: str = "javascript"):
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
            elif in_loop and stripped and indent_len <= loop_indent and "}" in stripped:
                in_loop = False

            # Skip pure comments
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # ── 0. SYNTAX & CROSS-LANGUAGE TYPOS ─────────────────────────────
            # (a) Python 'def' used instead of JavaScript 'function' or 'const fn = () =>'
            if re.match(r"^\s*def\s+[a-zA-Z_]\w*\s*\(", line):
                suggested = re.sub(r"^\s*def\s+", f"{lead_space}function ", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"
                elif not suggested.rstrip().endswith("{"):
                    suggested = suggested.rstrip() + " {"

                findings.append(FindingBase(
                    rule_id="SYN-JS-001",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'def' used in JavaScript/TypeScript function declaration",
                    description="Functions in JavaScript/TypeScript are declared using 'function' or arrow functions 'const fn = () =>', not 'def'.",
                    why_it_matters="The V8 JavaScript engine will throw 'SyntaxError: Unexpected identifier' and immediately halt execution.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'def' with 'function' and use curly braces '{'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (b) Python 'print(...)' used instead of 'console.log(...)'
            if re.match(r"^\s*print\s*\(", line):
                suggested = re.sub(r"^\s*print\s*\(", f"{lead_space}console.log(", line)
                findings.append(FindingBase(
                    rule_id="SYN-JS-002",
                    category="bug",
                    severity="high",
                    title="Reference Error: 'print()' used instead of 'console.log()'",
                    description="In JavaScript/TypeScript, standard output logging is performed using 'console.log()', not 'print()'.",
                    why_it_matters="In modern JS environments (Node.js/browsers), calling print() throws 'ReferenceError: print is not defined' or opens the browser print dialogue.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=0.98,
                    suggested_fix="Replace 'print()' with 'console.log()'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # (c) Python 'elif' used in JavaScript
            if re.search(r"\belif\b", line):
                suggested = re.sub(r"\belif\b", "else if", line)
                if suggested.rstrip().endswith(":"):
                    suggested = suggested.rstrip()[:-1] + " {"

                findings.append(FindingBase(
                    rule_id="SYN-JS-003",
                    category="bug",
                    severity="critical",
                    title="Syntax Error: 'elif' used instead of 'else if'",
                    description="JavaScript uses 'else if' for chained conditions. 'elif' is invalid syntax.",
                    why_it_matters="Throws 'SyntaxError: Unexpected token elif'.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=1.0,
                    suggested_fix="Replace 'elif' with 'else if'.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # 1. Dangerous eval / Function constructor
            if opts.get("enable_security", True):
                if re.search(r"\beval\s*\(", line):
                    # Replace eval(xxx) with JSON.parse(xxx) or safe evaluation
                    suggested = line.replace("eval(", "JSON.parse(")
                    findings.append(FindingBase(
                        rule_id="SEC-JS-001",
                        category="security",
                        severity="critical",
                        title="Critical: Arbitrary code execution via 'eval()'",
                        description="Direct execution of strings as JavaScript creates high-risk DOM XSS and arbitrary code injection vectors.",
                        why_it_matters="If attacker-controlled data reaches eval(), an adversary can hijack the session, steal auth tokens, or execute actions on behalf of the user.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.98,
                        suggested_fix="Parse JSON strings safely using JSON.parse() or use typed schema validation.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                if re.search(r"new\s+Function\s*\(", line):
                    suggested = f"{lead_space}// Refactored to safe handler map:\n{lead_space}const actionHandlers: Record<string, () => void> = {{}};"
                    findings.append(FindingBase(
                        rule_id="SEC-JS-002",
                        category="security",
                        severity="high",
                        title="Dynamic code execution with 'new Function()'",
                        description="'new Function()' compiles and executes dynamic strings in the global scope, circumventing build-time sandboxing.",
                        why_it_matters="Bypasses standard closure scoping and allows arbitrary code injection.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.95,
                        suggested_fix="Replace with static lookup dispatch patterns or explicit functions.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # 2. Insecure DOM manipulation (XSS)
                if re.search(r"\.(innerHTML|outerHTML)\s*=", line):
                    # Replace .innerHTML with .textContent
                    suggested = line.replace(".innerHTML =", ".textContent =").replace(".outerHTML =", ".textContent =")
                    findings.append(FindingBase(
                        rule_id="SEC-JS-003",
                        category="security",
                        severity="high",
                        title="Cross-Site Scripting (XSS) via .innerHTML assignment",
                        description="Assigning raw HTML strings directly to innerHTML bypasses browser sanitization and enables Cross-Site Scripting (XSS).",
                        why_it_matters="Malicious script tags or payload attributes (e.g. <img src=x onerror=...>) execute directly in the victim's browser context.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.95,
                        suggested_fix="Use .textContent for plaintext or sanitize with DOMPurify.sanitize().",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # 3. Sensitive tokens in localStorage
                if re.search(r"localStorage\.setItem\s*\(\s*['\"](token|jwt|auth|password|key|apiKey)['\"]", line, re.IGNORECASE):
                    suggested = f"{lead_space}// Store tokens in secure HttpOnly cookies rather than localStorage:\n{lead_space}// document.cookie = 'token=...; Secure; SameSite=Strict; HttpOnly';"
                    findings.append(FindingBase(
                        rule_id="SEC-JS-004",
                        category="security",
                        severity="medium",
                        title="Sensitive authentication credential stored in localStorage",
                        description="localStorage is accessible to any script running on the origin, making tokens vulnerable to exfiltration during any XSS attack.",
                        why_it_matters="Unlike HttpOnly cookies, localStorage tokens can be read directly by third-party scripts or injected payloads.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Store authentication tokens in HttpOnly, Secure, SameSite cookies or memory.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # 4. Prototype pollution
                if "__proto__" in line or "constructor.prototype" in line:
                    suggested = f"{lead_space}const safeMap = new Map(); // Immune to prototype pollution"
                    findings.append(FindingBase(
                        rule_id="SEC-JS-005",
                        category="security",
                        severity="high",
                        title="Prototype Pollution hazard detected",
                        description="Direct reference or assignment to __proto__ alters JavaScript object prototypes globally across the entire runtime.",
                        why_it_matters="Adversaries can override default methods like hasOwnProperty or inject properties across all created objects.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Use Object.create(null) or Map data structures to isolate user keys.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # 5. Loose equality (== or !=)
            if opts.get("enable_bugs", True) or opts.get("enable_style", True):
                if re.search(r"(?<![!=><])==(?![=])", line) and not re.search(r"typeof\s+\w+\s*==\s*['\"]undefined['\"]", line):
                    suggested = re.sub(r"(?<![!=><])==(?![=])", "===", line)
                    findings.append(FindingBase(
                        rule_id="BUG-JS-001",
                        category="bug",
                        severity="medium",
                        title="Bug: Loose equality '==' performs dangerous type coercion",
                        description="Loose equality (==) coerces different types implicitly (e.g. false == '0' is true, [] == '' is true).",
                        why_it_matters="Causes unpredictable comparison behavior and edge-case security bugs.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.95,
                        suggested_fix="Replace loose equality '==' with strict equality '==='.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # 6. Deprecated 'var' keyword
            if opts.get("enable_style", True):
                if re.search(r"\bvar\s+\w+\s*=", line):
                    suggested = re.sub(r"\bvar\s+", "const ", line)
                    findings.append(FindingBase(
                        rule_id="STYLE-JS-001",
                        category="style",
                        severity="low",
                        title="Style: Legacy 'var' declaration used",
                        description="'var' declarations are function-scoped and hoisted, causing accidental variable leaks and scope confusion.",
                        why_it_matters="Modern ES6+ standards mandate 'const' for immutable values and 'let' for reassignable variables.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.95,
                        suggested_fix="Replace 'var' with 'const' or 'let'.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # 7. PERFORMANCE: O(N^2) Array operations in loops
            if opts.get("enable_performance", True) and in_loop:
                if re.search(r"\.(includes|indexOf|find|findIndex)\s*\(", line):
                    suggested = f"{lead_space}// Optimized O(1) lookup: convert array to Set before the loop:\n{lead_space}// const itemSet = new Set(targetArray);\n{lead_space}if (itemSet.has(item)) {{"
                    findings.append(FindingBase(
                        rule_id="PERF-JS-001",
                        category="performance",
                        severity="medium",
                        title="Optimization: Quadratic Time Complexity O(N^2) search in loop",
                        description="Calling .includes(), .indexOf(), or .find() inside a loop causes a full linear scan on every iteration, leading to O(N x M) quadratic time complexity.",
                        why_it_matters="Slows down client-side page rendering and freezes the browser main thread during array operations.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix="Convert the inner array to a Set and use set.has(val) for instant O(1) lookup.",
                        suggested_code=suggested,
                        original_code=line
                    ))

                # PERFORMANCE: Repeated DOM query inside loop
                if re.search(r"document\.(getElementById|querySelector|querySelectorAll)\s*\(", line):
                    suggested = f"{lead_space}// Optimization: Cache DOM reference outside the loop:\n{lead_space}// const container = document.getElementById('...');"
                    findings.append(FindingBase(
                        rule_id="PERF-JS-002",
                        category="performance",
                        severity="medium",
                        title="Optimization: Repetitive DOM query inside loop",
                        description="Querying the DOM (document.getElementById / querySelector) inside a loop triggers repeated browser DOM traversals and layout reflows.",
                        why_it_matters="Triggers severe frame rate drops (jank) in user interfaces.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.92,
                        suggested_fix="Cache the element reference in a variable outside the loop.",
                        suggested_code=suggested,
                        original_code=line
                    ))

        return findings
