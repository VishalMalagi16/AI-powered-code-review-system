import ast
import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer
from app.schemas.finding import FindingBase

class PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, source_code: str, options: Dict[str, Any]):
        self.source_code = source_code
        self.lines = source_code.splitlines()
        self.options = options
        self.findings: List[FindingBase] = []

    def _get_original_snippet(self, start_line: int, end_line: int) -> str:
        if not self.lines or start_line < 1 or start_line > len(self.lines):
            return ""
        s = start_line - 1
        e = min(len(self.lines), max(s + 1, end_line))
        return "\n".join(self.lines[s:e])

    def visit_Call(self, node: ast.Call):
        # 1. Check dangerous execution: eval(), exec()
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in ["eval", "exec"] and self.options.get("enable_security", True):
                orig = self._get_original_snippet(node.lineno, getattr(node, "end_lineno", node.lineno))
                arg_code = ast.unparse(node.args[0]) if hasattr(ast, "unparse") and node.args else "untrusted_input"
                
                # Replace with ast.literal_eval
                indent = re.match(r"^(\s*)", orig).group(1) if orig else ""
                suggested = f"{indent}import ast\n{indent}safe_result = ast.literal_eval({arg_code})"
                
                self.findings.append(FindingBase(
                    rule_id="SEC-PY-001",
                    category="security",
                    severity="critical",
                    title=f"Critical: Dangerous dynamic execution via '{func_name}()'",
                    description=f"Calling '{func_name}()' executes arbitrary strings directly in the Python runtime, allowing complete Remote Code Execution (RCE).",
                    why_it_matters="If untrusted or user-supplied input reaches this call, an attacker can execute arbitrary commands, read environment files, or take over the server.",
                    start_line=node.lineno,
                    end_line=getattr(node, "end_lineno", node.lineno),
                    source="ast_visitor",
                    confidence=0.99,
                    suggested_fix=f"Replace '{func_name}()' with safe data parsing like ast.literal_eval() or json.loads().",
                    suggested_code=suggested,
                    original_code=orig
                ))

        # 2. Check os.system() and subprocess shell=True
        if isinstance(node.func, ast.Attribute) and self.options.get("enable_security", True):
            attr_name = node.func.attr
            orig = self._get_original_snippet(node.lineno, getattr(node, "end_lineno", node.lineno))
            indent = re.match(r"^(\s*)", orig).group(1) if orig else ""

            # Check os.system(...)
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "os" and attr_name == "system":
                cmd_code = ast.unparse(node.args[0]) if hasattr(ast, "unparse") and node.args else "'command'"
                suggested = f"{indent}import subprocess\n{indent}subprocess.run(['echo', str({cmd_code})], check=True)"
                
                self.findings.append(FindingBase(
                    rule_id="SEC-PY-002",
                    category="security",
                    severity="high",
                    title="Unsafe shell command execution via os.system()",
                    description="os.system() delegates directly to the host shell without argument escaping, leaving the application vulnerable to command injection.",
                    why_it_matters="Attackers can append shell metacharacters (; && |) to run arbitrary system binaries.",
                    start_line=node.lineno,
                    end_line=getattr(node, "end_lineno", node.lineno),
                    source="ast_visitor",
                    confidence=0.95,
                    suggested_fix="Use the subprocess module with arguments as a safe list and shell=False.",
                    suggested_code=suggested,
                    original_code=orig
                ))
            
            # Check subprocess shell=True
            if attr_name in ["Popen", "call", "run", "check_output"]:
                for kw in node.keywords:
                    if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                        suggested = orig.replace("shell=True", "shell=False")
                        self.findings.append(FindingBase(
                            rule_id="SEC-PY-003",
                            category="security",
                            severity="high",
                            title="Subprocess invocation with shell=True",
                            description="Spawning a subprocess with shell=True invokes an OS shell interpreter, exposing the command string to injection.",
                            why_it_matters="If variables in the command string contain spaces or separators, malicious arguments are executed.",
                            start_line=node.lineno,
                            end_line=getattr(node, "end_lineno", node.lineno),
                            source="ast_visitor",
                            confidence=0.95,
                            suggested_fix="Pass command arguments as an array of strings and set shell=False.",
                            suggested_code=suggested,
                            original_code=orig
                        ))

            # Check pickle.loads()
            if attr_name in ["loads", "load"]:
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "pickle":
                    suggested = f"{indent}import json\n{indent}safe_data = json.loads(untrusted_blob)"
                    self.findings.append(FindingBase(
                        rule_id="SEC-PY-004",
                        category="security",
                        severity="critical",
                        title="Insecure object deserialization via pickle",
                        description="Pickle deserialization executes arbitrary Python code during unpickling before type validation occurs.",
                        why_it_matters="A crafted pickle byte stream automatically achieves arbitrary code execution upon loading.",
                        start_line=node.lineno,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        source="ast_visitor",
                        confidence=0.99,
                        suggested_fix="Use safe serialization formats such as JSON or Protocol Buffers.",
                        suggested_code=suggested,
                        original_code=orig
                    ))

            # Check cursor.execute with format strings / f-strings
            if attr_name == "execute":
                if node.args:
                    arg = node.args[0]
                    if isinstance(arg, ast.JoinedStr) or (isinstance(arg, ast.BinOp) and isinstance(arg.op, ast.Mod)):
                        suggested = f"{indent}cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))"
                        self.findings.append(FindingBase(
                            rule_id="SEC-PY-005",
                            category="security",
                            severity="critical",
                            title="SQL Injection in cursor.execute() statement",
                            description="SQL query is assembled via string interpolation or f-string formatting instead of parameterized placeholders.",
                            why_it_matters="Allows attackers to bypass database authentication, dump entire database tables, or alter records.",
                            start_line=node.lineno,
                            end_line=getattr(node, "end_lineno", node.lineno),
                            source="ast_visitor",
                            confidence=0.96,
                            suggested_fix="Use parameterized queries with %s or ? placeholders and pass arguments in a parameter tuple.",
                            suggested_code=suggested,
                            original_code=orig
                        ))

        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        # 3. Check mutable default argument (def foo(items=[]))
        if self.options.get("enable_bugs", True):
            for default in node.args.defaults:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    orig = self._get_original_snippet(node.lineno, node.lineno)
                    indent = re.match(r"^(\s*)", orig).group(1) if orig else ""
                    
                    # Fix: def foo(items=None): \n if items is None: items = []
                    fixed_header = re.sub(r"=\s*\[\s*\]", "=None", orig)
                    fixed_header = re.sub(r"=\s*\{\s*\}", "=None", fixed_header)
                    fixed_header = re.sub(r"=\s*set\(\)", "=None", fixed_header)
                    
                    suggested = f"{fixed_header}\n{indent}    if roles is None:\n{indent}        roles = []" if "roles" in orig else f"{fixed_header}\n{indent}    if items is None:\n{indent}        items = []"

                    self.findings.append(FindingBase(
                        rule_id="BUG-PY-001",
                        category="bug",
                        severity="high",
                        title=f"Bug: Mutable default parameter in '{node.name}()'",
                        description=f"Function '{node.name}' uses a mutable default parameter ({type(default).__name__.lower()}). In Python, default arguments are evaluated only once at module import.",
                        why_it_matters="Modifications to the argument leak across subsequent function calls, corrupting shared state for other users or requests.",
                        start_line=node.lineno,
                        end_line=node.lineno,
                        source="ast_visitor",
                        confidence=0.99,
                        suggested_fix="Default the parameter to None and initialize a new list/dict instance inside the function body.",
                        suggested_code=suggested,
                        original_code=orig
                    ))

        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        # 4. Check bare except: or silent pass
        if self.options.get("enable_bugs", True):
            orig = self._get_original_snippet(node.lineno, getattr(node, "end_lineno", node.lineno))
            indent = re.match(r"^(\s*)", orig).group(1) if orig else ""

            if node.type is None:
                suggested = f"{indent}except Exception as exc:\n{indent}    logger.error('Error occurred: %s', exc)"
                self.findings.append(FindingBase(
                    rule_id="BUG-PY-002",
                    category="bug",
                    severity="medium",
                    title="Anti-Pattern: Bare 'except:' clause caught",
                    description="A bare 'except:' catches all exceptions, including SystemExit, KeyboardInterrupt, and GeneratorExit.",
                    why_it_matters="Prevents process shutdown signals from terminating the app and silently hides critical internal crashes.",
                    start_line=node.lineno,
                    end_line=getattr(node, "end_lineno", node.lineno),
                    source="ast_visitor",
                    confidence=0.98,
                    suggested_fix="Specify the expected exception type, such as 'except Exception as exc:'.",
                    suggested_code=suggested,
                    original_code=orig
                ))
            elif isinstance(node.type, ast.Name) and node.type.id in ["Exception", "BaseException"]:
                if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                    suggested = f"{indent}except Exception as exc:\n{indent}    logger.warning('Handled non-fatal error: %s', exc)"
                    self.findings.append(FindingBase(
                        rule_id="BUG-PY-003",
                        category="bug",
                        severity="high",
                        title="Silent Exception Suppression ('except: pass')",
                        description="Exceptions are swallowed completely without logging or error propagation.",
                        why_it_matters="Completely conceals root-cause failures, creating ghost bugs that are nearly impossible to diagnose in production.",
                        start_line=node.lineno,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        source="ast_visitor",
                        confidence=0.95,
                        suggested_fix="Log the exception with context or re-raise appropriately.",
                        suggested_code=suggested,
                        original_code=orig
                    ))

        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare):
        # 5. Check == None instead of is None
        if self.options.get("enable_style", True):
            for op, comparator in zip(node.ops, node.comparators):
                if isinstance(op, (ast.Eq, ast.NotEq)):
                    if (isinstance(comparator, ast.Constant) and comparator.value is None) or \
                       (isinstance(node.left, ast.Constant) and node.left.value is None):
                        orig = self._get_original_snippet(node.lineno, getattr(node, "end_lineno", node.lineno))
                        op_str = "==" if isinstance(op, ast.Eq) else "!="
                        fix_op = "is None" if isinstance(op, ast.Eq) else "is not None"
                        suggested = orig.replace(f"== None", "is None").replace(f"!= None", "is not None")

                        self.findings.append(FindingBase(
                            rule_id="STYLE-PY-002",
                            category="style",
                            severity="low",
                            title=f"Style: Comparison with None using '{op_str}' instead of '{fix_op}'",
                            description="PEP 8 dictates that comparisons to singletons like None should always use 'is' or 'is not'.",
                            why_it_matters="Overridden __eq__ methods in third-party classes can cause '== None' to evaluate unexpectedly.",
                            start_line=node.lineno,
                            end_line=getattr(node, "end_lineno", node.lineno),
                            source="ast_visitor",
                            confidence=0.99,
                            suggested_fix=f"Change '{op_str} None' to '{fix_op}'.",
                            suggested_code=suggested,
                            original_code=orig
                        ))

            # 8. PERFORMANCE: Inefficient list membership test in loops or conditionals: 'x in [...]'
            if self.options.get("enable_performance", True) and isinstance(node.ops[0] if node.ops else None, (ast.In, ast.NotIn)):
                for comparator in node.comparators:
                    if isinstance(comparator, ast.List) and len(comparator.elts) > 3:
                        orig = self._get_original_snippet(node.lineno, getattr(node, "end_lineno", node.lineno))
                        raw_list = ast.unparse(comparator) if hasattr(ast, "unparse") else "[...]"
                        raw_set = "{" + raw_list[1:-1] + "}"
                        suggested = orig.replace(raw_list, raw_set)

                        self.findings.append(FindingBase(
                            rule_id="PERF-PY-006",
                            category="performance",
                            severity="low",
                            title="Optimization: O(N) list membership test instead of O(1) set lookup",
                            description=f"Checking membership with 'in {raw_list}' performs a linear O(N) search through the list.",
                            why_it_matters="Set lookups use hashing for instantaneous O(1) average-time lookups, eliminating redundant scans.",
                            start_line=node.lineno,
                            end_line=getattr(node, "end_lineno", node.lineno),
                            source="ast_visitor",
                            confidence=0.94,
                            suggested_fix=f"Convert the list literal to a set literal: {raw_set}",
                            suggested_code=suggested,
                            original_code=orig
                        ))

        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        # 6. PERFORMANCE: Check range(len(x)) anti-pattern
        if self.options.get("enable_performance", True):
            orig = self._get_original_snippet(node.lineno, node.lineno)
            indent = re.match(r"^(\s*)", orig).group(1) if orig else ""

            # Check for range(len(...))
            if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                if node.iter.args and isinstance(node.iter.args[0], ast.Call):
                    inner_call = node.iter.args[0]
                    if isinstance(inner_call.func, ast.Name) and inner_call.func.id == "len":
                        seq_name = ast.unparse(inner_call.args[0]) if hasattr(ast, "unparse") and inner_call.args else "items"
                        var_name = ast.unparse(node.target) if hasattr(ast, "unparse") else "i"
                        suggested = f"{indent}for {var_name}, item in enumerate({seq_name}):"

                        self.findings.append(FindingBase(
                            rule_id="PERF-PY-005",
                            category="performance",
                            severity="low",
                            title=f"Optimization: Inefficient loop using 'range(len({seq_name}))'",
                            description=f"Iterating with range(len({seq_name})) and indexing manually is slower than direct sequence iteration or enumerate().",
                            why_it_matters="Adds unnecessary integer indexing overhead on every iteration instead of using Python's fast C-level iterator protocol.",
                            start_line=node.lineno,
                            end_line=node.lineno,
                            source="ast_visitor",
                            confidence=0.92,
                            suggested_fix=f"Use 'for {var_name}, item in enumerate({seq_name}):' or iterate directly.",
                            suggested_code=suggested,
                            original_code=orig
                        ))

            # Check for unnecessary dict.keys() iteration: for k in d.keys():
            if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Attribute) and node.iter.func.attr == "keys":
                d_name = ast.unparse(node.iter.func.value) if hasattr(ast, "unparse") else "dictionary"
                orig = self._get_original_snippet(node.lineno, node.lineno)
                suggested = orig.replace(f".keys()", "")
                self.findings.append(FindingBase(
                    rule_id="PERF-PY-007",
                    category="performance",
                    severity="low",
                    title=f"Optimization: Redundant '.keys()' call in dictionary iteration",
                    description=f"Iterating over 'for k in {d_name}.keys():' redundantly invokes method lookup and creates view objects. Iterating directly over '{d_name}' yields keys by default.",
                    why_it_matters="Avoids function call overhead and produces cleaner, more idiomatic Python code.",
                    start_line=node.lineno,
                    end_line=node.lineno,
                    source="ast_visitor",
                    confidence=0.96,
                    suggested_fix=f"Iterate directly over the dictionary: 'for k in {d_name}:'",
                    suggested_code=suggested,
                    original_code=orig
                ))

            # 7. PERFORMANCE: Check nested loops O(N^2) or linear lookups inside loops
            for body_item in node.body:
                # Check for nested For loop
                if isinstance(body_item, ast.For):
                    nested_orig = self._get_original_snippet(node.lineno, getattr(body_item, "end_lineno", body_item.lineno))
                    nested_indent = re.match(r"^(\s*)", nested_orig).group(1) if nested_orig else ""
                    self.findings.append(FindingBase(
                        rule_id="PERF-PY-001",
                        category="performance",
                        severity="medium",
                        title="Optimization: Quadratic Time Complexity O(N^2) in nested loops",
                        description="Nested loops over collections result in O(N x M) quadratic time complexity. As collections grow, execution time degrades exponentially.",
                        why_it_matters="10,000 items in nested loops require 100,000,000 iterations, causing severe application latency and CPU spikes.",
                        start_line=node.lineno,
                        end_line=getattr(body_item, "end_lineno", body_item.lineno),
                        source="ast_visitor",
                        confidence=0.88,
                        suggested_fix="Convert inner collection to a hash set or dictionary for O(1) lookups, reducing total complexity to O(N + M) linear time.",
                        suggested_code=f"{nested_indent}# Optimized O(N) lookup using set:\n{nested_indent}lookup_set = set(inner_collection)\n{nested_indent}matches = [x for x in outer_collection if x in lookup_set]",
                        original_code=nested_orig
                    ))
                    break

        self.generic_visit(node)


