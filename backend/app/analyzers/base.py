import re
import math
from typing import List, Dict, Any, Optional
from app.schemas.finding import FindingBase

class BaseAnalyzer:
    """Base class for all language analyzers with common metrics and helpers."""

    def __init__(self, language: str):
        self.language = language

    def analyze(self, source_code: str, options: Optional[Dict[str, Any]] = None) -> List[FindingBase]:
        raise NotImplementedError

    def compute_metrics(self, source_code: str) -> Dict[str, Any]:
        """Compute lines of code, comments, complexity, and maintainability index."""
        lines = source_code.splitlines()
        loc = len(lines)
        blank_lines = sum(1 for line in lines if not line.strip())
        
        # Count comment lines based on language style
        comment_lines = 0
        for line in lines:
            stripped = line.strip()
            if self.language in ["python"]:
                if stripped.startswith("#"):
                    comment_lines += 1
            elif self.language in ["javascript", "typescript", "java", "cpp", "c", "csharp", "go", "rust", "php"]:
                if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                    comment_lines += 1

        code_lines = max(1, loc - blank_lines - comment_lines)
        
        # Estimate cyclomatic complexity: count control flow keywords
        complexity_keywords = [
            r"\bif\b", r"\belif\b", r"\belse\s+if\b", r"\bfor\b", r"\bwhile\b",
            r"\bcase\b", r"\bcatch\b", r"\bexcept\b", r"\b&&\b", r"\b\|\|\b", r"\band\b", r"\bor\b"
        ]
        pattern = re.compile("|".join(complexity_keywords))
        matches = len(pattern.findall(source_code))
        cyclomatic_complexity = max(1, 1 + matches)

        # Maintainability Index estimate (0 - 100 scale)
        try:
            vol = max(1.0, float(code_lines) * 5.0)
            mi = 171 - 5.2 * math.log(vol) - 0.23 * cyclomatic_complexity - 16.2 * math.log(max(1.0, float(loc)))
            maintainability_index = round(max(0.0, min(100.0, (mi * 100.0) / 171.0)), 1)
        except Exception:
            maintainability_index = 85.0

        return {
            "loc": loc,
            "code_lines": code_lines,
            "blank_lines": blank_lines,
            "comment_lines": comment_lines,
            "cyclomatic_complexity": cyclomatic_complexity,
            "maintainability_index": maintainability_index,
        }

    def get_line_snippet(self, source_code: str, line_num: int, context_lines: int = 1) -> str:
        """Extract a snippet around a specific line number."""
        lines = source_code.splitlines()
        if not lines or line_num < 1 or line_num > len(lines):
            return ""
        start = max(0, line_num - 1 - context_lines)
        end = min(len(lines), line_num + context_lines)
        return "\n".join(lines[start:end])

    @staticmethod
    def get_original_code(source_code: str, start_line: int, end_line: int) -> str:
        """Extract exact lines between start_line and end_line inclusive."""
        lines = source_code.splitlines()
        if not lines or start_line < 1 or start_line > len(lines):
            return ""
        start_idx = start_line - 1
        end_idx = min(len(lines), max(start_idx + 1, end_line))
        return "\n".join(lines[start_idx:end_idx])

    @staticmethod
    def apply_replacement(source_code: str, start_line: int, end_line: int, replacement_code: str) -> str:
        """Replace lines start_line..end_line with replacement_code, preserving block indentation."""
        lines = source_code.splitlines()
        if not lines or start_line < 1 or start_line > len(lines):
            return source_code

        target_line = lines[start_line - 1]
        indent_match = re.match(r"^(\s*)", target_line)
        base_indent = indent_match.group(1) if indent_match else ""

        # Format replacement lines if not already indented
        rep_lines = replacement_code.splitlines()
        formatted_rep = []
        for i, rline in enumerate(rep_lines):
            # If the replacement line already has indentation, use it, else prepend base_indent
            if i > 0 and rline.startswith(base_indent):
                formatted_rep.append(rline)
            elif not rline.strip():
                formatted_rep.append("")
            else:
                # Add base indentation if line doesn't start with space
                if not rline.startswith(" ") and not rline.startswith("\t"):
                    formatted_rep.append(base_indent + rline)
                else:
                    formatted_rep.append(rline)

        start_idx = start_line - 1
        delete_count = max(1, end_line - start_line + 1)
        lines[start_idx : start_idx + delete_count] = formatted_rep
        return "\n".join(lines)