class PythonAnalyzer(BaseAnalyzer):
    def __init__(self):
        super().__init__("python")

    def _diagnose_and_repair_syntax_error(
        self, source_code: str, error: SyntaxError
    ) -> Tuple[str, str, str, str]:
        """
        Diagnoses a Python SyntaxError or IndentationError and generates:
        Returns: (suggested_code, suggested_fix, why_it_matters, detailed_description)
        """
        lines = source_code.splitlines()
        lineno = error.lineno or 1
        raw_line = lines[lineno - 1] if 1 <= lineno <= len(lines) else ""
        indent = re.match(r"^(\s*)", raw_line).group(1) if raw_line else ""
        stripped = raw_line.strip()

        # 1. Function definition missing 'def' keyword:
        # e.g. "category_summary():" -> "def category_summary():"
        # e.g. "async fetch():" -> "async def fetch():"
        if re.match(r"^(?:async\s+)?[a-zA-Z_]\w*\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:\s*$", stripped):
            if stripped.startswith("async "):
                func_part = raw_line.lstrip()[6:]
                suggested_code = f"{indent}async def {func_part}"
            else:
                suggested_code = f"{indent}def {raw_line.lstrip()}"
            suggested_fix = f"Add the missing 'def' keyword: '{suggested_code.strip()}'"
            why_it_matters = (
                "Functions in Python must start with the 'def' keyword. Writing 'name():' without 'def' "
                "is treated as an invalid statement with a misplaced colon, halting program execution."
            )
            description = (
                f"Missing 'def' keyword at line {lineno}. In Python, function definitions require the 'def' keyword: "
                f"change '{stripped}' to '{suggested_code.strip()}'."
            )
            return suggested_code, suggested_fix, why_it_matters, description

        # 2. Block header missing trailing colon ':'
        # e.g. "def foo()" -> "def foo():"
        # e.g. "if x > 10" -> "if x > 10:"
        block_keywords = (
            "def ", "class ", "if ", "elif ", "else", "for ", "while ",
            "try", "except", "finally", "with ", "async def ", "async for ", "async with "
        )
        if any(stripped.startswith(kw) for kw in block_keywords) and not stripped.endswith(":"):
            suggested_code = raw_line.rstrip() + ":"
            suggested_fix = f"Add a colon ':' at the end of the statement: '{suggested_code.strip()}'"
            why_it_matters = (
                "Python syntax requires a colon ':' at the end of block statements to denote the beginning "
                "of an indented suite."
            )
            description = f"Missing colon ':' at line {lineno}. Python block headers must end with ':'."
            return suggested_code, suggested_fix, why_it_matters, description

        # 3. 'else if' instead of 'elif'
        if re.search(r"\belse\s+if\b", raw_line):
            suggested_code = re.sub(r"\belse\s+if\b", "elif", raw_line)
            suggested_fix = f"Replace 'else if' with Python's 'elif' keyword: '{suggested_code.strip()}'"
            why_it_matters = "Python does not have an 'else if' compound keyword; 'elif' must be used for conditional chaining."
            description = f"Invalid 'else if' syntax at line {lineno}. In Python, use 'elif'."
            return suggested_code, suggested_fix, why_it_matters, description

        # 4. 'function' or 'func' keyword used instead of 'def'
        if re.match(r"^\s*(?:function|func)\s+", raw_line):
            suggested_code = re.sub(r"^\s*(?:function|func)\s+", f"{indent}def ", raw_line)
            if not suggested_code.rstrip().endswith(":"):
                suggested_code = suggested_code.rstrip() + ":"
            suggested_fix = f"Replace 'function/func' with 'def': '{suggested_code.strip()}'"
            why_it_matters = "Python uses 'def' to define functions, unlike languages such as JavaScript or Go."
            description = f"Used 'function/func' keyword at line {lineno}. Replace with 'def'."
            return suggested_code, suggested_fix, why_it_matters, description

        # 5. Single '=' in conditional comparison
        if re.search(r"^\s*(?:if|while|elif)\s+[^=!<>]=(?!=)[^=]", raw_line):
            suggested_code = re.sub(r"(?<=[a-zA-Z0-9_\s])=(?=[a-zA-Z0-9_\s])", "==", raw_line)
            suggested_fix = f"Replace assignment '=' with comparison '==': '{suggested_code.strip()}'"
            why_it_matters = "A single '=' performs assignment. In conditionals, use '==' for equality checks."
            description = f"Assignment '=' in conditional statement at line {lineno}. Use '=='."
            return suggested_code, suggested_fix, why_it_matters, description

        # 6. Unclosed parentheses, brackets, or braces
        open_p = raw_line.count("(") - raw_line.count(")")
        open_b = raw_line.count("[") - raw_line.count("]")
        open_c = raw_line.count("{") - raw_line.count("}")
        if open_p > 0 or open_b > 0 or open_c > 0:
            closers = (")" * max(0, open_p)) + ("]" * max(0, open_b)) + ("}" * max(0, open_c))
            suggested_code = raw_line.rstrip() + closers
            suggested_fix = f"Add missing closing characters: '{closers}'"
            why_it_matters = "Unclosed brackets or parentheses leave Python syntax structures incomplete."
            description = f"Unclosed delimiter at line {lineno}. Add '{closers}'."
            return suggested_code, suggested_fix, why_it_matters, description

        # 7. JavaScript / C keywords (true, false, null)
        if re.search(r"\b(true|false|null)\b", raw_line):
            fixed = re.sub(r"\btrue\b", "True", raw_line)
            fixed = re.sub(r"\bfalse\b", "False", fixed)
            fixed = re.sub(r"\bnull\b", "None", fixed)
            suggested_code = fixed
            suggested_fix = f"Use capitalized Python literals: '{suggested_code.strip()}'"
            why_it_matters = "Python requires True, False, and None with initial capital letters."
            description = f"Lowercase boolean/null literal at line {lineno}. Use True, False, or None."
            return suggested_code, suggested_fix, why_it_matters, description

        # 8. Python 2 print statement
        if re.match(r"^\s*print\s+[^(]", raw_line):
            arg = raw_line.strip()[5:].strip()
            suggested_code = f"{indent}print({arg})"
            suggested_fix = f"Wrap print arguments in parentheses: '{suggested_code.strip()}'"
            why_it_matters = "In Python 3, print is a built-in function and requires parentheses: print(...)."
            description = f"Legacy Python 2 print syntax at line {lineno}. In Python 3, use print(...)."
            return suggested_code, suggested_fix, why_it_matters, description

        # 9. Indentation errors
        if isinstance(error, IndentationError) or "indent" in str(error.msg).lower():
            if "expected an indented block" in str(error.msg).lower():
                suggested_code = f"{raw_line}\n{indent}    pass"
                suggested_fix = "Add an indented block or 'pass' statement under this compound statement."
                why_it_matters = "Python requires code blocks following compound statements to be indented."
                description = f"Expected indented block following line {lineno}. Added 'pass'."
                return suggested_code, suggested_fix, why_it_matters, description
            elif "unexpected indent" in str(error.msg).lower():
                suggested_code = raw_line.lstrip()
                suggested_fix = "Remove unintended leading spaces to align with the surrounding block."
                why_it_matters = "Misaligned indentation breaks Python's block scoping."
                description = f"Unexpected indentation at line {lineno}."
                return suggested_code, suggested_fix, why_it_matters, description

        # 10. Stray semicolon at end of line
        if raw_line.rstrip().endswith(";"):
            suggested_code = raw_line.rstrip()[:-1]
            suggested_fix = "Remove unnecessary trailing semicolon ';'."
            why_it_matters = "Python does not require semicolons at line endings."
            description = f"Trailing semicolon at line {lineno}."
            return suggested_code, suggested_fix, why_it_matters, description

        # 11. Generic fallback: if suggested_code is identical to raw_line, wrap with comment & pass
        suggested_code = f"{indent}# FIXED: {stripped}\n{indent}pass"
        suggested_fix = f"Correct invalid syntax at line {lineno}: {error.msg}"
        why_it_matters = "The Python runtime cannot parse, compile, or execute this script until syntax is resolved."
        description = f"Python parser encountered an invalid syntax structure at line {lineno}: {error.msg}."
        return suggested_code, suggested_fix, why_it_matters, description

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        opts = options or {}
        findings: List[FindingBase] = []

        # 1. Syntax check via ast.parse
        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            err_line = self.get_line_snippet(source_code, e.lineno or 1, context_lines=0)
            suggested_code, suggested_fix, why_it_matters, description = self._diagnose_and_repair_syntax_error(
                source_code, e
            )
            findings.append(FindingBase(
                rule_id="SYN-PY-001",
                category="bug",
                severity="critical",
                title=f"Syntax Error: {e.msg}",
                description=description,
                why_it_matters=why_it_matters,
                start_line=e.lineno or 1,
                end_line=e.lineno or 1,
                source="ast_visitor",
                confidence=1.0,
                suggested_fix=suggested_fix,
                suggested_code=suggested_code,
                original_code=err_line
            ))
            return findings

        # 2. Run AST Visitors
        visitor = PythonASTVisitor(source_code, opts)
        visitor.visit(tree)
        findings.extend(visitor.findings)

        # 3. Line-based checks & Performance Optimization heuristics
        lines = source_code.splitlines()
        in_loop = False
        loop_indent = 0

        for idx, line in enumerate(lines, 1):
            indent_len = len(line) - len(line.lstrip())

            # Detect loop boundaries
            if re.match(r"^\s*(for|while)\b", line):
                in_loop = True
                loop_indent = indent_len
            elif in_loop and line.strip() and indent_len <= loop_indent:
                in_loop = False

            # Check for assert statements in production code
            if opts.get("enable_bugs", True) and re.match(r"^\s*assert\s+", line):
                clean_line = line.strip()
                suggested = line.replace("assert ", "# Validation check:\nif not (") + "):\n    raise ValueError('Assertion check failed')"
                findings.append(FindingBase(
                    rule_id="BUG-PY-004",
                    category="bug",
                    severity="medium",
                    title="Use of 'assert' statement for validation",
                    description="Python optimizes away and removes 'assert' statements when executed with the -O (optimized) flag.",
                    why_it_matters="Critical security or data integrity validations can be completely bypassed in production.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=0.92,
                    suggested_fix="Replace 'assert' with an explicit conditional check that raises ValueError or TypeError.",
                    suggested_code=suggested,
                    original_code=line
                ))

            # PERFORMANCE: String concatenation inside loops (s += item)
            if opts.get("enable_performance", True) and in_loop:
                if re.search(r"\b(\w+)\s*\+=\s*(?:str\(|\w+|['\"])", line):
                    var_match = re.search(r"\b(\w+)\s*\+=", line)
                    var_name = var_match.group(1) if var_match else "result"
                    lead_space = " " * indent_len
                    suggested = f"{lead_space}{var_name}_parts.append(item)  # O(1) append instead of O(N^2) re-allocation"

                    findings.append(FindingBase(
                        rule_id="PERF-PY-002",
                        category="performance",
                        severity="medium",
                        title=f"Optimization: Quadratic memory reallocation via '+=' in loop",
                        description=f"Accumulating strings using '+=' inside a loop creates a new string object and reallocates memory on every iteration, leading to O(N^2) execution time.",
                        why_it_matters="For large loops, this triggers thousands of garbage collection cycles and memory copies.",
                        start_line=idx,
                        end_line=idx,
                        source="static_analyzer",
                        confidence=0.90,
                        suggested_fix=f"Accumulate items into a list using .append() and combine with ''.join({var_name}_parts) after the loop for O(N) linear performance.",
                        suggested_code=suggested,
                        original_code=line
                    ))

            # Resource leak: open() without with
            if opts.get("enable_performance", True) and re.search(r"\b(\w+)\s*=\s*open\s*\(", line) and "with " not in line:
                lead_space = " " * indent_len
                m = re.search(r"\b(\w+)\s*=\s*open\s*\((.*?)\)", line)
                var_name = m.group(1) if m else "f"
                args = m.group(2) if m else "'file.txt'"
                suggested = f"{lead_space}with open({args}) as {var_name}:"

                findings.append(FindingBase(
                    rule_id="PERF-PY-004",
                    category="performance",
                    severity="medium",
                    title="Optimization: File descriptor opened without context manager",
                    description=f"Calling open() directly without 'with open()' can leak OS file descriptors if an unhandled exception occurs before .close().",
                    why_it_matters="Leaked descriptors exhaust operating system file handle limits in high-concurrency servers.",
                    start_line=idx,
                    end_line=idx,
                    source="static_analyzer",
                    confidence=0.95,
                    suggested_fix="Use Python's 'with open(...) as file:' context manager for guaranteed resource reclamation.",
                    suggested_code=suggested,
                    original_code=line
                ))

        return findings
